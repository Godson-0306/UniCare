from .base import *  # noqa: F403, F401

DEBUG = False

if HOSPITAL_ACCESS_SECRET == "change-hospital-access-secret":  # noqa: F405
    raise RuntimeError("HOSPITAL_ACCESS_SECRET must be set for production.")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Render terminates TLS at the edge and probes health checks over HTTP on $PORT.
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
