from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # App pages
    path('', include('main.urls')),

    # Session-based auth (login, register, me, logout)
    # Now your endpoints are:
    #   /api/auth/login/
    #   /api/auth/register/
    #   /api/auth/logout/
    #   /api/auth/me/
    path('api/auth/', include('accounts.urls')),

    # Supply Request API
    #   /api/supplies/request/
    path('api/', include('api.urls')),

    # JWT Endpoints (future use)
    path('api/auth/jwt/login/', TokenObtainPairView.as_view(), name='jwt_login'),
    path('api/auth/jwt/refresh/', TokenRefreshView.as_view(), name='jwt_refresh'),
    path('api/auth/jwt/verify/', TokenVerifyView.as_view(), name='jwt_verify'),
]
