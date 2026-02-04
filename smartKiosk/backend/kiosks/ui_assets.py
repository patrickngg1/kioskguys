from django.http import JsonResponse
from django.templatetags.static import static
from django.views.decorators.http import require_GET
from django.conf import settings
from pathlib import Path

@require_GET
def get_ui_assets(request):
    folder = Path(settings.BASE_DIR) / "static" / "ui_assets"

    assets = {}
    if folder.exists():
        for p in folder.iterdir():
            if p.is_file():
                key = p.stem  # "favicon-32x32"
                assets[key] = request.build_absolute_uri(
                    static(f"ui_assets/{p.name}")
                )

    return JsonResponse({"ok": True, "assets": assets}, status=200)
