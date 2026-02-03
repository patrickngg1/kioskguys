import os
from django.conf import settings
from django.http import JsonResponse

def get_ui_assets(request):
    folder = os.path.join(settings.MEDIA_ROOT, "ui_assets")
    files = os.listdir(folder)

    # Build a dictionary mapping filenames -> full URLs
    assets = {}

    for f in files:
        name = os.path.splitext(f)[0]  # "logo" from logo.png
        url = request.build_absolute_uri(
            settings.MEDIA_URL + "ui_assets/" + f
        )
        assets[name] = url

    return JsonResponse({"ui_assets": assets})
