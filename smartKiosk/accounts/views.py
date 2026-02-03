from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.tokens import RefreshToken
import json

from smartKiosk.kiosks import settings

# ----------------------------------------------------
# Helper: Create JWT tokens
# ----------------------------------------------------
def generate_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    refresh_token = str(refresh)
    return access, refresh_token


# ----------------------------------------------------
# POST /api/auth/login/
# Returns access token + sets refresh cookie
# ----------------------------------------------------
@csrf_exempt
def login_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body.decode())
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    email = (data.get("email") or "").lower().strip()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"ok": False, "error": "Missing credentials"}, status=400)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"ok": False, "error": "Invalid email or password"}, status=401)

    # Keep Django session so request.user works
    login(request, user)

    # Use built-in user fields (no UserProfile model)
    profile_full_name = user.get_full_name() or user.email
    is_admin = user.is_staff or user.is_superuser

    # Generate JWT tokens
    access, refresh_token = generate_tokens_for_user(user)

    response = JsonResponse({
        "ok": True,
        "access": access,
        "user": {
            "id": user.id,
            "email": user.email,
            "fullName": profile_full_name,
            "isAdmin": is_admin,
        }
    })

    # Set refresh cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="None",
        path="/api/auth/",
    )

    return response



# ----------------------------------------------------
# POST /api/auth/refresh/
# Returns new access token using refresh cookie
# ----------------------------------------------------
@csrf_exempt
def refresh_api(request):
    refresh_token = request.COOKIES.get("refresh_token")

    if not refresh_token:
        return JsonResponse({"ok": False, "error": "No refresh token"}, status=401)

    try:
        refresh = RefreshToken(refresh_token)
        new_access = str(refresh.access_token)
        return JsonResponse({"ok": True, "access": new_access})
    except Exception as e:
        print("REFRESH ERROR:", e)
        return JsonResponse({"ok": False, "error": "Invalid refresh token"}, status=401)


# ----------------------------------------------------
# POST /api/auth/logout/
# Clears refresh cookie
# ----------------------------------------------------
@csrf_exempt
def logout_api(request):
    try:
        logout(request)
        response = JsonResponse({"ok": True})
        response.delete_cookie("refresh_token", path="/api/auth/")
        return response
    except:
        return JsonResponse({"ok": False, "error": "Logout failed"}, status=500)


# -------------------------------
# REGISTER PLACEHOLDER
# -------------------------------
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["POST"])
def register_api(request):
    return Response({"ok": True, "message": "Registration endpoint working"})
