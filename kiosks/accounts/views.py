import json

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

ALLOWED_DOMAINS = ("uta.edu", "mavs.uta.edu")


def is_uta_email(email: str) -> bool:
    parts = (email or "").rsplit("@", 1)
    if len(parts) != 2:
        return False
    return parts[1].lower() in ALLOWED_DOMAINS


def validate_password(password: str):
    """
    Must be:
      - at least 8 chars
      - contain 1 uppercase
      - contain 1 digit
      - contain 1 special character
    Returns list of error strings (empty = ok).
    """
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


@csrf_exempt
def register_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    full_name = (data.get("fullName") or "").strip()

    if not full_name:
        return JsonResponse({"error": "Full name is required."}, status=400)

    if not is_uta_email(email):
        return JsonResponse(
            {
                "error": "Registration email must end with @uta.edu or @mavs.uta.edu."
            },
            status=400,
        )

    pw_errors = validate_password(password)
    if pw_errors:
        return JsonResponse({"error": pw_errors[0]}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse(
            {"error": "This email is already registered. Try signing in."}, status=400
        )

    # use email as username (simple)
    username = email

    user = User(username=username, email=email)
    # You can split full_name into first/last if you want; for now store in first_name:
    user.first_name = full_name
    user.set_password(password)
    user.is_active = True  # no verification yet
    user.save()

    # Optional: log them in immediately
    login(request, user)

    return JsonResponse(
        {
            "message": "Registration successful.",
            "user": {
                "id": user.id,
                "email": user.email,
                "fullName": user.first_name,
            },
        },
        status=201,
    )


@csrf_exempt
def login_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse(
            {"error": "Email and password are required."}, status=400
        )

    # We stored username = email
    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse(
            {"error": "Invalid email or password."}, status=401
        )

    login(request, user)

    return JsonResponse(
        {
            "message": "Login successful.",
            "user": {
                "id": user.id,
                "email": user.email,
                "fullName": user.first_name,
            },
        }
    )
