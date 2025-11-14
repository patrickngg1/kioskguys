"""
Django settings for kiosks project.
"""

from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-!uu)_)22cl-rk2f2wv!k(5%0shlio@%xqw!^(a%b$3d1pn9rwv'
DEBUG = True
ALLOWED_HOSTS = ['127.0.0.1', 'localhost']

# ---------------------------------------------------------
# INSTALLED APPS
# ---------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',

    'crispy_forms',
    'crispy_bootstrap5',

    'main.apps.MainConfig',
    'corsheaders',
    'kiosks',
    'accounts',

    'rest_framework',
    'rest_framework_simplejwt',
]

# ---------------------------------------------------------
# MIDDLEWARE
# ---------------------------------------------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # MUST BE FIRST
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',

    # CSRF still allowed—our login/register uses @csrf_exempt
    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ---------------------------------------------------------
# CORS SETTINGS (Corrected)
# ---------------------------------------------------------
CORS_ALLOW_CREDENTIALS = True   # allow cookies!
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

# Remove allow-all-origins — it BREAKS cookies
# CORS_ALLOW_ALL_ORIGINS = True  # ❌ REMOVE THIS

# ---------------------------------------------------------
# URL CONF
# ---------------------------------------------------------
ROOT_URLCONF = 'kiosks.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'kiosks.wsgi.application'

# ---------------------------------------------------------
# DATABASE (TiDB)
# ---------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'test',
        'USER': '3hps72F5SkXUDHH.root',
        'PASSWORD': 'Ypqr0JFtUtjJSo62',
        'HOST': 'gateway01.us-east-1.prod.aws.tidbcloud.com',
        'PORT': 4000,
        'OPTIONS': {
            'ssl': {
                'ca': str(BASE_DIR / 'isrgrootx1.pem'),
                'ssl_mode': 'VERIFY_IDENTITY',
            },
        },
    },
}

# ---------------------------------------------------------
# PASSWORDS
# ---------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------
# INTERNATIONALIZATION
# ---------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------
# STATIC
# ---------------------------------------------------------
STATIC_URL = 'static/'

# ---------------------------------------------------------
# DRF + SIMPLE JWT (works alongside sessions)
# ---------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
