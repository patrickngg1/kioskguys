# kiosks/views.py
from django.http import JsonResponse, HttpResponse

def health_check(request):
    return JsonResponse({"status": "ok", "message": "SmartKiosk backend running. "
    "Check out: https://kioskguys-front.onrender.com"})

def home(request):
    return HttpResponse("SmartKiosk Django Backend")
