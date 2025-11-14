from django.urls import path
from . import views

app_name = "accounts"

urlpatterns = [
    path("api/auth/register/", views.register_api, name="register_api"),
    path("api/auth/login/", views.login_api, name="login_api"),
]
