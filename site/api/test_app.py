"""tinypeek's API, with the account service played by kitapi.testing (no network, no real accounts).
uv run --directory api pytest
"""
import pytest
from fastapi.testclient import TestClient
from kitapi.testing import Accounts

from app import app

client = TestClient(app, base_url="https://tinypeek.tinymachines.ai")


@pytest.fixture(autouse=True)
def accounts(monkeypatch):
    return Accounts({"ka=good": ("u_123", "brad")}, site="https://tinypeek.tinymachines.ai").install(monkeypatch)


def test_the_base_routes():
    assert client.get("/api/v1/health").json() == {"ok": True, "app": "tinypeek"}
    a = client.get("/api/v1/about").json()
    assert (a["id"], a["name"], a["site"], a["api"]) == ("tinypeek", "tinypeek", "https://tinypeek.tinymachines.ai", {"port": 8200})
    assert client.get("/api/v1/whoami").json() == {"signed_in": False}
    assert client.get("/api/v1/whoami", headers={"cookie": "ka=good"}).json()["handle"] == "brad"
