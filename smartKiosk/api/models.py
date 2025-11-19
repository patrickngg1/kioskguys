from django.db import models


# ---------------------------------------------------------
# CATEGORY MODEL (Dynamic item sections)
# ---------------------------------------------------------
class Category(models.Model):
    # Display name: “Break Room”, “K-Cups”, “Storage Closet”
    name = models.CharField(max_length=100, unique=True)

    # Machine key: "break", "kcup", "closet"
    key = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


# ---------------------------------------------------------
# ITEM MODEL (Each supply item belongs to a Category)
# ---------------------------------------------------------
class Item(models.Model):
    name = models.CharField(max_length=200, unique=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="items")

    # Uploaded image
    image = models.ImageField(upload_to="items/", blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.category.key})"


# ---------------------------------------------------------
# SUPPLY REQUEST (When a user submits items)
# ---------------------------------------------------------
class SupplyRequest(models.Model):
    user_id = models.IntegerField()
    full_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    # Stores an array of item names
    items = models.JSONField()

    requested_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Request #{self.id} from {self.full_name or self.user_id}"


# ---------------------------------------------------------
# ITEM POPULARITY (Counts how many times each item was used)
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
# ROOM RESERVATIONS (For conference room bookings)
# ---------------------------------------------------------
class RoomReservation(models.Model):
    room = models.CharField(max_length=50)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    user_id = models.IntegerField()
    full_name = models.CharField(max_length=120)
    email = models.EmailField()

    cancelled = models.BooleanField(default=False)
    cancel_reason = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "room_reservations"
        ordering = ["date", "start_time"]

    def __str__(self):
        return f"{self.room} on {self.date} ({self.start_time}-{self.end_time})"
