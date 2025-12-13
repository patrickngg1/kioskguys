import json
import re
import smtplib
import os
import requests
from base64 import b64encode
from accounts.models import UserCard

from email.mime.text import MIMEText
from base64 import b64encode

from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.db.models import F, Q
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from api.utils.email_templates import render_reservation_email
from api.utils.email_templates import render_supply_request_email
from api.utils.email_templates import render_cancellation_email
from api.utils.calendar_utils import build_calendar_links
from api.utils.email_templates import render_password_reset_email
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth import update_session_auth_hash
from accounts.models import UserProfile
from django.utils.dateparse import parse_date

from .models import (
    Category,
    Item,
    SupplyRequest,
    ItemPopularity,
    Room,
    RoomReservation,
    PasswordResetCode,
    BannerImage,
)
from datetime import datetime, timedelta, time
from django.utils import timezone
import random

def auto_update_banner_state():
    """
    Ensure scheduled banners obey their date ranges.
    - If a banner has start_date/end_date and 'today' is in that range,
      it becomes the one active banner.
    - If no schedule matches today, scheduled banners that are out of range
      get deactivated, but manually activated non-scheduled banners are left alone.
    """
    today = timezone.localdate()

    # Banners that have a full schedule
    scheduled_qs = BannerImage.objects.filter(
        start_date__isnull=False,
        end_date__isnull=False,
    )

    # Pick the newest scheduled banner that is valid today
    active_candidate = (
        scheduled_qs
        .filter(start_date__lte=today, end_date__gte=today)
        .order_by('-created_at')
        .first()
    )

    if active_candidate:
        # Make this one the only active banner
        BannerImage.objects.update(is_active=False)
        active_candidate.is_active = True
        active_candidate.save()
    else:
        # No schedule is valid today → make sure scheduled ones are not active
        for b in scheduled_qs.filter(is_active=True):
            if not (b.start_date <= today <= b.end_date):
                b.is_active = False
                b.save()

