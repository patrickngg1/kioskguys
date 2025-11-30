from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(
            user=instance,
            full_name=instance.username
        )

# ---------------------------------------------------------
# USER PROFILE — clean, simple full name + flags
# ---------------------------------------------------------
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=150)
    must_set_password = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)      # future use
    is_verified = models.BooleanField(default=True)    # set True for now
    
    def __str__(self):
        return self.full_name
