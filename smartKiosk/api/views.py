# api/views.py
import json
import smtplib
from email.mime.text import MIMEText

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.db.models import F

from django.contrib.auth.models import User
from accounts.models import UserProfile

from .models import Category, Item, SupplyRequest, ItemPopularity


# ---------------------------------------------------------
# GET /api/items/
# Returns all items grouped by category (display name)
# ---------------------------------------------------------
@require_GET
def get_items(request):
    items = Item.objects.select_related("category").all()

    categories = {}

    for item in items:
        category_name = item.category.name  # e.g. "Storage Closet"

        if category_name not in categories:
            categories[category_name] = []

        categories[category_name].append(
            {
                "id": item.id,
                "name": item.name,
                "image": item.image.url if item.image else "",
                "category_key": item.category.key,
                "category_name": item.category.name,
            }
        )

    return JsonResponse({"ok": True, "categories": categories}, status=200)


# ---------------------------------------------------------
# POST /api/supplies/request/
# Creates a supply request, updates popularity, sends email
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def create_supply_request(request):
    # Try to use authenticated user if available
    user = request.user if request.user.is_authenticated else None

    # Parse incoming JSON
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    # Expect: { items: [itemId, ...], userId?, fullName?, email? }
    item_ids = data.get("items")
    if not item_ids or not isinstance(item_ids, list):
        return JsonResponse(
            {"ok": False, "error": "items must be a list of IDs"}, status=400
        )

    # Load items
    items = list(Item.objects.filter(id__in=item_ids))
    if not items:
        return JsonResponse({"ok": False, "error": "Invalid item IDs"}, status=400)

    item_names = [i.name for i in items]

    # ---------------------------------------------------------
    # Determine requester info (safe for kiosk)
    # ---------------------------------------------------------
    user_id = None
    full_name = ""
    email = ""

    if user and user.is_authenticated:
        # Logged-in user
        user_id = user.id
        email = user.email

        # Try UserProfile full name
        try:
            profile = UserProfile.objects.get(user=user)
            full_name = profile.full_name or user.username
        except UserProfile.DoesNotExist:
            full_name = user.username
    else:
        # Fallback (cookie may not arrive)
        user_id = data.get("userId") or 0  # Must NEVER be null
        full_name = data.get("fullName") or "Unknown User"
        email = data.get("email") or ""

    # ---------------------------------------------------------
    # Save supply request
    # ---------------------------------------------------------
    supply_request = SupplyRequest.objects.create(
        user_id=user_id,
        full_name=full_name,
        email=email,
        items=item_names,
    )

    # ---------------------------------------------------------
    # Update popularity counts (per item, per category)
    # Uses F() for concurrency-safe increments
    # ---------------------------------------------------------
    for item in items:
        pop, created = ItemPopularity.objects.get_or_create(
            item_name=item.name,
            category=item.category.key,
            defaults={"count": 0},
        )
        ItemPopularity.objects.filter(pk=pop.pk).update(count=F("count") + 1)

    # ---------------------------------------------------------
    # Send email notification
    # ---------------------------------------------------------
    subject = f"New Supply Request from {full_name}"
    recipient = "optimistic.prakash@gmail.com"

    body_lines = [
        "A new supply request has been submitted.",
        "",
        f"Requester: {full_name}",
        f"User ID: {user_id}",
        f"Email: {email}",
        "",
        "Items Requested:",
    ]
    body_lines.extend([f"- {name}" for name in item_names])
    body_lines.extend(
        [
            "",
            f"Request ID: {supply_request.id}",
            f"Requested At: {supply_request.requested_at}",
        ]
    )

    msg = MIMEText("\n".join(body_lines))
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_HOST_USER
    msg["To"] = recipient

    email_sent = False
    email_error = None

    try:
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls(context=settings.SMTP_UNVERIFIED_CONTEXT)
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            server.sendmail(settings.EMAIL_HOST_USER, recipient, msg.as_string())
        email_sent = True
    except Exception as e:
        email_error = str(e)

    return JsonResponse(
        {
            "ok": True,
            "requestId": supply_request.id,
            "emailSent": email_sent,
            "emailError": email_error,
        },
        status=201,
    )


# ---------------------------------------------------------
# GET /api/supplies/popular/?limit=3
#
# Professional format:
# {
#   "ok": true,
#   "popular": {
#       "Storage Closet": [
#           { "name": "Kleenex", "count": 12 },
#           { "name": "Paper Towels", "count": 9 },
#           ...
#       ],
#       "Break Room": [
#           { "name": "Snacks", "count": 7 },
#           ...
#       ]
#   }
# }
#
# - Grouped by CATEGORY DISPLAY NAME
# - Each list sorted by count DESC
# - "limit" applies per category (top N per category)
# ---------------------------------------------------------
@require_GET
def get_popular_items(request):
    # Per-category limit (top N)
    try:
        per_category_limit = int(request.GET.get("limit", "3"))
        if per_category_limit <= 0:
            per_category_limit = None  # no limit
    except ValueError:
        per_category_limit = 3

    # Load all popularity rows
    popularity_qs = ItemPopularity.objects.all()

    # Group popularity by category key
    # { "closet": [ {"name": ..., "count": ...}, ... ], ... }
    popular_by_key = {}
    for p in popularity_qs:
        popular_by_key.setdefault(p.category, []).append(
            {"name": p.item_name, "count": p.count}
        )

    if not popular_by_key:
        return JsonResponse({"ok": True, "popular": {}}, status=200)

    # Map category key -> display name using Category model
    keys = list(popular_by_key.keys())
    categories = Category.objects.filter(key__in=keys)
    key_to_display = {c.key: c.name for c in categories}

    # Build final structure grouped by DISPLAY NAME
    popular_by_display = {}
    for key, items in popular_by_key.items():
        # Sort items within category by count DESC
        items_sorted = sorted(items, key=lambda x: x["count"], reverse=True)
        if per_category_limit is not None:
            items_sorted = items_sorted[:per_category_limit]

        display_name = key_to_display.get(key, key)  # fallback to key if missing
        popular_by_display[display_name] = items_sorted

    return JsonResponse({"ok": True, "popular": popular_by_display}, status=200)