# ---------------------------
#  LIST ALL BANNERS (ADMIN)
# ---------------------------
def list_banners(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin required"}, status=403)

    # Make sure scheduled banners are in the correct state before we return them
    auto_update_banner_state()

    banners = []
    for b in BannerImage.objects.all():
        banners.append({
            "id": b.id,
            "image_url": request.build_absolute_uri(b.image.url),
            "label": b.label,
            "is_active": b.is_active,
            "start_date": b.start_date.isoformat() if b.start_date else None,
            "end_date": b.end_date.isoformat() if b.end_date else None,
        })

    return JsonResponse({"ok": True, "banners": banners}, status=200)


# ---------------------------
#  UPLOAD BANNER (ADMIN)
# ---------------------------
@csrf_exempt
@require_POST
def upload_banner(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin required"}, status=403)

    file = request.FILES.get("file")
    if not file:
        return JsonResponse({"ok": False, "error": "No file uploaded"}, status=400)

    label = request.POST.get("label", "")

    banner = BannerImage.objects.create(
        image=file,
        label=label,
        start_date=None,
        end_date=None,
    )

    return JsonResponse({
        "ok": True,
        "banner": {
            "id": banner.id,
            "image_url": request.build_absolute_uri(banner.image.url),
            "label": banner.label,
            "is_active": banner.is_active,
            "start_date": None,
            "end_date": None,
        },
    }, status=201)


@csrf_exempt
@require_POST
def schedule_banner(request, banner_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin required"}, status=403)

    try:
        banner = BannerImage.objects.get(id=banner_id)
    except BannerImage.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Not found"}, status=404)

    start = request.POST.get("start_date")
    end = request.POST.get("end_date")

    from django.utils.dateparse import parse_date
    banner.start_date = parse_date(start) if start else None
    banner.end_date = parse_date(end) if end else None
    banner.save()

    auto_update_banner_state()

    return JsonResponse({
        "ok": True,
        "banner": {
            "id": banner.id,
            "start_date": banner.start_date.isoformat() if banner.start_date else None,
            "end_date": banner.end_date.isoformat() if banner.end_date else None,
            "is_active": banner.is_active,
        }
    })

# ---------------------------
#  ACTIVATE BANNER (ADMIN)
# ---------------------------
# ---------------------------
#  ACTIVATE BANNER (ADMIN)
# ---------------------------
@csrf_exempt
@require_POST
def activate_banner(request, banner_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin required"}, status=403)

    try:
        banner = BannerImage.objects.get(id=banner_id)
    except BannerImage.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Not found"}, status=404)

    # 1. Turn off everything else
    BannerImage.objects.update(is_active=False)

    # 2. Activate this banner
    banner.is_active = True

    # 3. CRITICAL FIX: Clear the schedule dates.
    # This prevents the auto-scheduler from immediately turning it off 
    # if the dates are in the past/future.
    # It effectively converts this to a "Manual / Always On" banner.
    banner.start_date = None
    banner.end_date = None
    banner.save()

    return JsonResponse({"ok": True}, status=200)


# ---------------------------
#  DEACTIVATE ALL (ADMIN)
# ---------------------------
@csrf_exempt
@require_POST
def deactivate_active_banner(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin required"}, status=403)

    # 1. Find currently active banners
    active_banners = BannerImage.objects.filter(is_active=True)

    # 2. Clear their schedules too, so they don't auto-reactivate immediately
    for b in active_banners:
        b.start_date = None
        b.end_date = None
        b.is_active = False
        b.save()

    # Fallback to ensure everything is off
    BannerImage.objects.update(is_active=False)

    return JsonResponse({"ok": True})


# ---------------------------
#  DELETE BANNER (ADMIN)
# ---------------------------
@csrf_exempt
@require_POST
def delete_banner(request, banner_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin required"}, status=403)

    try:
        banner = BannerImage.objects.get(id=banner_id)
    except BannerImage.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Not found"}, status=404)

    # Delete file
    if banner.image and os.path.isfile(banner.image.path):
        os.remove(banner.image.path)

    banner.delete()
    return JsonResponse({"ok": True}, status=200)


# ---------------------------
#  GET ACTIVE BANNER (KIOSK)
# ---------------------------
@require_GET
def get_active_banner(request):
    auto_update_banner_state()

    banner = BannerImage.objects.filter(is_active=True).first()

    if not banner:
        return JsonResponse({"ok": True, "banner": None})

    return JsonResponse({
        "ok": True,
        "banner": {
            "id": banner.id,
            "image_url": request.build_absolute_uri(banner.image.url),
            "label": banner.label,
        },
    })


# ============================================================
# GET /api/users/
# List all users (TiDB-backed via UserProfile)
# ============================================================
@require_GET
def get_all_users(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin required"}, status=403)

    users = []

    for u in User.objects.all().order_by('id'):
        try:
            profile = UserProfile.objects.get(user=u)
            full_name = profile.full_name
        except UserProfile.DoesNotExist:
            full_name = (u.first_name + " " + u.last_name).strip() or u.username

        users.append({
            "id": u.id,
            "email": u.email,
            "fullName": full_name,
            "isAdmin": u.is_staff,
        })

    return JsonResponse({"ok": True, "users": users}, status=200)


# ============================================================
# POST /api/users/<id>/toggle-admin/
# Promote/demote user to/from admin
# ============================================================
@csrf_exempt
@require_POST
def toggle_admin(request, user_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin required"}, status=403)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"ok": False, "error": "User not found"}, status=404)

    user.is_staff = not user.is_staff
    user.save()

    return JsonResponse({"ok": True, "isAdmin": user.is_staff}, status=200)


# ============================================================
# POST /api/users/<id>/delete/
# Delete user + profile
# ============================================================
@csrf_exempt
@require_POST
def delete_user(request, user_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin required"}, status=403)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"ok": False, "error": "User not found"}, status=404)

    # Delete profile if exists
    UserProfile.objects.filter(user=user).delete()

    # Delete user
    user.delete()

    return JsonResponse({"ok": True}, status=200)

# ---------------------------------------------------------
# SEND EMAIL VIA SENDGRID (HTML + optional ICS attachment)
# ---------------------------------------------------------
def send_via_sendgrid(
    to_email,
    subject,
    html_content,
    *,
    from_email=None,
    from_name="UTA Smart Kiosk",
    ics_content=None,
):
    api_key = getattr(settings, "SENDGRID_API_KEY", None)
    if not api_key:
        raise Exception("SENDGRID_API_KEY missing in settings.py")

    verified_sender = getattr(settings, "SENDGRID_VERIFIED_SENDER", None)
    if not verified_sender:
        raise Exception("SENDGRID_VERIFIED_SENDER missing in settings.py")

    if not from_email:
        from_email = verified_sender

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": from_email, "name": from_name},
        "subject": subject,
        "content": [{"type": "text/html", "value": html_content}],
    }

    if ics_content:
        payload["attachments"] = [
            {
                "content": b64encode(ics_content).decode("utf-8"),
                "type": "text/calendar",
                "filename": "rreservation.ics",
                "disposition": "attachment",
            }
        ]

    res = requests.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )

    if res.status_code >= 400:
        raise Exception(f"SendGrid error {res.status_code}: {res.text}")

    return True

# ---------------------------------------------------------
# POST /api/register/
# Create a new Django User + UserProfile (TiDB-backed)
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def register_user(request):
    try:
        data = json.loads(request.body.decode("utf-8"))

        email = data.get("email", "").lower().strip()
        password = data.get("password", "")
        full_name = data.get("fullName", "").strip()

    except Exception:
        return JsonResponse(
            {"ok": False, "error": "Invalid JSON or missing fields"},
            status=400
        )

    # Validate required fields
    if not email or not password or not full_name:
        return JsonResponse(
            {"ok": False, "error": "All fields are required"},
            status=400
        )

    # Check for existing email
    if User.objects.filter(email=email).exists():
        return JsonResponse(
            {"ok": False, "error": "This email is already registered"},
            status=409
        )

    try:
        # Create Django user using email as username
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password
        )

        # ---------------------------------------------------------
        # SAVE first_name + last_name properly into Django's User model
        # ---------------------------------------------------------
        parts = full_name.split()
        first = parts[0]
        last = " ".join(parts[1:]) if len(parts) > 1 else ""

        user.first_name = first
        user.last_name = last
        user.save()

        # ---------------------------------------------------------
        # Create UserProfile and store full_name there too
        # ---------------------------------------------------------
        profile = UserProfile.objects.get(user=user)
        profile.full_name = full_name
        profile.must_set_password = False  # New users do NOT need forced reset
        profile.save()

        # ---------------------------------------------------------
        # OPTIONAL: Save card swipe if provided
        # ---------------------------------------------------------
        uta_id = data.get("utaId")
        if uta_id:
            card_obj, _ = UserCard.objects.get_or_create(user=user)
            card_obj.uta_id = uta_id
            card_obj.save()

    except Exception as e:
        print("Registration error:", e)
        return JsonResponse(
            {"ok": False, "error": "Registration failed due to server error"},
            status=500
        )

    return JsonResponse(
        {"ok": True, "message": "Account created successfully"},
        status=201
    )



# ---------------------------------------------------------
# GET /api/items/
# Returns all items grouped by category (display name)
# Uses Django Media image URLs from Item.image
# ---------------------------------------------------------
@require_GET
def get_items(request):
    items = Item.objects.select_related("category").all()

    categories = {}

    for item in items:
        category_name = item.category.name  # e.g. "Storage Closet"

        # If an image was uploaded in Django admin, build an absolute URL
        if item.image:
            image_url = request.build_absolute_uri(item.image.url)
        else:
            image_url = None  # frontend can show a placeholder if it wants

        if category_name not in categories:
            categories[category_name] = []

        categories[category_name].append(
            {
                "id": item.id,
                "name": item.name,
                "image": image_url,  # media URL or null
                "category_key": item.category.key,
                "category_name": item.category.name,
            }
        )

    return JsonResponse({"ok": True, "categories": categories}, status=200)


# ---------------------------------------------------------
# POST /api/items/<item_id>/upload-image/
# Optional: Admin/API image upload using Django ImageField
# Expects multipart/form-data with "file" field
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def upload_item_image(request, item_id):
    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Item not found"}, status=404)

    file = request.FILES.get("file")
    if not file:
        return JsonResponse({"ok": False, "error": "No file uploaded"}, status=400)

    # Directly assign the uploaded file to the ImageField
    item.image = file
    item.save()

    # Return the new image URL so frontend can refresh
    image_url = request.build_absolute_uri(item.image.url)

    return JsonResponse(
        {"ok": True, "message": "Image uploaded successfully", "image": image_url},
        status=200,
    )


# ---------------------------------------------------------
# POST /api/items/save/
# Create or update an item (name + category)
# Body: { id?, name, category_key?, new_category_name? }
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def admin_save_item(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    item_id = data.get("id")
    name = (data.get("name") or "").strip()
    category_key = (data.get("category_key") or "").strip()
    new_category_name = (data.get("new_category_name") or "").strip()

    if not name:
        return JsonResponse({"ok": False, "error": "Name is required"}, status=400)

    category = None

    # Existing category by key
    if category_key and category_key != "__new__":
        try:
            category = Category.objects.get(key=category_key)
        except Category.DoesNotExist:
            return JsonResponse(
                {"ok": False, "error": "Category not found"}, status=404
            )

    # Create a new category if requested
    if not category and new_category_name:
        # simple slug-ish key
        key = (
            new_category_name.lower()
            .replace(" ", "_")
            .replace("/", "_")
            .replace("&", "and")
        )
        category, _ = Category.objects.get_or_create(
            key=key,
            defaults={"name": new_category_name},
        )

    if not category:
        return JsonResponse(
            {"ok": False, "error": "Category is required"}, status=400
        )

    # Create or update the item
    if item_id:
        try:
            item = Item.objects.get(id=item_id)
        except Item.DoesNotExist:
            return JsonResponse({"ok": False, "error": "Item not found"}, status=404)
        item.name = name
        item.category = category
        item.save()
        status_code = 200
    else:
        item = Item.objects.create(name=name, category=category)
        status_code = 201

    image_url = request.build_absolute_uri(item.image.url) if item.image else None

    return JsonResponse(
        {
            "ok": True,
            "item": {
                "id": item.id,
                "name": item.name,
                "image": image_url,
                "category_key": item.category.key,
                "category_name": item.category.name,
            },
        },
        status=status_code,
    )


# ---------------------------------------------------------
# POST /api/items/<item_id>/delete/
# Soft/simple delete for admin
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def admin_delete_item(request, item_id):
    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Item not found"}, status=404)

    item.delete()
    return JsonResponse({"ok": True, "message": "Item deleted"})



# ---------------------------------------------------------
# POST /api/supplies/request/
# Creates a supply request, updates popularity, sends email (PREMIUM)
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
    # Send PREMIUM email notification via SendGrid (FINAL)
    # ---------------------------------------------------------
    email_sent = False
    email_error = None

    try:
        from api.utils.email_templates import render_supply_request_email

        # GitHub-hosted logo (Outlook/Gmail safe)
        logo_url = (
            "https://raw.githubusercontent.com/patrickngg1/kioskguys/main/"
            "smartKiosk/media/ui_assets/apple-touch-icon.png"
        )

        # Build premium HTML
        html_body = render_supply_request_email(
            full_name=full_name,
            email=email,
            items=item_names,
            request_id=supply_request.id,
            timestamp=supply_request.requested_at,
            logo_url=logo_url,
        )

        subject = f"📦 New Supply Request — {full_name}"
        recipient = "prakash.sapkota@mavs.uta.edu"  # whoever brings supplies

        send_via_sendgrid(
            to_email=recipient,
            subject=subject,
            html_content=html_body,
        )

        email_sent = True

    except Exception as e:
        email_error = str(e)
        email_sent = False

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
# Grouped by category display name
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

# ---------------------------------------------------------
# GET /api/items/all/
# Flat list for Admin Panel (future-proof)
# ---------------------------------------------------------
@require_GET
def get_all_items(request):
    items = Item.objects.select_related("category").all().order_by("name")

    data = []
    for item in items:
        if item.image:
            image_url = request.build_absolute_uri(item.image.url)
        else:
            image_url = None

        data.append({
            "id": item.id,
            "name": item.name,
            "image": image_url,
            "category_key": item.category.key,
            "category_name": item.category.name,
        })

    return JsonResponse({"ok": True, "items": data}, status=200)


# ---------------------------------------------------------
# GET /api/rooms/
# Returns all rooms with capacity + features
# ---------------------------------------------------------

# ---------------------------------------------------------
# GET /api/rooms/
# Returns all rooms with dynamic features list
# ---------------------------------------------------------
@require_GET
def get_rooms(request):
    rooms = Room.objects.all().order_by("name")
    data = []
    for r in rooms:
        # Auto-migrate legacy flags if features list is empty
        current_features = r.features or []
        if not current_features:
            if r.has_screen: current_features.append("Screen")
            if r.has_hdmi: current_features.append("HDMI")
        
        data.append({
            "id": r.id,
            "name": r.name,
            "capacity": r.capacity,
            "features": current_features, # ✅ Dynamic list
        })
    return JsonResponse({"ok": True, "rooms": data}, status=200)

@csrf_exempt
@require_POST
def create_room(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin privileges required"}, status=403)

    try:
        data = json.loads(request.body.decode("utf-8"))
        features_list = data.get("features", [])
        
        room = Room.objects.create(
            name=data.get("name", "").strip(),
            capacity=int(data.get("capacity", 8)),
            features=features_list,
            # Sync legacy just in case
            has_screen="Screen" in features_list,
            has_hdmi="HDMI" in features_list
        )
        return JsonResponse({"ok": True, "room": {
            "id": room.id, "name": room.name, "capacity": room.capacity, "features": room.features
        }}, status=201)
    except Exception as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=400)

@csrf_exempt
@require_POST
def update_room(request, room_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin privileges required"}, status=403)

    try:
        room = Room.objects.get(id=room_id)
        data = json.loads(request.body.decode("utf-8"))

        if "name" in data: room.name = data["name"].strip()
        if "capacity" in data: room.capacity = int(data["capacity"])
        if "features" in data:
            room.features = data["features"]
            room.has_screen = "Screen" in room.features
            room.has_hdmi = "HDMI" in room.features

        room.save()
        return JsonResponse({"ok": True, "room": {
            "id": room.id, "name": room.name, "capacity": room.capacity, "features": room.features
        }}, status=200)
    except Room.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Room not found"}, status=404)
    except Exception as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=400)

@csrf_exempt
@require_POST
def delete_room(request, room_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin privileges required"}, status=403)

    try:
        room = Room.objects.get(id=room_id)
    except Room.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Room not found"}, status=404)

    # Prevent deletion if room has future reservations
    today = timezone.localdate()
    future_reservations = RoomReservation.objects.filter(
        room=room,
        date__gte=today,
        cancelled=False
    ).exists()

    if future_reservations:
        return JsonResponse(
            {"ok": False, "error": "Cannot delete: room has upcoming reservations"},
            status=409,
        )

    room.delete()

    return JsonResponse({"ok": True, "message": "Room deleted"}, status=200)


# ---------------------------------------------------------
# Helpers for calendar link and emails (legacy)
# ---------------------------------------------------------
def build_calendar_link(reservation):
    """
    Generate a Google Calendar link using zoneinfo-safe datetimes.
    (Kept for backward compatibility; no longer used by premium email.)
    """
    from datetime import datetime, timezone as dt_timezone
    from urllib.parse import quote

    # Combine date + start/end time into naive datetimes
    date = reservation.date
    naive_start = datetime.combine(date, reservation.start_time)
    naive_end = datetime.combine(date, reservation.end_time)

    # Get ZoneInfo timezone (Django 5)
    tz = timezone.get_current_timezone()

    # Make the datetimes aware using Django's helper
    aware_start = timezone.make_aware(naive_start, tz)
    aware_end = timezone.make_aware(naive_end, tz)

    # Convert to REAL UTC (zoneinfo)
    start_utc = aware_start.astimezone(dt_timezone.utc)
    end_utc = aware_end.astimezone(dt_timezone.utc)

    start_str = start_utc.strftime("%Y%m%dT%H%M%SZ")
    end_str = end_utc.strftime("%Y%m%dT%H%M%SZ")

    params = {
        "action": "TEMPLATE",
        "text": f"Conference Room: {reservation.room.name}",
        "dates": f"{start_str}/{end_str}",
        "details": "UTA Smart Kiosk Reservation",
        "location": reservation.room.name,
    }

    query = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
    return f"https://www.google.com/calendar/render?{query}"


def send_reservation_email(reservation, calendar_link):
    """
    Legacy plain-text email sender (kept for compatibility).
    Now TLS-safe for SendGrid (no unverified context required).
    """
    subject = f"Reservation Confirmed – {reservation.room.name}"
    body = f"""
Your conference room reservation is confirmed.

Room: {reservation.room.name}
Capacity: {reservation.room.capacity}
Screen: {"Yes" if reservation.room.has_screen else "No"}
HDMI: {"Yes" if reservation.room.has_hdmi else "No"}

Date: {reservation.date}
Time: {reservation.start_time.strftime('%I:%M %p')} - {reservation.end_time.strftime('%I:%M %p')}

Reserved For: {reservation.full_name}
Email: {reservation.email}

Add to your calendar:
{calendar_link}
"""

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_HOST_USER
    msg["To"] = reservation.email

    try:
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            # use context only if it exists (dev-friendly), otherwise normal TLS
            ctx = getattr(settings, "SMTP_UNVERIFIED_CONTEXT", None)
            if ctx:
                server.starttls(context=ctx)
            else:
                server.starttls()
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            server.sendmail(
                settings.EMAIL_HOST_USER, [reservation.email], msg.as_string()
            )
        return True, None
    except Exception as e:
        return False, str(e)

# ---------------------------------------------------------
# POST /api/rooms/reserve/
# Create a reservation (requires login)
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def create_room_reservation(request):
    # 🔐 Ensure user is logged in
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "error": "Login required"}, status=401)

    # Parse JSON body
    try:
        body = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    room_id = body.get("roomId")
    date_str = body.get("date")        # "YYYY-MM-DD"
    start_str = body.get("startTime")  # "HH:MM"
    end_str = body.get("endTime")      # "HH:MM"

    if not all([room_id, date_str, start_str, end_str]):
        return JsonResponse(
            {"ok": False, "error": "Missing required fields."},
            status=400,
        )

    # Load room
    try:
        room = Room.objects.get(id=room_id)
    except Room.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Room not found"}, status=404)

    # Convert date
    try:
        base_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"ok": False, "error": "Invalid date format"}, status=400)

    # Convert times
    try:
        start_t = datetime.strptime(start_str, "%H:%M").time()
        end_t = datetime.strptime(end_str, "%H:%M").time()
    except ValueError:
        return JsonResponse({"ok": False, "error": "Invalid time format"}, status=400)

    # ------------------------------------------------------
    # 🔥 Convert into full datetime objects
    # ------------------------------------------------------
    start_dt = datetime.combine(base_date, start_t)
    end_dt = datetime.combine(base_date, end_t)

    # Overnight support (e.g., 11 PM → 2 AM)
    if end_dt <= start_dt:
        end_dt += timedelta(days=1)

    # ------------------------------------------------------
    # 🔥 True conflict detection (cross-midnight safe)
    # A_start < B_end AND A_end > B_start
    # ------------------------------------------------------
    existing = RoomReservation.objects.filter(
        room=room,
        cancelled=False
    )

    for r in existing:
        r_start = datetime.combine(r.date, r.start_time)
        r_end = datetime.combine(r.date, r.end_time)

        # Fix old overnight reservations in DB
        if r_end <= r_start:
            r_end += timedelta(days=1)

        # Overlap rule:
        # if NEW.start < EXISTING.end AND NEW.end > EXISTING.start → conflict
        if start_dt < r_end and end_dt > r_start:
            return JsonResponse(
                {"ok": False,
                 "error": "This room is already reserved during this time."},
                status=409,
            )

    # ------------------------------------------------------
    # Build full_name (from profile)
    # ------------------------------------------------------
    user = request.user
    email = user.email

    try:
        profile = UserProfile.objects.get(user=user)
        full_name = profile.full_name or user.get_full_name() or user.username
    except UserProfile.DoesNotExist:
        full_name = user.get_full_name() or user.username or email

    # ------------------------------------------------------
    # SAVE reservation
    # Make sure stored date/time is correct for overnight
    # ------------------------------------------------------
    reservation = RoomReservation.objects.create(
        user=user,
        room=room,
        date=start_dt.date(),        # if overnight, moves into next day
        start_time=start_dt.time(),
        end_time=end_dt.time(),
        full_name=full_name,
        email=email,
    )

    # ------------------------------------------------------
    # Send email confirmation (does not block reservation)
    # ------------------------------------------------------
    try:
        email_reservation_confirmation(reservation)
    except Exception as e:
        print("Email error:", e)

    # ------------------------------------------------------
    # Return success response
    # ------------------------------------------------------
    return JsonResponse({
        "ok": True,
        "reservation": {
            "id": reservation.id,
            "roomId": reservation.room.id,
            "roomName": reservation.room.name,
            "capacity": reservation.room.capacity,
            "hasScreen": reservation.room.has_screen,
            "hasHdmi": reservation.room.has_hdmi,
            "date": reservation.date.strftime("%Y-%m-%d"),
            "startTime": reservation.start_time.strftime("%H:%M"),
            "endTime": reservation.end_time.strftime("%H:%M"),
            "cancelled": reservation.cancelled,
            "cancelReason": reservation.cancel_reason or "",
        }
    })



        # ---------------------------------------------------------
        # PREMIUM CALENDAR EMAIL (UTA + Apple Vision Glass Style)
        # ---------------------------------------------------------
    email_sent = False
    email_error = None
    calendar_link = None
    html_body = None  # avoid NameError

    try:
        from api.utils.calendar_utils import create_ics_content, build_calendar_links
        from api.utils.email_templates import render_reservation_email

        tz = timezone.get_current_timezone()

        start_naive = datetime.combine(date_value, start_value)
        end_naive = datetime.combine(date_value, end_value)

        start_dt = timezone.make_aware(start_naive, tz)
        end_dt = timezone.make_aware(end_naive, tz)

        # ICS bytes
        ics_data = create_ics_content(
            room_name=room.name,
            start_dt=start_dt,
            end_dt=end_dt,
            reservation_id=reservation.id,
            user_email=email,
        )

        backend_base = request.build_absolute_uri("/").rstrip("/")
        frontend_base = backend_base

        logo_url = "https://raw.githubusercontent.com/patrickngg1/kioskguys/main/smartKiosk/media/ui_assets/apple-touch-icon.png"


        calendar_links = build_calendar_links(
            room_name=room.name,
            start_dt=start_dt,
            end_dt=end_dt,
            details_url=f"{frontend_base}/dashboard",
        )

        # -------------------------------
        # Build full premium HTML body
        # -------------------------------
        html_body = render_reservation_email(
            request.user,
            reservation,
            calendar_links,
            logo_url
        )


        send_via_sendgrid(
            to_email=email,
            subject=f"✅ Reservation Confirmed — {room.name}",
            html_content=html_body,
            ics_content=ics_data,   # attach ICS
        )

        email_sent = True
        calendar_link = calendar_links.get("google")

    except Exception as e:
        email_error = str(e)
        email_sent = False


    return JsonResponse(
        {
            "ok": True,
            "reservation": {
                "id": reservation.id,
                "roomId": room.id,
                "roomName": room.name,
                "capacity": room.capacity,
                "hasScreen": room.has_screen,
                "hasHdmi": room.has_hdmi,
                "date": str(reservation.date),
                "startTime": reservation.start_time.strftime("%H:%M"),
                "endTime": reservation.end_time.strftime("%H:%M"),
                "cancelled": reservation.cancelled,
            },
            "emailSent": email_sent,
            "emailError": email_error,
            "calendarLink": calendar_link,
        },
        status=201,
    )

# ---------------------------------------------------------
# GET /api/rooms/reservations/my/
# List future reservations for the logged-in user
# ---------------------------------------------------------
@require_GET
def my_room_reservations(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "error": "Login required"}, status=401)

    # Use local date consistently
    today = timezone.localdate()

    qs = (
        RoomReservation.objects.filter(
            user=request.user,
            cancelled=False,
            date__gte=today,
        )
        .select_related("room")
        .order_by("date", "start_time")
    )

    data = []
    for r in qs:
        # Get full name from UserProfile (correct source)
        try:
            profile = UserProfile.objects.get(user=r.user)
            full_name = profile.full_name
        except UserProfile.DoesNotExist:
            # fallback: Django's first_name + last_name OR username
            full_name = (r.user.first_name + " " + r.user.last_name).strip() or r.user.username

        data.append({
            "id": r.id,
            "roomId": r.room.id,
            "roomName": r.room.name,
            "capacity": r.room.capacity,
            "hasScreen": r.room.has_screen,
            "hasHdmi": r.room.has_hdmi,
            "date": str(r.date),
            "startTime": r.start_time.strftime("%H:%M"),
            "endTime": r.end_time.strftime("%H:%M"),
            "cancelled": r.cancelled,
            "cancelReason": r.cancel_reason or "",
            "fullName": full_name,     # <-- fixed
            "email": r.user.email,
            "userId": r.user.id,
        })

    return JsonResponse({"ok": True, "reservations": data}, status=200)

@require_GET
def reservations_by_date(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "error": "Login required"}, status=401)

    # --------------------------------------------
    # Parse date
    # --------------------------------------------
    date_str = request.GET.get("date")
    if not date_str:
        return JsonResponse(
            {"ok": False, "error": "Missing date query param (YYYY-MM-DD)"},
            status=400,
        )

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse(
            {"ok": False, "error": "Invalid date format (YYYY-MM-DD)"},
            status=400,
        )

    # Start-of-day reference for spillover logic
    start_of_day = datetime.combine(target_date, time(0, 0))

    # --------------------------------------------
    # Query reservations for:
    # 1) Same-day reservations
    # 2) Overnight reservations that STARTED previous day
    #    (end_time <= start_time means it spills past midnight)
    # --------------------------------------------
    qs = (
        RoomReservation.objects
        .filter(cancelled=False)
        .filter(
            Q(date=target_date) |
            Q(
                date=target_date - timedelta(days=1),
                end_time__lte=F('start_time')   # Overnight reservation
            )
        )
        .select_related("room")
        .order_by("room__name", "start_time")
    )

    # --------------------------------------------
    # Serialize output
    # --------------------------------------------
    data = [
        {
            "id": r.id,
            "roomId": r.room.id,
            "roomName": r.room.name,
            "startTime": r.start_time.strftime("%H:%M"),
            "endTime": r.end_time.strftime("%H:%M"),
            "date": r.date.strftime("%Y-%m-%d"),
        }
        for r in qs
    ]

    return JsonResponse({"ok": True, "reservations": data}, status=200)

# ---------------------------------------------------------
# POST /api/rooms/reservations/<id>/cancel/
# Cancel a reservation
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def cancel_room_reservation(request, reservation_id):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "error": "Login required"}, status=401)

    try:
        request.read()
    except Exception:
        pass

    try:
        reservation = RoomReservation.objects.get(id=reservation_id)

        if reservation.cancelled:
            return JsonResponse(
                {"ok": False, "error": "Reservation already canceled"},
                status=400,
            )

        if reservation.user != request.user:
            return JsonResponse(
                {"ok": False, "error": "Not allowed"},
                status=403,
            )

        reservation.cancelled = True
        reservation.cancel_reason = "User cancelled"
        reservation.save()
        send_cancellation_email(reservation,
            reason="Reservation cancelled by user.",
            cancelled_by=reservation.user.username
            )

        return JsonResponse({"ok": True})

    except RoomReservation.DoesNotExist:
        return JsonResponse(
            {"ok": False, "error": "Reservation not found"},
            status=404,
        )
    except Exception as e:
        print("Cancel error:", e)
        return JsonResponse({"ok": False, "error": "Server error"}, status=500)


