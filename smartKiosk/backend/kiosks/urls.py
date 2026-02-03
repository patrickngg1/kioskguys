from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from kiosks.ui_assets import get_ui_assets;

# ⭐ ADD THESE THREE IMPORTS
from django.conf import settings
from django.conf.urls.static import static

from smartKiosk.backend.kiosks.views import health_check

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # App pages
    path('', health_check),                 # ✅ root /
    path('health/', health_check),  

    # Auth endpoints
    path('api/auth/', include('accounts.urls')),

    # Supply Request + Items API
    path('api/', include('api.urls')),
    path("api/ui-assets/", get_ui_assets),
    # JWT Endpoints
    path('api/auth/jwt/login/', TokenObtainPairView.as_view(), name='jwt_login'),
    path('api/auth/jwt/refresh/', TokenRefreshView.as_view(), name='jwt_refresh'),
    path('api/auth/jwt/verify/', TokenVerifyView.as_view(), name='jwt_verify'),
]

# ⭐ ADD THIS BLOCK BELOW
# Serve media files (uploaded images)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
