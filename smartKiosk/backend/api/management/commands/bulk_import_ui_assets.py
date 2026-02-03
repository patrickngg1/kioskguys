import os
from django.core.management.base import BaseCommand
from django.core.files import File
from api.models import UIAsset

class Command(BaseCommand):
    help = "Bulk import UI assets (backgrounds, banners, favicons, etc.) into Django."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=str,
            required=True,
            help="Path containing UI asset images (PNG/JPG/WEBP)"
        )

    def handle(self, *args, **options):
        folder_path = options["path"]

        if not os.path.isdir(folder_path):
            self.stdout.write(self.style.ERROR(f"Invalid folder: {folder_path}"))
            return

        valid_exts = [".png", ".jpg", ".jpeg", ".webp"]

        files = [
            f for f in os.listdir(folder_path)
            if os.path.splitext(f)[1].lower() in valid_exts
        ]

        if not files:
            self.stdout.write(self.style.WARNING("No supported image files found."))
            return

        imported = 0

        for filename in files:
            asset_name = os.path.splitext(filename)[0]
            file_path = os.path.join(folder_path, filename)

            with open(file_path, "rb") as img_file:
                django_file = File(img_file)

                ui_asset, _ = UIAsset.objects.get_or_create(name=asset_name)
                ui_asset.image.save(filename, django_file, save=True)

            imported += 1
            self.stdout.write(self.style.SUCCESS(f"✔ Imported UI asset: {asset_name}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone! Imported {imported} UI assets."))