# ---------------------------------------------------------
# POST /api/rooms/reservations/cancel-bulk/
# Cancel multiple reservations in ONE request + send ONE email
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def cancel_room_reservations_bulk(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "error": "Login required"}, status=401)

    try:
        data = json.loads(request.body.decode("utf-8"))
        ids = data.get("ids", [])
        reason = data.get("reason", "User cancelled multiple reservations.")
    except:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    if not isinstance(ids, list) or len(ids) == 0:
        return JsonResponse({"ok": False, "error": "ids must be a non-empty list"}, status=400)

    # Fetch all reservations
    reservations = list(
        RoomReservation.objects.filter(
            id__in=ids,
            user=request.user,
            cancelled=False
        ).select_related("room")
    )

    if len(reservations) == 0:
        return JsonResponse({"ok": False, "error": "No valid reservations found"}, status=404)

    # Mark all as cancelled
    for r in reservations:
        r.cancelled = True
        r.cancel_reason = reason
        r.save()

    # ---------- Send ONE premium bulk email ----------
    try:
        from api.utils.email_templates import render_bulk_cancellation_email

        logo_url = (
            "https://raw.githubusercontent.com/patrickngg1/kioskguys/main/"
            "smartKiosk/media/ui_assets/apple-touch-icon.png"
        )

        html = render_bulk_cancellation_email(
            reservations=reservations,
            logo_url=logo_url,
            cancelled_by=request.user.username,
            reason=reason,
        )

        send_via_sendgrid(
            to_email=request.user.email,
            subject=f"⚠️ {len(reservations)} Reservation(s) Cancelled",
            html_content=html,
        )

    except Exception as e:
        print("Bulk cancellation email error:", e)

    return JsonResponse(
        {"ok": True, "cancelledCount": len(reservations)},
        status=200
    )


