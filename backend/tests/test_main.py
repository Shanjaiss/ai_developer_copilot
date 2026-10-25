from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_welcome():
    """Verify GET / returns 200 with the welcome message and metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "Welcome to AI Developer Copilot API"
    assert data["status"] == "online"
    assert data["version"] == "0.1.0"
    assert data["service"] == "ai-developer-copilot-backend"
    assert data["docs_url"] == "/docs"


def test_get_health():
    """Verify GET /health returns 200 with health status and timestamp."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-developer-copilot-backend"
    assert data["version"] == "0.1.0"
    assert "environment" in data
    assert "timestamp" in data


def test_cors_headers():
    """Verify CORS headers are returned for allowed origins."""
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_preview_and_get():
    """Verify CORS headers on GET requests and preview port 4173."""
    response = client.get(
        "/health",
        headers={"Origin": "http://localhost:4173"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:4173"


def test_cors_disallowed_origin():
    """Verify CORS headers are not returned for unauthorized origins."""
    response = client.get(
        "/health",
        headers={"Origin": "http://malicious-website.com"},
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
