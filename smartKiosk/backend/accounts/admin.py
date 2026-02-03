from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile 


# ---------------------------------------------------------
# 1. Custom Inline to embed UserProfile fields on the User page
# ---------------------------------------------------------
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'User Profile'
    # Specify which fields from UserProfile should appear
    fields = ('full_name', 'must_set_password', 'is_admin', 'is_verified')


# ---------------------------------------------------------
# 2. Custom UserAdmin that includes the inline profile
# ---------------------------------------------------------
class CustomUserAdmin(BaseUserAdmin):
    # This is the key: inject the custom profile fields
    inlines = (UserProfileInline,)
    
    # You can customize list_display and search_fields here
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')


# ---------------------------------------------------------
# 3. Register the model(s)
# ---------------------------------------------------------

# Unregister the default User model
admin.site.unregister(User)

# Register the User model with your custom admin class
admin.site.register(User, CustomUserAdmin)