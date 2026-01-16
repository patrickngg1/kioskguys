from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

def banner_upload_path(instance, filename):
    return f"banners/{filename}"   # stored inside media/banners/

class BannerImage(models.Model):
    image = models.ImageField(upload_to=banner_upload_path)
    label = models.CharField(max_length=128, blank=True)
    # ✅ NEW: Link field for QR codes
    repeat_yearly = models.BooleanField(default=False)
    link = models.URLField(max_length=500, blank=True, null=True) 
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.label or f"Banner {self.id}"

# ---------------------------------------------------------
# CATEGORY MODEL
# ---------------------------------------------------------
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    key = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


# ---------------------------------------------------------
# ITEM MODEL — FINAL VERSION (Media Uploads Only)
# ---------------------------------------------------------

def supply_item_upload_path(instance, filename):
    """
    Upload path for item images:
    media/items/<Item_Name_Safe>/<filename>
    """
    safe_name = instance.name.replace(" ", "_")
    return f"items/{safe_name}/{filename}"


class Item(models.Model):
    name = models.CharField(max_length=200, unique=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="items",
    )

    # FINAL — ONLY DJANGO MEDIA IMAGES
    image = models.ImageField(
        upload_to=supply_item_upload_path,
        blank=True,
        null=True,
        help_text="Upload an image like 'Kleenex.png'"
    )

    # Track popularity
    request_count = models.IntegerField(default=0)

    # Let admin hide items
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.category.key})"


# ---------------------------------------------------------
# SUPPLY REQUEST MODEL
# ---------------------------------------------------------
class SupplyRequest(models.Model):
    user_id = models.IntegerField()
    full_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    items = models.JSONField()
    requested_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Request #{self.id} from {self.full_name or self.user_id}"


# ---------------------------------------------------------
# ITEM POPULARITY MODEL
# ---------------------------------------------------------
class ItemPopularity(models.Model):
    item_name = models.CharField(max_length=255)
    category = models.CharField(max_length=50)
    count = models.IntegerField(default=0)

    class Meta:
        unique_together = ("item_name", "category")

    def __str__(self):
        return f"{self.item_name} [{self.category}] x{self.count}"


# ---------------------------------------------------------
# ROOM MODEL
# ---------------------------------------------------------
# api/models.py

class Room(models.Model):
    name = models.CharField(max_length=100, unique=True)
    capacity = models.IntegerField(default=8)

    # ✅ THIS MATCHES YOUR DATABASE COLUMN 'features' (json)
    features = models.JSONField(default=list, blank=True)

    # Legacy fields (Keep them, as they exist in your DB as 'has_screen' and 'has_hdmi')
    has_screen = models.BooleanField(default=True)
    has_hdmi = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} (Capacity: {self.capacity})"
    
# ---------------------------------------------------------
# ROOM RESERVATION MODEL
# ---------------------------------------------------------
class RoomReservation(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=120)
    email = models.EmailField()

    cancelled = models.BooleanField(default=False)
    cancel_reason = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "room_reservations"
        ordering = ["date", "start_time"]

    def __str__(self):
        return f"{self.room.name} on {self.date} ({self.start_time}-{self.end_time})"


def ui_asset_upload_path(instance, filename):
    """
    Save UI assets (like banners, favicons, backgrounds)
    into: media/ui_assets/<AssetName>.<ext>
    """
    import os
    safe_name = instance.name.replace(" ", "_")
    ext = os.path.splitext(filename)[1].lower()
    return f"ui_assets/{safe_name}{ext}"


class UIAsset(models.Model):
    name = models.CharField(max_length=200, unique=True)
    image = models.ImageField(upload_to=ui_asset_upload_path)

    def __str__(self):
        return self.name
    

# ---------------------------------------------------------
# PASSWORD RESET CODE MODEL
# ---------------------------------------------------------
class PasswordResetCode(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_codes",
    )
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.email} – {self.code}"

    @property
    def is_expired(self):
        # 10-minute lifetime
        from datetime import timedelta

        return self.created_at < timezone.now() - timedelta(minutes=10)
    