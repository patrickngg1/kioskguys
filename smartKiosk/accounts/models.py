from django.db import models
from django.contrib.auth.models import User

# ---------------------------------------------------------
# USER PROFILE — clean, simple full name + flags
# ---------------------------------------------------------
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=150)
    is_admin = models.BooleanField(default=False)      # future use
    is_verified = models.BooleanField(default=True)    # set True for now

    def __str__(self):
        return self.full_name
