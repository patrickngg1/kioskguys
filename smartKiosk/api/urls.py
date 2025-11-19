from django.urls import path
from . import views

urlpatterns = [
    # Create a new supply request
    path("supplies/request/", views.create_supply_request, name="create_supply_request"),

    # Get ALL categories + items (dynamic)
    path("items/", views.get_items, name="get_items"),

    # Get top popular items per category
    path("supplies/popular/", views.get_popular_items, name="get_popular_items"),
]
