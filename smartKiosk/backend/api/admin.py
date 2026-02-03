from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Category,
    Item,
    SupplyRequest,
    ItemPopularity,
    Room,
    RoomReservation,
)
from .models import UIAsset

@admin.register(UIAsset)
class UIAssetAdmin(admin.ModelAdmin):
    list_display = ("name", "image")


# -----------------------------------------
# ROOM ADMIN
# -----------------------------------------
@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "capacity", "has_screen", "has_hdmi")
    search_fields = ("name",)
    list_filter = ("has_screen", "has_hdmi")


# -----------------------------------------
# ROOM RESERVATION ADMIN
# -----------------------------------------
@admin.register(RoomReservation)
class RoomReservationAdmin(admin.ModelAdmin):
    list_display = ("room", "date", "start_time", "end_time", "full_name", "email", "cancelled")
    list_filter = ("date", "room", "cancelled")
    search_fields = ("full_name", "email")


# -----------------------------------------
# CATEGORY ADMIN
# -----------------------------------------
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "key")
    search_fields = ("name", "key")


# -----------------------------------------
# ITEM ADMIN (with image preview)
# -----------------------------------------
@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "image_preview")
    list_filter = ("category",)
    search_fields = ("name",)

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width:50px; height:50px; object-fit:cover; border-radius:6px;" />',
                obj.image.url,
            )
        return "(no image)"

    image_preview.short_description = "Preview"


# -----------------------------------------
# Item Popularity Admin
# -----------------------------------------
@admin.register(ItemPopularity)
class ItemPopularityAdmin(admin.ModelAdmin):
    list_display = ("item_name", "category", "count")
    list_filter = ("category",)
    search_fields = ("item_name",)


# -----------------------------------------
# Supply Requests Admin
# -----------------------------------------
@admin.register(SupplyRequest)
class SupplyRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "email", "requested_at")
    readonly_fields = ("requested_at", "items")
