# kiosks/views.py
from django.http import JsonResponse, HttpResponse

def health_check(request):
    return JsonResponse({"status": "ok", "message": "SmartKiosk backend running"})

def home(request):
    return HttpResponse("SmartKiosk Django Backend")
