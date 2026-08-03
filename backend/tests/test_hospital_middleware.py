from django.test import RequestFactory, override_settings

from apps.accounts.middleware import HospitalNetworkAccessMiddleware


def _middleware_response(path, remote_addr="203.0.113.5", token=None):
    factory = RequestFactory()
    headers = {}
    if token:
        headers["HTTP_X_HOSPITAL_ACCESS_TOKEN"] = token
    request = factory.get(path, REMOTE_ADDR=remote_addr, **headers)
    return HospitalNetworkAccessMiddleware(lambda req: None).process_request(request)


@override_settings(
    HOSPITAL_API_PREFIXES=("/api/v1/appointments/",),
    HOSPITAL_ALLOWED_IP_RANGES=("10.0.0.0/8",),
    HOSPITAL_ACCESS_SECRET="secret",
)
def test_hospital_middleware_denies_appointments_from_public_network():
    response = _middleware_response("/api/v1/appointments/")

    assert response.status_code == 403


@override_settings(
    HOSPITAL_API_PREFIXES=("/api/v1/appointments/",),
    HOSPITAL_ALLOWED_IP_RANGES=("10.0.0.0/8",),
    HOSPITAL_ACCESS_SECRET="secret",
)
def test_hospital_middleware_allows_authorized_hospital_request():
    response = _middleware_response("/api/v1/appointments/", remote_addr="10.1.2.3", token="secret")

    assert response is None
