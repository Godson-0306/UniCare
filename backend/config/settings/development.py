import os

os.environ.setdefault("SECRET_KEY", "django-insecure-unicare-local-dev-secret-key")
os.environ.setdefault("DEBUG", "True")
os.environ.setdefault("DATABASE_URL", "sqlite:///db.sqlite3")
os.environ.setdefault("HOSPITAL_ACCESS_SECRET", "change-hospital-access-secret")

from .base import *  # noqa: F403, F401

DEBUG = True

# Local dev without Redis: use in-memory cache and channel layer
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = ("rest_framework.renderers.JSONRenderer",)  # noqa: F405
