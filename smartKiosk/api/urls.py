# api/urls.py
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from . import views
from .views import login_user, get_session_user, cancel_room_reservations_bulk, password_reset_request

urlpatterns = [
    # --------------------------
    # Auth
    # --------------------------
    path("login/", login_user, name="login_user"),
    path("logout/", views.logoutSession, name="logout_user"),          # ✅ Added safely
    path("register/", views.register_user, name="register_user"),      # ✅ Added safely
    path("me/", get_session_user, name="get_session_user"),
    path("password-reset/request/", password_reset_request, name="password_reset_request"),
    path("set-password/", views.set_password),

    # --------------------------
    # Supplies
    # --------------------------
    path("supplies/request/", views.create_supply_request, name="create_supply_request"),
    path("items/", views.get_items, name="get_items"),
    path("supplies/popular/", views.get_popular_items, name="get_popular_items"),

    # Item image upload (admin)
    path(
        "items/<int:item_id>/upload-image/",
        views.upload_item_image,
        name="upload_item_image",
    ),

    # --------------------------
    # Rooms
    # --------------------------
    path("rooms/", views.get_rooms, name="get_rooms"),
    path("rooms/reserve/", views.create_room_reservation, name="create_room_reservation"),
    path("rooms/reservations/my/", views.my_room_reservations, name="my_room_reservations"),

    # >>> ADD THIS LINE <<<
    path("rooms/reservations/all/", views.all_room_reservations, name="all_room_reservations"),

    # Bulk cancel
    path(
        "rooms/reservations/cancel-bulk/",
        csrf_exempt(cancel_room_reservations_bulk),
        name="cancel_room_reservations_bulk",
    ),
    # Cancel reservation
    path(
        "rooms/reservations/<int:reservation_id>/cancel/",
        csrf_exempt(views.cancel_room_reservation),
        name="cancel_room_reservation",
    ),
    path(
        "rooms/reservations/by-date/",
        views.reservations_by_date,
        name="reservations_by_date",
    ),
    # Room Admin Routes
    path("rooms/create/", views.create_room),
    path("rooms/<int:room_id>/update/", views.update_room),
    path("rooms/<int:room_id>/delete/", views.delete_room),

    # Admin cancel
    path(
        "rooms/reservations/<int:reservation_id>/admin-cancel/",
        views.admin_cancel_reservation,
        name="admin_cancel_reservation",
    ),
    path("calendar/ics/<int:reservation_id>/", views.download_ics, name="download_ics"),
    path("calendar/ics/<int:reservation_id>/", views.download_ics, name="download_ics"),


    # --------------------------
    # UI Assets
    # --------------------------
    path("ui-assets/", views.get_ui_assets, name="ui_assets"),
]
