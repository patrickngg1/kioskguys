from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

# ---------------------------------------------------------
# AUTO-CREATE USER PROFILE WHEN USER IS CREATED
# ---------------------------------------------------------
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(
            user=instance,
            full_name=instance.username
        )

# ---------------------------------------------------------
# USER PROFILE MODEL
# ---------------------------------------------------------
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=150)

    # Required for your project
    must_set_password = models.BooleanField(default=False)

    # Existing flags in your DB (keep them simple)
    is_admin = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=True)

    def __str__(self):
        return self.full_name or self.user.username

# ---------------------------------------------------------
# USER CARD MODEL — STORES UTA ID FROM CARD SWIPE
# ---------------------------------------------------------
# accounts/models.py

# accounts/models.py
class UserCard(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="card")
    uta_id = models.CharField(max_length=20, null=True, blank=True)
    # ✅ EXACT CODE: CharField(max_length=255) supports unique indexing
    raw_swipe = models.CharField(max_length=255, unique=True, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} — UTA ID: {self.uta_id or 'None'}"