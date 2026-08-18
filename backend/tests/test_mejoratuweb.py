import asyncio
import os
from datetime import datetime, timezone, timedelta

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

os.environ.update({
    "MONGO_URL": "",
    "PAYMENTS_ENABLED": "true",
    "STRIPE_SECRET_KEY": "sk_test_phase_a",
    "STRIPE_WEBHOOK_SECRET": "whsec_phase_a",
    "STRIPE_PRICE_ID": "price_phase_a_699",
    "STRIPE_EXPECTED_AMOUNT": "699",
    "STRIPE_CURRENCY": "eur",
    "FRONTEND_URL": "http://localhost:3000",
    "REPORT_TOKEN_SECRET": "phase-a-test-secret-not-for-production-123456",
})

import server

ORIGINAL_VALIDATE_PUBLIC_URL = server.validate_public_url


def run(coroutine):
    return asyncio.run(coroutine)


@pytest.fixture(autouse=True)
def isolated_services(monkeypatch):
    mongo_client = AsyncMongoMockClient()
    server.client = mongo_client
    server.db = mongo_client["mejoratuweb_test"]
    server.db_ready = True
    server.PAYMENTS_ENABLED = True
    server.rate_buckets.clear()

    async def allow_test_url(url):
        return server.normalize_url(url)

    async def fake_quick_scan(req, request):
        return {
            "url": server.normalize_url(req.url),
            "score": 61,
            "checks": [
                {"name": "HTTPS", "passed": True, "detail": "OK", "points": 15},
                {"name": "Meta", "passed": False, "detail": "Falta", "points": 0},
            ],
        }

    monkeypatch.setattr(server, "validate_public_url", allow_test_url)
    monkeypatch.setattr(server, "quick_scan", fake_quick_scan)
    yield


@pytest.fixture
def client():
    with TestClient(server.app) as test_client:
        yield test_client


def create_analysis(client):
    response = client.post("/api/analyze", json={"url": "https://example.com"})
    assert response.status_code == 200, response.text
    return response.json()


def checkout_session(analysis_id, session_id="cs_test_phase_a", **overrides):
    session = {
        "id": session_id,
        "url": "https://checkout.stripe.test/session",
        "client_reference_id": analysis_id,
        "metadata": {"analysis_id": analysis_id},
        "payment_status": "paid",
        "amount_total": 699,
        "currency": "eur",
        "line_items": {"data": [{"price": {"id": "price_phase_a_699"}}]},
        "customer_details": {"email": "buyer@example.com"},
    }
    session.update(overrides)
    return session


def start_checkout(client, monkeypatch, analysis_id, session_id="cs_test_phase_a"):
    session = checkout_session(analysis_id, session_id=session_id)

    async def fake_create(**kwargs):
        assert kwargs["client_reference_id"] == analysis_id
        assert kwargs["metadata"]["analysis_id"] == analysis_id
        assert kwargs["line_items"][0]["price"] == "price_phase_a_699"
        return session

    monkeypatch.setattr(server, "create_stripe_session", fake_create)
    response = client.post("/api/payments/create-checkout", json={
        "analysis_id": analysis_id,
        "origin_url": "http://localhost:3000",
    })
    assert response.status_code == 200, response.text
    return session


def deliver_webhook(client, monkeypatch, session, event_id="evt_phase_a"):
    event = {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {"object": session},
    }
    monkeypatch.setattr(server.stripe.Webhook, "construct_event", lambda *args: event)

    async def fake_retrieve(session_id):
        assert session_id == session["id"]
        return session

    monkeypatch.setattr(server, "retrieve_stripe_session", fake_retrieve)
    return client.post(
        "/api/payments/webhook",
        content=b"{}",
        headers={"stripe-signature": "valid_test_signature"},
    )


def test_health_and_readiness_are_separate(client):
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/ready").status_code == 200
    server.db = None
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/ready").status_code == 503


def test_readiness_allows_disabled_payments_with_healthy_mongodb(client, monkeypatch):
    monkeypatch.setattr(server, "PAYMENTS_ENABLED", False)
    response = client.get("/api/ready")
    assert response.status_code == 200
    assert response.json()["payments"] == "disabled"


def test_readiness_rejects_incomplete_stripe_when_payments_enabled(client, monkeypatch):
    monkeypatch.setattr(server, "PAYMENTS_ENABLED", True)
    monkeypatch.setenv("STRIPE_PRICE_ID", "")
    response = client.get("/api/ready")
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["status"] == "not_ready_for_payments"
    assert detail["payments"] == "not_ready"


def test_free_response_never_contains_premium(client):
    data = create_analysis(client)
    assert data["is_premium"] is False
    assert "errors" not in data["result"]
    assert "opportunities" not in data["result"]
    assert "recommendations" not in data["result"]
    stored = run(server.db.analyses.find_one({"analysis_id": data["analysis_id"]}))
    assert stored["result"]["errors"]
    assert stored["payment_status"] == "unpaid"


def test_premium_and_pdf_data_are_blocked_without_payment(client):
    analysis = create_analysis(client)
    path = f"/api/reports/{analysis['analysis_id']}"
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"Authorization": "Bearer paid=true"}).status_code == 403


def test_checkout_links_the_correct_analysis(client, monkeypatch):
    analysis = create_analysis(client)
    session = start_checkout(client, monkeypatch, analysis["analysis_id"])
    stored = run(server.db.analyses.find_one({"analysis_id": analysis["analysis_id"]}))
    assert stored["stripe_session_id"] == session["id"]
    assert stored["payment_status"] == "checkout_started"


