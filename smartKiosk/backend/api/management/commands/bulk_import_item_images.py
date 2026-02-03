import os
from django.core.management.base import BaseCommand
from django.core.files import File
from api.models import Item
from django.conf import settings


class Command(BaseCommand):
    help = "Bulk import item images from local assets folder."

    def add_arguments(self, parser):
        parser.add_argument(
            '--path',
            type=str,
            required=True,
            help='Path to the folder containing item images (PNG/JPG).'
        )

    def handle(self, *args, **options):
        folder_path = options['path']

        if not os.path.isdir(folder_path):
            self.stdout.write(self.style.ERROR(f"Invalid folder: {folder_path}"))
            return

        # Supported image extensions
        valid_exts = ['.png', '.jpg', '.jpeg']

        files = [
            f for f in os.listdir(folder_path)
            if os.path.splitext(f)[1].lower() in valid_exts
        ]

        if not files:
            self.stdout.write(self.style.WARNING("No PNG/JPG images found."))
            return

        self.stdout.write(f"Found {len(files)} image files.\n")

        imported = 0
        skipped = 0

        for filename in files:
            base, ext = os.path.splitext(filename)
            item_name = base.replace("_", " ").strip()    # Clean up filename → match DB

            try:
                item = Item.objects.get(name=item_name)
            except Item.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"❌ No item matching: {item_name}"))
                skipped += 1
                continue

            file_path = os.path.join(folder_path, filename)

            # Open the file as Django File object
            with open(file_path, 'rb') as img_file:
                django_file = File(img_file)

                # Auto-rename upload to <ItemName>.<ext>
                safe_name = item.name.replace(" ", "_")
                new_filename = f"{safe_name}{ext.lower()}"

                item.image.save(new_filename, django_file, save=True)

            self.stdout.write(self.style.SUCCESS(f"✔ Imported image for: {item_name}"))
            imported += 1

        self.stdout.write("\n-------- SUMMARY --------")
        self.stdout.write(self.style.SUCCESS(f"Imported: {imported} images"))
        self.stdout.write(self.style.WARNING(f"Skipped: {skipped} files"))
        self.stdout.write("-------------------------")
