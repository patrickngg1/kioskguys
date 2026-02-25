from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver

from .models import BannerImage, Item  # <-- assumes Item model is in api/models.py


# -------------------------------
# BANNERS
# -------------------------------
@receiver(post_delete, sender=BannerImage)
def banner_delete_file_on_row_delete(sender, instance, **kwargs):
    """
    When a BannerImage row is deleted, delete its file from storage.
    """
    if instance.image:
        instance.image.delete(save=False)


@receiver(pre_save, sender=BannerImage)
def banner_delete_old_file_on_replace(sender, instance, **kwargs):
    """
    When BannerImage.image is replaced, delete the old file.
    """
    if not instance.pk:
        return  # new row, nothing to replace

    try:
        old = BannerImage.objects.get(pk=instance.pk)
    except BannerImage.DoesNotExist:
        return

    old_file = old.image
    new_file = instance.image

    if old_file and old_file.name and old_file != new_file:
        old_file.delete(save=False)


# -------------------------------
# ITEMS
# -------------------------------
@receiver(post_delete, sender=Item)
def item_delete_file_on_row_delete(sender, instance, **kwargs):
    """
    When an Item row is deleted, delete its file from storage.
    """
    # If your field name is not "image", change it here.
    if instance.image:
        instance.image.delete(save=False)


@receiver(pre_save, sender=Item)
def item_delete_old_file_on_replace(sender, instance, **kwargs):
    """
    When Item.image is replaced, delete the old file.
    """
    if not instance.pk:
        return

    try:
        old = Item.objects.get(pk=instance.pk)
    except Item.DoesNotExist:
        return

    # If your field name is not "image", change it here.
    old_file = old.image
    new_file = instance.image

    if old_file and old_file.name and old_file != new_file:
        old_file.delete(save=False)