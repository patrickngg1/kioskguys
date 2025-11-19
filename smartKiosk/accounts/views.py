import json
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import UserProfile

ALLOWED_DOMAINS = ("uta.edu", "mavs.uta.edu")


def is_uta_email(email: str) -> bool:
    parts = (email or "").rsplit("@", 1)
    if len(parts) != 2:
        return False
    return parts[1].lower() in ALLOWED_DOMAINS


def validate_password_strength(password: str):
    pw = password or ""
    errors = []
    if len(pw) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not any(c.isupper() for c in pw):
        errors.append("Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in pw):
        errors.append("Password must contain at least one number.")
    if not any(not c.isalnum() for c in pw):
        errors.append("Password must contain at least one special character.")
    return errors


# ---------------------------------------------------------
# POST /api/auth/register/
# ---------------------------------------------------------
@csrf_exempt
def register_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not full_name:
        return JsonResponse({"error": "Full name is required."}, status=400)
    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    if not is_uta_email(email):
        return JsonResponse(
            {"error": "Email must end with @uta.edu or @mavs.uta.edu."},
            status=400,
        )

    pw_errors = validate_password_strength(password)
    if pw_errors:
        return JsonResponse({"error": pw_errors[0]}, status=400)

    # Email-as-username system
    if User.objects.filter(username=email).exists():
        return JsonResponse(
            {"error": "This email is already registered. Try logging in."},
            status=400,
        )

    # Create Django User
    user = User.objects.create(username=email, email=email)
    user.set_password(password)
    user.is_active = True        # active by default
    user.save()

    # Store full name in profile
    profile = UserProfile.objects.create(
        user=user,
        full_name=full_name,
        is_verified=True,
        is_admin=False
    )

    # Auto-login after registration — optional but kept
    login(request, user)

    return JsonResponse(
        {
            "message": "Registration successful.",
            "user": {
                "id": user.id,
                "email": user.email,
                "fullName": profile.full_name,
            },
        },
        status=201,
    )


# ---------------------------------------------------------
# POST /api/auth/login/
# ---------------------------------------------------------
@csrf_exempt
def login_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    # Authenticate username=email
    user = authenticate(request, username=email, password=password)
    if not user:
        return JsonResponse({"error": "Invalid email or password."}, status=401)

    login(request, user)

    profile = UserProfile.objects.get(user=user)

    return JsonResponse(
        {
            "message": "Login successful.",
            "user": {
                "id": user.id,
                "email": user.email,
                "fullName": profile.full_name,
                "isAdmin": profile.is_admin,
                "isVerified": profile.is_verified,
            },
        }
    )
