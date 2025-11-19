from django.core.management.base import BaseCommand
from api.models import Category, Item


class Command(BaseCommand):
    help = "Seed initial supply categories and items for the kiosk"

    def handle(self, *args, **options):
        # Define your categories and their machine keys
        categories = {
            "Storage Closet": "closet",
            "Break Room": "break",
            "K-Cups": "kcup",
        }

        # Create categories (or get existing)
        category_objects = {}
        for name, key in categories.items():
            cat, _ = Category.objects.get_or_create(
                key=key,
                defaults={"name": name},
            )
            # If the key existed but name changed, keep them in sync
            if cat.name != name:
                cat.name = name
                cat.save()
            category_objects[key] = cat

        # ------- Items for each category -------

        storage_closet_items = [
            "Kleenex",
            "AA Batteries",
            "Ultra Fine Point Permanent Marker",
            "Regular Permanent Marker",
            "Finepoint Permanent Marker",
            "Black Ballpoint Pen",
            "Blue Ballpoint Pen",
            "Standard Paper Clips",
            "Jumbo Paper Clips",
            "Staplers",
            "Blue Dry Erase Markers",
            "Red Dry Erase Markers",
            "Black Dry Erase Markers",
            "Whiteboard Spray",
            "Scissors",
            "Yellow Highlighters",
            "Orange Highlighters",
            "Pink Highlighters",
            "Microfiber Cloth",
            "Micro Binder Clips",
            "Medium Binder Clips",
            "Large Binder Clips",
            "Rubber Bands",
            "Pencils",
            "Mechanical Pencil Lead",
            "Spray Bottles",
            "All Purpose Cleaner",
            "Dry Eraser",
            "Copy Paper",
            "Dolly",
        ]

        break_room_items = [
            "Coffee Cups",
            "Coffee Lids",
            "Stir Sticks",
            "Sugar Packets",
            "Sugar Container",
            "Coffee Creamer",
            "Napkins",
            "Plates",
            "Trash Bags",
            "Small Trash Bags",
            "Plastic Spoons",
            "Plastic Forks",
            "Plastic Knives",
            "Paper Roll",
            "Water Filters",
            "Dish Soap",
        ]

        k_cup_items = [
            "Cafe Bustelo",
            "Dark Magic",
            "Breakfast Blend",
            "Breakfast Blend Decaf",
            "Green Tea",
        ]

        # Helper to create items
        def create_items(names, category_key):
            cat = category_objects[category_key]
            for name in names:
                Item.objects.get_or_create(
                    name=name,
                    category=cat,
                )

        create_items(storage_closet_items, "closet")
        create_items(break_room_items, "break")
        create_items(k_cup_items, "kcup")

        self.stdout.write(self.style.SUCCESS("✅ Seeded categories and supply items."))
