from django.core.management.base import BaseCommand
from api.models import Item
from base64 import b64encode
from pathlib import Path
from PIL import Image
import io

ASSETS_DIR = Path("/Users/prakash/Desktop/dev/kioskguys/smartKiosk/src/assets")

class Command(BaseCommand):
    help = "Upload and COMPRESS item images into TiDB as Base64 (WebP)"

    def handle(self, *args, **options):
        if not ASSETS_DIR.exists():
            self.stderr.write(self.style.ERROR(f"Assets folder not found: {ASSETS_DIR}"))
            return

        updated = 0
        missing = 0

        # Try these file extensions
        exts = [".png", ".jpg", ".jpeg", ".webp"]

        for item in Item.objects.all():
            image_path = None

            # Find matching file
            for ext in exts:
                candidate = ASSETS_DIR / f"{item.name}{ext}"
                if candidate.exists():
                    image_path = candidate
                    break

            if not image_path:
                self.stdout.write(self.style.WARNING(f"No image found for '{item.name}'"))
                missing += 1
                continue

            # --- Compress + convert to WebP ---
            try:
                img = Image.open(image_path)

                # Optional: resize if huge
                max_size = 1024
                img.thumbnail((max_size, max_size), Image.LANCZOS)

                buffer = io.BytesIO()
                img.save(buffer, "webp", quality=75)
                base64_str = b64encode(buffer.getvalue()).decode("utf-8")

                # Save to TiDB
                item.image_base64 = base64_str
                item.image_mime = "image/webp"
                item.save()

                updated += 1
                self.stdout.write(self.style.SUCCESS(
                    f"Compressed & uploaded: {item.name}"
                ))

            except Exception as e:
                self.stderr.write(self.style.ERROR(
                    f"Failed to process {image_path}: {e}"
                ))

        self.stdout.write(self.style.SUCCESS(
            f"Done. {updated} items updated, {missing} missing."
        ))