# ---------------------------------------------------------
# POST /api/rooms/reservations/<id>/admin-cancel/
# Admin cancels ANY reservation + sends PREMIUM cancellation email
# ---------------------------------------------------------
# ---------------------------------------------------------
# GET /api/rooms/reservations/all/
# Admin view — list ALL upcoming reservations with real names
# ---------------------------------------------------------
@require_GET
@require_GET
def all_room_reservations(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"ok": False, "error": "Admin privileges required"}, status=403)

    # Get ALL reservations (no date filter)
    qs = (
        RoomReservation.objects
        .filter(cancelled=False)
        .select_related("room")
        .order_by("date", "start_time")
    )

    reservations = []
    for r in qs:
        # get full name safely
        try:
            profile = UserProfile.objects.get(user=r.user)
            full_name = profile.full_name
        except UserProfile.DoesNotExist:
            full_name = (f"{r.user.first_name} {r.user.last_name}").strip()
            if not full_name:
                full_name = r.user.username

        reservations.append({
            "id": r.id,
            "roomId": r.room_id,
            "roomName": r.room.name,
            "capacity": r.room.capacity,
            "hasScreen": r.room.has_screen,
            "hasHdmi": r.room.has_hdmi,
            "date": r.date.strftime("%Y-%m-%d"),
            "startTime": r.start_time.strftime("%H:%M"),
            "endTime": r.end_time.strftime("%H:%M"),
            "cancelled": r.cancelled,
            "fullName": full_name,
            "email": r.user.email,   # ← NEW IMPORTANT LINE
        })


    return JsonResponse({"ok": True, "reservations": reservations})



