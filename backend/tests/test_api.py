import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "stopfrauda-backend"


def test_contacts_welcome_flow():
    user_id = "test_user_123"
    payload = {
        "userId": user_id,
        "contacts": [
            {"name": "Mom", "phone": "+15551234567", "email": "mom@example.com"},
            {"name": "Brother", "phone": "+15557654321"}
        ]
    }
    response = client.post("/api/v1/contacts/send-welcome", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["sentCount"] == 2
    assert len(data["contacts"]) == 2

    # Fetch contacts
    get_res = client.get(f"/api/v1/users/{user_id}/contacts")
    assert get_res.status_code == 200
    saved = get_res.json()
    assert len(saved) == 2
    assert saved[0]["name"] == "Mom"


def test_alert_dispatch_and_call_log():
    user_id = "test_user_alert"
    # First save an emergency contact
    client.post("/api/v1/contacts/send-welcome", json={
        "userId": user_id,
        "contacts": [{"name": "Dad", "phone": "+15559998888"}]
    })

    # Dispatch alert
    alert_payload = {
        "userId": user_id,
        "callerNumber": "+18005559999",
        "timestamp": "2026-09-25T14:30:00Z"
    }
    response = client.post("/api/v1/alerts/dispatch", json=alert_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["alertDispatched"] is True
    assert data["dispatchedCount"] == 1

    # Check call log
    logs_res = client.get(f"/api/v1/users/{user_id}/call-logs")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) >= 1
    assert logs[0]["incomingNumber"] == "+18005559999"


def test_stripe_checkout_early_bird():
    user_id = "test_user_stripe"
    payload = {
        "userId": user_id,
        "planType": "EARLY_BIRD"
    }
    response = client.post("/api/v1/stripe/create-checkout", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "active"
    assert data["planType"] == "EARLY_BIRD"

    # Check subscription status
    sub_res = client.get(f"/api/v1/users/{user_id}/subscription")
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["status"] == "active"
    assert sub_data["planType"] == "EARLY_BIRD"
