from __future__ import annotations


def test_health_endpoint_reports_database_status(client):
    response = client.get("/health")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["database"] == "ok"
    assert payload["environment"]
