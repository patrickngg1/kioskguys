from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_api),
    path("refresh/", views.refresh_api),
    path("logout/", views.logout_api),
]
