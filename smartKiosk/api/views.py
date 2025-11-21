# api/views.py
import json
import smtplib
from email.mime.text import MIMEText
from base64 import b64encode

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.db.models import F

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User

from accounts.models import UserProfile

from .models import (
    Category,
    Item,
    SupplyRequest,
    ItemPopularity,
    Room,
    RoomReservation,
)

from datetime import datetime, timedelta
from django.utils import timezone

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
        UserProfile.objects.create(
            user=user,
            full_name=full_name
        )

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
# GET /api/rooms/
# Returns all rooms with capacity + features
# ---------------------------------------------------------
@require_GET
def get_rooms(request):
    rooms = Room.objects.all().order_by("name")

    data = [
        {
            "id": r.id,
            "name": r.name,
            "capacity": r.capacity,
            "hasScreen": r.has_screen,
            "hasHdmi": r.has_hdmi,
        }
        for r in rooms
    ]

    return JsonResponse({"ok": True, "rooms": data}, status=200)

# …………… EVERYTHING ABOVE UNCHANGED ……………

# ---------------------------------------------------------
# Helpers for calendar link and emails
# ---------------------------------------------------------
def build_calendar_link(reservation):
    """
    Generate a Google Calendar link using zoneinfo-safe datetimes.
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
            server.starttls(context=settings.SMTP_UNVERIFIED_CONTEXT)
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
    # 🔐 Require logged-in user (session-based)
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

    # Convert date and time strings → proper objects
    try:
        date_value = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse(
            {"ok": False, "error": "Invalid date format (expected YYYY-MM-DD)"},
            status=400,
        )

    try:
        start_value = datetime.strptime(start_str, "%H:%M").time()
        end_value = datetime.strptime(end_str, "%H:%M").time()
    except ValueError:
        return JsonResponse(
            {"ok": False, "error": "Invalid time format (expected HH:MM)"},
            status=400,
        )

    # Check for conflicting reservations
    conflict = RoomReservation.objects.filter(
        room=room,
        date=date_value,
        cancelled=False,
        start_time__lt=end_value,
        end_time__gt=start_value,
    ).exists()

    if conflict:
        return JsonResponse(
            {
                "ok": False,
                "error": "This room is already reserved for that time.",
            },
            status=409,
        )

    # Figure out full_name + email from the logged-in user
    user = request.user
    email = user.email

    full_name = ""
    try:
        profile = UserProfile.objects.get(user=user)
        full_name = profile.full_name or user.get_full_name() or user.username
    except UserProfile.DoesNotExist:
        full_name = user.get_full_name() or user.username or user.email

    # Create reservation
    reservation = RoomReservation.objects.create(
        user=user,
        room=room,
        date=date_value,
        start_time=start_value,
        end_time=end_value,
        full_name=full_name,
        email=email,
    )

    # Optional: send calendar email
    calendar_link = build_calendar_link(reservation)
    email_sent, email_error = send_reservation_email(reservation, calendar_link)

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


# api/views.py (Replace the existing function with this)
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
        data.append({
            "id": r.id,
            "roomId": r.room.id,
            "roomName": r.room.name,
            "capacity": r.room.capacity,
            "hasScreen": r.room.has_screen,   # ← FIXED
            "hasHdmi": r.room.has_hdmi,       # ← FIXED
            "date": str(r.date),
            "startTime": r.start_time.strftime("%H:%M"),
            "endTime": r.end_time.strftime("%H:%M"),
            "cancelled": r.cancelled,
            "cancelReason": r.cancel_reason or "",
        })

    return JsonResponse({"ok": True, "reservations": data}, status=200)

# api/views.py (Replace the existing function with this)

# ---------------------------------------------------------
# POST /api/rooms/reservations/<id>/cancel/
# Cancel a reservation
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def cancel_room_reservation(request, reservation_id):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "error": "Login required"}, status=401)

    # 💡 CRITICAL FIX: Read the raw body stream to ensure Django's request 
    # parsing is satisfied, resolving the persistent 400 error.
    try:
        # Read and discard the entire body content
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

        # Only allow the user who booked the room (or an admin in future)
        if reservation.user != request.user:
            return JsonResponse(
                {"ok": False, "error": "Not allowed"},
                status=403,
            )

        reservation.cancelled = True
        reservation.cancel_reason = "User cancelled"
        reservation.save()

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
# POST /api/rooms/reservations/<id>/admin-cancel/
# Admin cancels ANY reservation + sends cancellation email
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def admin_cancel_reservation(request, reservation_id):
    # Require admin privileges
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

        # Mark cancelled
        reservation.cancelled = True
        reservation.cancel_reason = reason
        reservation.save()

        # Send cancellation email
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

def send_cancellation_email(reservation, reason):
    subject = f"Reservation Cancelled – {reservation.room.name}"
    body = f"""
    <h3>Your reservation has been cancelled</h3>
    <p><b>Room:</b> {reservation.room.name}</p>
    <p><b>Date:</b> {reservation.date}</p>
    <p><b>Original Time:</b> {reservation.start_time} – {reservation.end_time}</p>
    <p><b>Reason:</b> {reason}</p>
    <br/>
    <p>If you have any questions, please contact the building administrator.</p>
    """

    msg = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_HOST_USER
    msg["To"] = reservation.email

    try:
        smtp = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        smtp.starttls()
        smtp.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        smtp.send_message(msg)
        smtp.quit()
        return True, None
    except Exception as e:
        return False, str(e)


# api/views.py (Replace the existing function with this)
# ---------------------------------------------------------
# POST /api/login/
# Session-based login using Django User (TiDB-backed)
# ---------------------------------------------------------
@csrf_exempt
@require_POST
def login_user(request):
    """
    Login using Django User table (stored in TiDB).
    Expects JSON: { "email": "...", "password": "..." }
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
        email = data.get("email")
        password = data.get("password")
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    if not email or not password:
        return JsonResponse(
            {"ok": False, "error": "Email and password required"}, status=400
        )

    # Django User does NOT authenticate with email by default, so we find user by email
    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse(
            {"ok": False, "error": "Invalid email or password"}, status=401
        )

    # Use username for authenticate()
    user = authenticate(username=user_obj.username, password=password)

    if user is None:
        return JsonResponse(
            {"ok": False, "error": "Invalid email or password"}, status=401
        )

    # Create session
    login(request, user)

    full_name = (
        user_obj.userprofile.full_name
        if hasattr(user_obj, "userprofile")
        else user_obj.username
    )
    is_admin = hasattr(user_obj, "userprofile") and getattr(
        user_obj.userprofile, "is_admin", False
    )

    return JsonResponse(
        {
            "ok": True,
            "message": "Login successful",
            "id": user_obj.id, # 💡 FIX APPLIED: ADDED User ID
            "fullName": full_name,
            "email": user_obj.email,
            "isAdmin": user_obj.is_staff,
        },
        status=200,
    )

# ---------------------------------------------------------
# GET /api/me/
# Return the current session user, if logged in
# ---------------------------------------------------------
@csrf_exempt
@require_GET
def get_session_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "user": None}, status=401)

    user = request.user
    profile = getattr(user, "userprofile", None)

    full_name = None
    is_admin = False

    if profile:
        full_name = profile.full_name or None
        is_admin = getattr(profile, "is_admin", False)

    if not full_name:
        full_name = user.get_full_name() or user.username or user.email

    return JsonResponse(
        {
            "ok": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "fullName": full_name,
                "isAdmin": user.is_staff,
            },
        },
        status=200,
    )


# ---------------------------------------------------------
# GET /api/ui-assets/
# Returns URL mapping for UI images stored in Django
# ---------------------------------------------------------
@require_GET
def get_ui_assets(request):
    from .models import UIAsset  # safe import inside function

    assets = {}

    # Build a dict: { "bg-campus": "http://.../media/ui_assets/bg-campus.jpg", ... }
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
        logout(request)  # from django.contrib.auth
        return JsonResponse({"ok": True, "message": "Logged out"}, status=200)
    except Exception as e:
        return JsonResponse({"ok": False, "error": str(e)}, status=500)
