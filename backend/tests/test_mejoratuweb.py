"""Backend tests for MejoraTuWeb - covers all endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
# Tests use the public preview URL via REACT_APP_BACKEND_URL set in frontend/.env
if "REACT_APP_BACKEND_URL" not in os.environ:
    # Read from frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Health ---
class TestHealth:
    def test_health_ok(self, client):
        r = client.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# --- Quick Scan ---
class TestQuickScan:
    def test_quick_scan_example(self, client):
        r = client.post(f"{API}/quick-scan", json={"url": "https://example.com"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "score" in data and isinstance(data["score"], int)
        assert 0 <= data["score"] <= 100
        assert "checks" in data and isinstance(data["checks"], list)
        assert len(data["checks"]) == 12, f"Expected 12 checks, got {len(data['checks'])}"
        assert "response_time" in data
        assert "is_https" in data and data["is_https"] is True
        # Each check has the expected structure
        for c in data["checks"]:
            assert "name" in c and "passed" in c and "detail" in c and "points" in c

    def test_quick_scan_empty_url_returns_400(self, client):
        r = client.post(f"{API}/quick-scan", json={"url": ""}, timeout=15)
        assert r.status_code == 400

    def test_quick_scan_normalizes_url(self, client):
        # Should add https:// prefix
        r = client.post(f"{API}/quick-scan", json={"url": "example.com"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["url"].startswith("https://")


# --- Analyze ---
class TestAnalyze:
    def test_analyze_fallback_heuristic(self, client):
        """Without OPENAI_API_KEY the endpoint must fall back gracefully."""
        r = client.post(f"{API}/analyze", json={"url": "https://example.com"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "analysis_id" in data
        assert data["analysis_id"].startswith("analysis_")
        assert "result" in data
        result = data["result"]
        # All required fields must be present
        for key in ["score", "errors", "opportunities", "summary",
                    "seo_score", "performance_score", "security_score",
                    "ux_score", "recommendations"]:
            assert key in result, f"Missing key {key} in result"
        assert isinstance(result["errors"], list)
        assert isinstance(result["opportunities"], list)
        assert isinstance(result["recommendations"], list)
        assert isinstance(result["score"], int)


# --- Payments ---
class TestPayments:
    def test_create_checkout_returns_stripe_url(self, client):
        r = client.post(f"{API}/payments/create-checkout",
                        json={"origin_url": "https://mejoratuweb.org"}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data
        assert data["url"] == "https://buy.stripe.com/28EbJ27u1dhE8wp5He63K01"


# --- Email ---
class TestEmail:
    def test_email_subscribe(self, client):
        r = client.post(f"{API}/email/subscribe",
                        json={"email": "TEST_user@example.com"}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "message" in data


# --- CORS ---
class TestCORS:
    @pytest.mark.parametrize("origin", [
        "https://mejoratuweb.org",
        "https://mejoratuweb.onrender.com",
    ])
    def test_cors_allowed_origins(self, client, origin):
        r = client.options(f"{API}/health",
                           headers={"Origin": origin,
                                    "Access-Control-Request-Method": "GET"},
                           timeout=15)
        # Must succeed and echo the origin
        assert r.status_code in (200, 204), r.text
        allow = r.headers.get("access-control-allow-origin", "")
        assert allow == origin or allow == "*", f"Origin {origin} not allowed: got '{allow}'"
