from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Item, ItemPopularity, SupplyRequest, RoomReservation


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
# Supply Requests
# -----------------------------------------
@admin.register(SupplyRequest)
class SupplyRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "email", "requested_at")
    readonly_fields = ("requested_at", "items")


# -----------------------------------------
# Room Reservations
# -----------------------------------------
@admin.register(RoomReservation)
class RoomReservationAdmin(admin.ModelAdmin):
    list_display = ("room", "date", "start_time", "end_time", "full_name")
    list_filter = ("room", "date")
    search_fields = ("full_name", "email")
