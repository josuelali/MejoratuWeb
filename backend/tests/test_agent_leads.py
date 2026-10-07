import asyncio
import os

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

os.environ.setdefault("MONGO_URL", "")
import server


@pytest.fixture
def client():
    mongo_client = AsyncMongoMockClient()
    server.client = mongo_client
    server.db = mongo_client["agent_leads_test"]
    server.db_ready = True
    server.rate_buckets.clear()
    asyncio.run(server.db.agent_leads.create_index([("dedupe_key", 1)], unique=True))
    with TestClient(server.app) as test_client:
        yield test_client


VALID = {
    "first_name": "Ana María",
    "last_name": "O'Neill-García",
    "phone": "+34 600 123 456",
    "email": "qa-agent-lead@example.com",
    "privacy_consent": True,
}


def test_valid_lead_is_persisted_with_consent_metadata(client):
    response = client.post("/api/agent-leads", json=VALID)
    assert response.status_code == 201
    stored = asyncio.run(server.db.agent_leads.find_one({"email": VALID["email"]}))
    assert stored["privacy_notice_version"] == server.PRIVACY_NOTICE_VERSION
    assert stored["privacy_consent_at"].endswith("+00:00")


def test_rejects_missing_consent_and_invalid_phone(client):
    no_consent = {**VALID, "privacy_consent": False}
    assert client.post("/api/agent-leads", json=no_consent).status_code == 422
    invalid_phone = {**VALID, "email": "other@example.com", "phone": "abc"}
    assert client.post("/api/agent-leads", json=invalid_phone).status_code == 422


def test_rejects_duplicate_lead(client):
    assert client.post("/api/agent-leads", json=VALID).status_code == 201
    assert client.post("/api/agent-leads", json=VALID).status_code == 409
