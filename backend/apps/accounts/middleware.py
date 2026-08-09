import ipaddress

from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

from apps.core.responses import error_payload


def error_response(message: str, status: int = 400, code: int | str | None = None):
    return JsonResponse(error_payload(message, code=code or status), status=status)

class HospitalNetworkAccessMiddleware(MiddlewareMixin):
  """Restrict hospital API routes to authorized networks and access tokens."""

  def process_request(self, request):
    path = request.path
    if not self._is_hospital_route(path):
      return None

    if self._is_exempt_auth_route(path):
      return None

    if settings.HOSPITAL_NETWORK_ENFORCEMENT:
      client_ip = self._get_client_ip(request)
      if not self._ip_allowed(client_ip):
        return error_response(
          "Hospital system access denied: unauthorized network.",
          status=403,
          code="network_denied",
        )

    if not self._has_hospital_access_token(request):
      return error_response(
        "Hospital system access denied: missing access token.",
        status=403,
        code="missing_hospital_access_token",
      )

    return None

  def _is_hospital_route(self, path: str) -> bool:
    return any(path.startswith(prefix) for prefix in settings.HOSPITAL_API_PREFIXES)

  def _is_exempt_auth_route(self, path: str) -> bool:
    exempt = (
      "/api/v1/auth/login/",
      "/api/v1/auth/student/login/",
      "/api/v1/auth/workstation/login/",
      "/api/v1/auth/admin/login/",
      "/api/v1/auth/token/refresh/",
    )
    return any(path.startswith(route) for route in exempt)

  def _get_client_ip(self, request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
      return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")

  def _ip_allowed(self, client_ip: str) -> bool:
    if not client_ip:
      return False
    try:
      ip = ipaddress.ip_address(client_ip)
    except ValueError:
      return False

    for cidr in settings.HOSPITAL_ALLOWED_IP_RANGES:
      try:
        if ip in ipaddress.ip_network(cidr, strict=False):
          return True
      except ValueError:
        continue
    return False

  def _has_hospital_access_token(self, request) -> bool:
    header = settings.HOSPITAL_ACCESS_HEADER
    token = request.headers.get(header) or request.META.get(f"HTTP_{header.upper().replace('-', '_')}")
    return bool(token and token == settings.HOSPITAL_ACCESS_SECRET)