@csrf_exempt
@require_POST
def admin_cancel_reservation(request, reservation_id):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse(
            {"ok": False, "error": "Admin privileges required"},
            status=403,
        )

    try:
        reservation = RoomReservation.objects.get(id=reservation_id)

        if reservation.cancelled:
            return JsonResponse(
                {"ok": False, "error": "Reservation already cancelled"},
                status=400,
            )

        data = json.loads(request.body.decode("utf-8"))
        reason = data.get(
            "reason",
            "Your reservation has been cancelled by an administrator."
        )

        reservation.cancelled = True
        reservation.cancel_reason = reason
        reservation.save()

        send_cancellation_email(reservation, reason)

        return JsonResponse({"ok": True, "message": "Reservation cancelled"})

    except RoomReservation.DoesNotExist:
        return JsonResponse(
            {"ok": False, "error": "Reservation not found"},
            status=404,
        )
    except Exception as e:
        print("Admin cancel error:", e)
        return JsonResponse(
            {"ok": False, "error": "Server error"},
            status=500,
        )


def send_cancellation_email(reservation, reason, cancelled_by="System"):
    try:
        from api.utils.email_templates import render_cancellation_email

        logo_url = (
            "https://raw.githubusercontent.com/patrickngg1/kioskguys/main/"
            "smartKiosk/media/ui_assets/apple-touch-icon.png"
        )

        html = render_cancellation_email(
            reservation=reservation,
            reason=reason,
            logo_url=logo_url,
            cancelled_by=cancelled_by,
        )

        send_via_sendgrid(
            to_email=reservation.user.email,
            subject="⚠️ Reservation Cancelled",
            html_content=html,
        )

    except Exception as e:
        print("Cancellation Email Error:", e)