def test_cancelled_or_failed_checkout_does_not_unlock(client, monkeypatch):
    analysis = create_analysis(client)
    session = start_checkout(client, monkeypatch, analysis["analysis_id"])
    status = client.get(f"/api/payments/status/{session['id']}")
    assert status.status_code == 200
    assert status.json()["payment_status"] == "checkout_started"
    assert client.get(f"/api/reports/{analysis['analysis_id']}", headers={"Authorization": "Bearer fake"}).status_code == 403


def test_false_webhook_signature_is_rejected(client, monkeypatch):
    def reject(*args):
        raise server.stripe.error.SignatureVerificationError("bad", "sig")

    monkeypatch.setattr(server.stripe.Webhook, "construct_event", reject)
    response = client.post("/api/payments/webhook", content=b"{}", headers={"stripe-signature": "fake"})
    assert response.status_code == 400


def test_valid_payment_unlocks_exactly_one_analysis(client, monkeypatch):
    analysis = create_analysis(client)
    session = start_checkout(client, monkeypatch, analysis["analysis_id"])
    response = deliver_webhook(client, monkeypatch, session)
    assert response.status_code == 200, response.text
    stored = run(server.db.analyses.find_one({"analysis_id": analysis["analysis_id"]}))
    assert stored["payment_status"] == "paid"
    assert stored["email"] == "buyer@example.com"
    assert run(server.db.analyses.count_documents({"payment_status": "paid"})) == 1


def test_duplicate_webhook_is_idempotent(client, monkeypatch):
    analysis = create_analysis(client)
    session = start_checkout(client, monkeypatch, analysis["analysis_id"])
    first = deliver_webhook(client, monkeypatch, session, "evt_duplicate")
    second = deliver_webhook(client, monkeypatch, session, "evt_duplicate")
    assert first.json()["processed"] is True
    assert second.json()["duplicate"] is True
    assert run(server.db.stripe_events.count_documents({"event_id": "evt_duplicate"})) == 1


@pytest.mark.parametrize("override", [
    {"amount_total": 799},
    {"currency": "usd"},
    {"line_items": {"data": [{"price": {"id": "price_wrong"}}]}},
])
def test_wrong_amount_currency_or_price_is_rejected(client, monkeypatch, override):
    analysis = create_analysis(client)
    session = start_checkout(client, monkeypatch, analysis["analysis_id"], f"cs_test_wrong_{len(str(override))}")
    session.update(override)
    response = deliver_webhook(client, monkeypatch, session, f"evt_wrong_{len(str(override))}")
    assert response.status_code == 400
    stored = run(server.db.analyses.find_one({"analysis_id": analysis["analysis_id"]}))
    assert stored["payment_status"] != "paid"


def test_paid_report_requires_valid_unexpired_token(client, monkeypatch):
    analysis = create_analysis(client)
    session = start_checkout(client, monkeypatch, analysis["analysis_id"])
    assert deliver_webhook(client, monkeypatch, session).status_code == 200
    status = client.get(f"/api/payments/status/{session['id']}")
    assert status.status_code == 200
    token = status.json()["access_token"]
    path = f"/api/reports/{analysis['analysis_id']}"
    assert client.get(path, headers={"Authorization": "Bearer wrong"}).status_code == 403
    premium = client.get(path, headers={"Authorization": f"Bearer {token}"})
    assert premium.status_code == 200
    assert premium.json()["is_premium"] is True
    assert premium.json()["result"]["errors"]

    run(server.db.analyses.update_one(
        {"analysis_id": analysis["analysis_id"]},
        {"$set": {"access_token_expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)}},
    ))
    assert client.get(path, headers={"Authorization": f"Bearer {token}"}).status_code == 403


def test_restart_does_not_lose_analysis(client):
    analysis = create_analysis(client)
    server.db_ready = False
    assert run(server.mongo_is_ready()) is True
    stored = run(server.db.analyses.find_one({"analysis_id": analysis["analysis_id"]}))
    assert stored is not None


@pytest.mark.parametrize("url", [
    "http://localhost",
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]",
])
def test_ssrf_private_and_metadata_destinations_are_blocked(url):
    with pytest.raises(server.HTTPException) as error:
        run(ORIGINAL_VALIDATE_PUBLIC_URL(url))
    assert error.value.status_code == 400


def test_sensitive_query_parameters_are_removed_from_logs():
    sanitized = server.safe_url_for_logs(
        "https://example.com/report?session_id=cs_test_sensitive&token=premium_sensitive#private"
    )
    assert sanitized == "https://example.com/report"
    assert "session_id" not in sanitized
    assert "token" not in sanitized


def test_secrets_are_not_returned(client):
    analysis = create_analysis(client)
    serialized = str(analysis)
    assert "sk_test_phase_a" not in serialized
    assert "whsec_phase_a" not in serialized
    assert "price_phase_a_699" not in serialized


def test_cors_rejects_unlisted_origins(client):
    allowed = client.options(
        "/api/health",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
    )
    denied = client.options(
        "/api/health",
        headers={"Origin": "https://evil.vercel.app", "Access-Control-Request-Method": "GET"},
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "access-control-allow-origin" not in denied.headers


def test_rate_limit_blocks_repeated_sensitive_requests(client, monkeypatch):
    monkeypatch.setattr(server, "RATE_LIMIT_REQUESTS", 2)
    assert client.get("/api/payments/status/not-a-session").status_code == 400
    assert client.get("/api/payments/status/not-a-session").status_code == 400
    assert client.get("/api/payments/status/not-a-session").status_code == 429
