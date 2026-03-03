"""
JWT Authentication Middleware
-----------------------------
Reads an Authorization: Bearer <token> header and sets request.user
for plain Django views (which are not processed by DRF's per-view auth).

This makes every existing `if not request.user.is_authenticated` check
work with JWT without touching any view code.

Session authentication still takes priority (used by /admin/).
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class JWTAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self._jwt_auth = JWTAuthentication()

    def __call__(self, request):
        # Only try JWT if Django session didn't already authenticate the user.
        if not request.user.is_authenticated:
            try:
                result = self._jwt_auth.authenticate(request)
                if result is not None:
                    user, _token = result
                    request.user = user
            except (InvalidToken, TokenError):
                pass  # anonymous user stays

        return self.get_response(request)
