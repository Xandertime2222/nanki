import pytest
from httpx import AsyncClient, ASGITransport
from nanki_core.app import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "nanki-core"
    assert "version" in data


@pytest.mark.asyncio
async def test_app_metadata():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.json()["service"] == "nanki-core"