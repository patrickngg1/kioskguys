from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
import json

from django.conf import settings


# ----------------------------------------------------
# Helper: Create JWT tokens
# ----------------------------------------------------
def generate_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


# ----------------------------------------------------
# POST /api/auth/login/
# Returns access + refresh tokens in JSON body.
# No cookies — works on iPhone Safari / every browser.
# ----------------------------------------------------
@csrf_exempt
def login_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body.decode())
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    email = (data.get("email") or "").lower().strip()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"ok": False, "error": "Missing credentials"}, status=400)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"ok": False, "error": "Invalid email or password"}, status=401)

    profile_full_name = user.get_full_name() or user.email
    is_admin = user.is_staff or user.is_superuser

    access, refresh_token = generate_tokens_for_user(user)

    return JsonResponse({
        "ok": True,
        "access": access,
        "refresh": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "fullName": profile_full_name,
            "isAdmin": is_admin,
        },
    })


# ----------------------------------------------------
# POST /api/auth/refresh/
# Accepts { "refresh": "<token>" } in request body.
# Returns { "ok": true, "access": "<new_access>" }
# ----------------------------------------------------
@csrf_exempt
def refresh_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body.decode())
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    refresh_token = data.get("refresh", "").strip()
    if not refresh_token:
        return JsonResponse({"ok": False, "error": "No refresh token"}, status=401)

    try:
        refresh = RefreshToken(refresh_token)
        new_access = str(refresh.access_token)
        return JsonResponse({"ok": True, "access": new_access})
    except (TokenError, InvalidToken) as e:
        return JsonResponse({"ok": False, "error": "Invalid or expired refresh token"}, status=401)


# ----------------------------------------------------
# POST /api/auth/logout/
# JWT is stateless — client simply discards tokens.
# This endpoint exists for completeness / future blacklisting.
# ----------------------------------------------------
@csrf_exempt
def logout_api(request):
    return JsonResponse({"ok": True})


# -------------------------------
# REGISTER PLACEHOLDER
# -------------------------------
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["POST"])
def register_api(request):
    return Response({"ok": True, "message": "Registration endpoint working"})