# ---------------------------------------------------------
# POST /api/login/
# Session-based login (email + password OR reset-code)
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def login_user(request):
    data = json.loads(request.body.decode("utf-8"))
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
   
# 1️⃣ RESET-CODE LOGIN
    if len(password) == 6 and password.isdigit():
        # Load the user by email (required!)
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({"ok": False, "error": "User not found"}, status=400)

        # Look up code
       # Always fetch the most recent unused reset code
        reset_obj = (
            PasswordResetCode.objects
            .filter(user=user_obj, used=False)
            .order_by('-created_at')
            .first()
        )

        if not reset_obj:
            return JsonResponse({"ok": False, "error": "Invalid code"}, status=400)

        # Fix = ALWAYS compare strings
        if str(reset_obj.code) != str(password):
            return JsonResponse({"ok": False, "error": "Invalid code"}, status=400)


        # Mark code used
        reset_obj.used = True
        reset_obj.save()

        # Login user
        user_obj.backend = "django.contrib.auth.backends.ModelBackend"
        login(request, user_obj)

        # Update profile: MUST set must_set_password = True here
        profile, _ = UserProfile.objects.get_or_create(user=user_obj)
        profile.must_set_password = True
        profile.save()

        return JsonResponse({
            "ok": True,
            "id": user_obj.id,
            "fullName": profile.full_name,
            "email": user_obj.email,
            "isAdmin": user_obj.is_staff,
            "mustSetPassword": True,
        })

    # -----------------------------------------------------
    # 2️⃣ NORMAL LOGIN (email + password)
    # -----------------------------------------------------
    # Convert email → actual Django username
    try:
        real_user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Invalid credentials"}, status=400)

    user = authenticate(request, username=real_user.username, password=password)
    if user is None:
        return JsonResponse({"ok": False, "error": "Invalid credentials"}, status=400)

    # LOGIN (this creates session + sends sessionid cookie)
    login(request, user)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    # profile.must_set_password = False # <-- REMOVED THIS LINE
    profile.save()

    return JsonResponse({
        "ok": True,
        "id": user.id,
        "fullName": profile.full_name or user.username,
        "email": user.email,
        "isAdmin": user.is_staff,
        "mustSetPassword": profile.must_set_password, # <-- Use the actual value from the profile
    })



