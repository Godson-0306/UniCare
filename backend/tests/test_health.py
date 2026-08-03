import pytest


@pytest.mark.django_db
def test_health_endpoint_returns_envelope(api_client):
    response = api_client.get("/api/v1/health/")

    assert response.status_code in (200, 503)
    assert "success" in response.data
