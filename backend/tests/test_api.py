import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_twilio_sms():
    with patch("app.services.twilio_service.twilio_service._send_sms") as mock_send:
        mock_send.return_value = {"success": True, "sid": "SM_test_mock", "simulated": True}
        yield mock_send


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


def test_multilingual_sms_generation():
    from app.services.twilio_service import twilio_service

    with patch.object(twilio_service, "_send_sms") as mock_send:
        mock_send.return_value = {"success": True, "sid": "SM_123", "simulated": True}

        # Test Romanian (default)
        twilio_service.send_welcome_sms("Ion", "+40722111222", "Maria", lang="ro")
        args_ro = mock_send.call_args[0]
        assert "Notificare StopFrauda" in args_ro[1]
        assert "Gardian de Urgență" in args_ro[1]

        # Test English
        twilio_service.send_welcome_sms("John", "+15551234567", "Mary", lang="en")
        args_en = mock_send.call_args[0]
        assert "StopFrauda Notice" in args_en[1]
        assert "Emergency Guardian" in args_en[1]

        # Test Fraud alert Romanian
        twilio_service.send_unknown_call_alert("+40722111222", "Ion", "+40788999000", "Maria", lang="ro")
        alert_ro = mock_send.call_args[0]
        assert "ALERTĂ FRAUDĂ StopFrauda" in alert_ro[1]
        assert "NECUNOSCUT" in alert_ro[1]

        # Test Fraud alert English
        twilio_service.send_unknown_call_alert("+15551234567", "John", "+18005550199", "Mary", lang="en")
        alert_en = mock_send.call_args[0]
        assert "StopFrauda FRAUD ALERT" in alert_en[1]
        assert "UNKNOWN number" in alert_en[1]


def test_personalized_user_name_dispatch():
    from app.services.twilio_service import twilio_service

    with patch.object(twilio_service, "_send_sms") as mock_send:
        mock_send.return_value = {"success": True, "sid": "SM_personalized", "simulated": True}

        # Dispatch welcome SMS with specific userName
        client.post("/api/v1/contacts/send-welcome", json={
            "userId": "usr_personalized_1",
            "userName": "Elena Popescu",
            "lang": "ro",
            "contacts": [{"name": "Mihai", "phone": "+40722333444"}]
        })
        args = mock_send.call_args[0]
        assert "Elena Popescu" in args[1]
        assert "Notificare StopFrauda" in args[1]

        # Dispatch alert with specific userName
        client.post("/api/v1/alerts/dispatch", json={
            "userId": "usr_personalized_1",
            "userName": "Elena Popescu",
            "callerNumber": "+40799888777",
            "timestamp": "2026-09-26T21:00:00Z",
            "lang": "ro"
        })
        alert_args = mock_send.call_args[0]
        assert "Elena Popescu" in alert_args[1]
        assert "ALERTĂ FRAUDĂ StopFrauda" in alert_args[1]