# ============================================================
# GET /api/me/
# Return logged-in user's session info (used by Dashboard)
# ============================================================
def get_session_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "user": None}, status=200)

    user = request.user

    # Load UserProfile safely
    try:
        user_profile = UserProfile.objects.get(user=user)
        full_name = user_profile.full_name or f"{user.first_name} {user.last_name}".strip()
        must_set_password = user_profile.must_set_password
    except UserProfile.DoesNotExist:
        full_name = f"{user.first_name} {user.last_name}".strip()
        must_set_password = False

    # ✅ CHECK IF CARD EXISTS
    # valid strategy: check if the reverse relationship 'card' exists
    has_card = False
    try:
        has_card = hasattr(user, 'card') and user.card is not None
    except Exception:
        has_card = False

    data = {
        "id": user.id,
        "email": user.email,
        "fullName": full_name,
        "isAdmin": user.is_staff,
        "mustSetPassword": must_set_password,
        "hasCard": has_card,  # <--- NEW FIELD
    }

    return JsonResponse({"ok": True, "user": data}, status=200)



# ---------------------------------------------------------
# POST /api/password-reset/request/
# Sends a one-time code to the user's email for login reset
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def password_reset_request(request):
    """
    POST /api/password-reset/request/
    Body: { "email": "user@mavs.uta.edu" }

    Sends a 6-digit one-time code to the user's email.
    The code can then be used in place of the password to log in.
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    email = (data.get("email") or "").strip().lower()
    if not email:
        return JsonResponse({"ok": False, "error": "Email required"}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't leak which emails exist: pretend success
        return JsonResponse(
            {
                "ok": True,
                "message": "If that email is registered, a reset code has been sent.",
            },
            status=200,
        )

    # Invalidate any previous unused codes for this user
    PasswordResetCode.objects.filter(user=user, used=False).update(used=True)

    # Generate 6-digit numeric code
    code = f"{random.randint(0, 999999):06d}"

    reset_obj = PasswordResetCode.objects.create(user=user, code=code)

    # Build a simple, clean HTML email
    # Same logo used everywhere in your app
    logo_url = (
        "https://raw.githubusercontent.com/patrickngg1/kioskguys/main/"
        "smartKiosk/media/ui_assets/apple-touch-icon.png"
    )

    subject = "Your Smart Kiosk Reset Code"

    # Use your premium HTML template
    html_content = render_password_reset_email(
        logo_url=logo_url,
        code=code,
    )

    try:
        send_via_sendgrid(
            to_email=email,
            subject=subject,
            html_content=html_content,
        )
    except Exception as e:
        print("Password reset send error:", e)
        return JsonResponse(
            {"ok": False, "error": "Could not send reset email."}, status=500
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "Reset code sent. Please check your inbox and spam folder.",
        },
        status=200,
    )


# ---------------------------------------------------------
# GET /api/ui-assets/
# Returns URL mapping for UI images stored in Django
# ---------------------------------------------------------
@require_GET
def get_ui_assets(request):
    from .models import UIAsset

    assets = {}

    for asset in UIAsset.objects.all():
        assets[asset.name] = request.build_absolute_uri(asset.image.url)

    return JsonResponse({"ok": True, "assets": assets}, status=200)


# ---------------------------------------------------------
# POST /api/logout/
# Destroy Django session + return success
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def logoutSession(request):
    try:
        logout(request)
        return JsonResponse({"ok": True, "message": "Logged out"}, status=200)
    except Exception as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=500)


# ---------------------------------------------------------
# GET /api/calendar/ics/<id>/
# Download ICS (Apple / iCal / universal)
# ---------------------------------------------------------
@require_GET
def download_ics(request, reservation_id):
    try:
        r = RoomReservation.objects.select_related("room").get(id=reservation_id)
    except RoomReservation.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Reservation not found"}, status=404)

    try:
        from api.utils.calendar_utils import create_ics_content as generate_ics_event

        tz = timezone.get_current_timezone()

        start_dt = timezone.make_aware(datetime.combine(r.date, r.start_time), tz)
        end_dt = timezone.make_aware(datetime.combine(r.date, r.end_time), tz)

        ics = generate_ics_event(
            room_name=r.room.name,
            start_dt=start_dt,
            end_dt=end_dt,
            reservation_id=r.id,
            user_email=r.email,
        )

        response = HttpResponse(ics, content_type="text/calendar")
        response["Content-Disposition"] = 'attachment; filename="reservation.ics"'
        return response

    except Exception as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=500)


@csrf_exempt
@require_POST
def set_password(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "error": "Not authenticated"}, status=401)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    new_password = data.get("password")
    if not new_password:
        return JsonResponse({"ok": False, "error": "Password required"}, status=400)

    user = request.user
    user.set_password(new_password)
    user.save()
    update_session_auth_hash(request, user)


    # Update user profile flag
    profile = UserProfile.objects.get(user=user)
    profile.must_set_password = False
    profile.save()

    return JsonResponse({"ok": True, "message": "Password updated successfully"})

# Helper to extract the best ID from a swipe string
def parse_uta_card(raw_swipe):
    if not raw_swipe:
        return None

    extracted_id = None

    # PRIORITY 1: Track 3 (The "Student ID" format: +100...)
    # This is specific to University cards and gives the human-readable ID.
    match = re.search(r"\+(\d{5,16})\?", raw_swipe)
    if match:
        extracted_id = match.group(1)

    # PRIORITY 2: Track 2 (The "ISO Number": ;639...)
    # Fallback if Track 3 is damaged or missing.
    if not extracted_id:
        match = re.search(r";(\d{5,19})=", raw_swipe)
        if match:
            extracted_id = match.group(1)

    # PRIORITY 3: Track 1 (Alpha-numeric: %B639...)
    if not extracted_id:
        match = re.search(r"%[A-Z]?(\d{5,19})[\^]", raw_swipe)
        if match:
            extracted_id = match.group(1)

    return extracted_id

@csrf_exempt
@require_POST
def register_card(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "error": "Not authenticated"}, status=401)

    try:
        data = json.loads(request.body.decode("utf-8"))
        raw_swipe = str(data.get("raw_swipe", "")).strip()
    except:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    if not raw_swipe:
        return JsonResponse({"ok": False, "error": "No card data received"}, status=400)

    # 1. Extract ID using new logic (Track 3 priority)
    extracted_id = parse_uta_card(raw_swipe)

    if not extracted_id:
        return JsonResponse({"ok": False, "error": "Could not read card format."}, status=400)

    # 2. SECURITY CHECK: Block Credit Cards
    # UTA cards start with 100 (Student ID) or 600/639 (ISO Number).
    # Credit cards start with 4 (Visa), 5 (Mastercard), 3 (Amex), 6011 (Discover).
    
    valid_prefixes = ["100", "600", "639"]
    is_valid_uta = any(extracted_id.startswith(p) for p in valid_prefixes)

    # Double check: explicitly block financial prefixes if they slipped through
    if extracted_id.startswith(("4", "5", "34", "37", "51", "52", "53", "54", "55")):
        is_valid_uta = False

    if not is_valid_uta:
        print(f"BLOCKED: User {request.user.email} tried to link invalid ID {extracted_id}")
        return JsonResponse({
            "ok": False, 
            "error": "Invalid Card. Please use your official UTA MavID."
        }, status=400)

    # 3. Save to Database
    UserCard.objects.update_or_create(
        user=request.user,
        defaults={
            "uta_id": extracted_id, 
            "raw_swipe": raw_swipe
        }
    )

    return JsonResponse({
        "ok": True, 
        "message": f"UTA Card linked successfully (ID: {extracted_id})"
    })


@csrf_exempt
@require_POST
def login_with_card(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        raw_swipe = str(data.get("raw_swipe", "")).strip()
    except:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    if not raw_swipe:
        return JsonResponse({"ok": False, "error": "Card data required"}, status=400)

    # 1. Extract ID using same logic
    extracted_id = parse_uta_card(raw_swipe)
    
    print(f"LOGIN ATTEMPT: Raw={raw_swipe} | Extracted={extracted_id}")

    card_obj = None

    # 2. Try finding user by Extracted ID (Primary)
    if extracted_id:
        card_obj = UserCard.objects.filter(uta_id=extracted_id).first()

    # 3. Fallback: Try Raw Swipe match (For older registrations or weird reads)
    if not card_obj:
        card_obj = UserCard.objects.filter(raw_swipe=raw_swipe).first()

    if not card_obj:
        return JsonResponse({"ok": False, "error": "Card not registered."}, status=401)

    # Login Success
    user = card_obj.user
    user.backend = "django.contrib.auth.backends.ModelBackend"
    login(request, user)

    try:
        profile = UserProfile.objects.get(user=user)
        full_name = profile.full_name
        must_set_pw = profile.must_set_password
    except UserProfile.DoesNotExist:
        full_name = user.get_full_name() or user.username
        must_set_pw = False

    return JsonResponse({
        "ok": True,
        "id": user.id,
        "email": user.email,
        "fullName": full_name,
        "isAdmin": user.is_staff,
        "mustSetPassword": must_set_pw,
    })