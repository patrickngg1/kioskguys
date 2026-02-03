from django.core.management.base import BaseCommand
from django.db import transaction, connections, close_old_connections
from api.models import Category, Item
import time


class Command(BaseCommand):
    help = "Seed initial supply categories and items for the kiosk (TiDB safe)"

    def handle(self, *args, **options):
        self.stdout.write("Starting TiDB-safe seeding...")

        # ----------------------------------------------------
        # Categories
        # ----------------------------------------------------
        categories = {
            "Storage Closet": "closet",
            "Break Room": "break",
            "K-Cups": "kcup",
        }

        category_objects = {}

        close_old_connections()  # prevent stale connections

        for name, key in categories.items():
            cat, _ = Category.objects.get_or_create(
                key=key,
                defaults={"name": name},
            )
            if cat.name != name:
                cat.name = name
                cat.save()

            category_objects[key] = cat

        self.stdout.write("✓ Categories seeded.")

        # ----------------------------------------------------
        # Items by category
        # ----------------------------------------------------
        storage_closet_items = [
            "Kleenex", "AA Batteries", "Ultra Fine Point Permanent Marker",
            "Regular Permanent Marker", "Finepoint Permanent Marker",
            "Black Ballpoint Pen", "Blue Ballpoint Pen",
            "Standard Paper Clips", "Jumbo Paper Clips", "Staplers",
            "Blue Dry Erase Markers", "Red Dry Erase Markers",
            "Black Dry Erase Markers", "Whiteboard Spray", "Scissors",
            "Yellow Highlighters", "Orange Highlighters", "Pink Highlighters",
            "Microfiber Cloth", "Micro Binder Clips", "Medium Binder Clips",
            "Large Binder Clips", "Rubber Bands", "Pencils",
            "Mechanical Pencil Lead", "Spray Bottles", "All Purpose Cleaner",
            "Dry Eraser", "Copy Paper", "Dolly",
        ]

        break_room_items = [
            "Coffee Cups", "Coffee Lids", "Stir Sticks", "Sugar Packets",
            "Sugar Container", "Coffee Creamer", "Napkins", "Plates",
            "Trash Bags", "Small Trash Bags", "Plastic Spoons", "Plastic Forks",
            "Plastic Knives", "Paper Roll", "Water Filters", "Dish Soap",
        ]

        k_cup_items = [
            "Cafe Bustelo", "Dark Magic", "Breakfast Blend",
            "Breakfast Blend Decaf", "Green Tea",
        ]

        # ----------------------------------------------------
        # SAFE batch insertion method
        # ----------------------------------------------------
        def seed_items(batch, category_key):
            cat = category_objects[category_key]

            # break into small balanced chunks
            for i in range(0, len(batch), 5):  # 5 items per commit
                chunk = batch[i:i+5]

                close_old_connections()  # important for TiDB

                with transaction.atomic():
                    for name in chunk:
                        Item.objects.get_or_create(name=name, category=cat)

                # tiny delay helps with TiDB throttling
                time.sleep(0.3)

        seed_items(storage_closet_items, "closet")
        self.stdout.write("✓ Storage Closet items done.")

        seed_items(break_room_items, "break")
        self.stdout.write("✓ Break Room items done.")

        seed_items(k_cup_items, "kcup")
        self.stdout.write("✓ K-Cups items done.")

        self.stdout.write(self.style.SUCCESS("🎉 ALL ITEMS SEEDED SUCCESSFULLY"))
