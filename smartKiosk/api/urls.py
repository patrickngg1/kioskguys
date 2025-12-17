# api/urls.py
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from . import views
from .views import login_user, get_session_user, cancel_room_reservations_bulk, password_reset_request, get_all_items

urlpatterns = [
    # --------------------------
    # Auth
    # --------------------------
    path("login/", login_user, name="login_user"),
    path("logout/", views.logoutSession, name="logout_user"),          # ✅ Added safely
    path("register/", views.register_user, name="register_user"),      # ✅ Added safely
    path("me/", get_session_user, name="get_session_user"),
    path("me/update-name/", views.update_user_name, name="update_user_name"),

    path("password-reset/request/", password_reset_request, name="password_reset_request"),
    # ... other paths ...
    path("password-reset/request/", password_reset_request, name="password_reset_request"),
    path("set-password/", views.set_password),

    # --------------------------
    # Supplies
    # --------------------------
    path("supplies/request/", views.create_supply_request, name="create_supply_request"),
    path("items/", views.get_items, name="get_items"),
    path("items/all/", get_all_items),

    path("supplies/popular/", views.get_popular_items, name="get_popular_items"),

    # Item image upload (admin)
    path(
        "items/<int:item_id>/upload-image/",
        views.upload_item_image,
        name="upload_item_image",
    ),

    # Admin: create/update/delete items
    path("items/save/", views.admin_save_item, name="admin_save_item"),
    path("items/<int:item_id>/delete/", views.admin_delete_item, name="admin_delete_item"),




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

    path("users/", views.get_all_users),
    path("users/<int:user_id>/toggle-admin/", views.toggle_admin),
    path("users/<int:user_id>/delete/", views.delete_user),



    # --------------------------
    # UI Assets
    # --------------------------
    path("ui-assets/", views.get_ui_assets, name="ui_assets"),

    # Banner images
    path("banners/", views.list_banners),
    path("banners/upload/", views.upload_banner),
    path("banners/<int:banner_id>/activate/", views.activate_banner),
    path("banners/<int:banner_id>/deactivate/", views.deactivate_banner),
    path("banners/<int:banner_id>/delete/", views.delete_banner),
    path("banners/<int:banner_id>/schedule/", views.schedule_banner),
    path("banners/<int:banner_id>/update/", views.update_banner),
    path("banners/active/", views.get_active_banners),

        # --------------------------
    # Card Swipe Auth
    # --------------------------
    path("card/register/", views.register_card, name="register_card"),
    path("card/login/", views.login_with_card, name="login_with_card"),
]
