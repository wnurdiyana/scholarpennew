"""ManuscriptForge backend tests — pytest suite.

Covers: health, auth (JWT + Google), manuscripts CRUD, section generation,
references (Crossref), and exports (md/docx/pdf).
"""
import os
import time
import uuid

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@manuscriptforge.app"
DEMO_PASSWORD = "Demo123!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(session):
    """Login as the seeded demo user; fall back to register if needed."""
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    if r.status_code != 200:
        # Try register as fallback
        r2 = session.post(
            f"{API}/auth/register",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD, "name": "Demo User"},
        )
        assert r2.status_code in (200, 400), f"register fallback failed: {r2.status_code} {r2.text}"
        if r2.status_code == 200:
            return r2.json()["token"]
        # account exists but wrong pwd — skip
        pytest.skip(f"Demo login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def manuscript_id(session, auth_headers):
    payload = {
        "inputs": {
            "title": "TEST_ Hybrid Wind-Wave Energy Forecasting via Deep Learning",
            "field": "Marine Renewable Energy",
            "abstract_idea": "Predict combined wind-wave power output using LSTM and Transformer ensembles.",
            "objectives": "Improve forecast horizon to 72h; reduce RMSE by 20% vs ARIMA baseline.",
            "methodology": "Hybrid LSTM-Transformer with attention; trained on ERA5 reanalysis 2010-2024.",
            "findings": "RMSE 0.082 MW; R^2 0.94; 22% improvement vs baseline.",
            "citation_style": "APA",
        }
    }
    r = session.post(f"{API}/manuscripts", json=payload, headers=auth_headers)
    assert r.status_code == 200, f"create manuscript failed: {r.status_code} {r.text}"
    return r.json()["manuscript_id"]


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "sections" in data and len(data["sections"]) == 20


# ---------- Auth ----------
class TestAuth:
    def test_register_new_user(self, session):
        email = f"test_{uuid.uuid4().hex[:8]}@manuscriptforge.app"
        r = session.post(
            f"{API}/auth/register",
            json={"email": email, "password": "TestPass123!", "name": "TEST User"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str)
        assert data["user"]["email"] == email
        assert data["user"]["auth_provider"] == "password"

    def test_register_duplicate(self, session):
        r = session.post(
            f"{API}/auth/register",
            json={"email": DEMO_EMAIL, "password": "Demo123!", "name": "x"},
        )
        assert r.status_code == 400

    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == DEMO_EMAIL

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_authorized(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == DEMO_EMAIL
        assert "user_id" in data

    def test_me_unauthorized(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self, session, auth_headers):
        r = session.post(f"{API}/auth/logout", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_google_session_bad_id(self, session):
        r = session.post(
            f"{API}/auth/google/session",
            json={"session_id": f"invalid-session-{uuid.uuid4().hex}"},
        )
        # Should fail with 401 (invalid) or 502 (upstream bad); not 200
        assert r.status_code in (401, 502), f"unexpected status: {r.status_code} {r.text}"


# ---------- Manuscripts CRUD ----------
class TestManuscriptsCRUD:
    def test_create_manuscript_has_20_sections(self, session, auth_headers):
        payload = {
            "inputs": {
                "title": "TEST_ Sample Manuscript",
                "field": "Engineering",
                "citation_style": "APA",
            }
        }
        r = session.post(f"{API}/manuscripts", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["title"] == "TEST_ Sample Manuscript"
        assert len(doc["sections"]) == 20
        # all empty
        for k, s in doc["sections"].items():
            assert s["status"] == "empty"
            assert s["content"] == ""
        # cleanup
        session.delete(f"{API}/manuscripts/{doc['manuscript_id']}", headers=auth_headers)

    def test_list_manuscripts(self, session, auth_headers, manuscript_id):
        r = session.get(f"{API}/manuscripts", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        ids = [m["manuscript_id"] for m in items]
        assert manuscript_id in ids
        for m in items:
            assert "total_sections" in m and m["total_sections"] == 20
            assert "generated_sections" in m

    def test_get_manuscript(self, session, auth_headers, manuscript_id):
        r = session.get(f"{API}/manuscripts/{manuscript_id}", headers=auth_headers)
        assert r.status_code == 200
        doc = r.json()
        assert doc["manuscript_id"] == manuscript_id
        assert len(doc["sections"]) == 20

    def test_get_other_users_manuscript_blocked(self, session, manuscript_id):
        # Create a fresh user; should NOT see demo user's manuscript
        email = f"other_{uuid.uuid4().hex[:8]}@manuscriptforge.app"
        reg = session.post(
            f"{API}/auth/register",
            json={"email": email, "password": "Other123!", "name": "Other"},
        )
        assert reg.status_code == 200
        other_token = reg.json()["token"]
        h = {"Authorization": f"Bearer {other_token}"}

        # GET specific
        r = session.get(f"{API}/manuscripts/{manuscript_id}", headers=h)
        assert r.status_code == 404

        # LIST should not include it
        r2 = session.get(f"{API}/manuscripts", headers=h)
        assert r2.status_code == 200
        ids = [m["manuscript_id"] for m in r2.json()]
        assert manuscript_id not in ids

    def test_patch_manuscript_inputs_and_overrides(self, session, auth_headers, manuscript_id):
        payload = {
            "inputs": {
                "title": "TEST_ Updated Title",
                "field": "Marine Renewable Energy",
                "citation_style": "IEEE",
            },
            "section_overrides": {"keywords": "wind energy, wave energy, LSTM, forecasting, marine"},
        }
        r = session.patch(f"{API}/manuscripts/{manuscript_id}", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["title"] == "TEST_ Updated Title"
        assert doc["inputs"]["citation_style"] == "IEEE"
        assert doc["sections"]["keywords"]["status"] == "complete"
        assert "LSTM" in doc["sections"]["keywords"]["content"]

    def test_delete_manuscript_and_404(self, session, auth_headers):
        # Create a throwaway
        payload = {"inputs": {"title": "TEST_ To Delete", "field": "X"}}
        r = session.post(f"{API}/manuscripts", json=payload, headers=auth_headers)
        mid = r.json()["manuscript_id"]

        d = session.delete(f"{API}/manuscripts/{mid}", headers=auth_headers)
        assert d.status_code == 200
        assert d.json().get("ok") is True

        g = session.get(f"{API}/manuscripts/{mid}", headers=auth_headers)
        assert g.status_code == 404


# ---------- Section Generation ----------
class TestSectionGeneration:
    def test_generate_invalid_section_key(self, session, auth_headers, manuscript_id):
        r = session.post(
            f"{API}/manuscripts/{manuscript_id}/sections/not_a_section/generate",
            json={"extra_instructions": ""},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_generate_abstract(self, session, auth_headers, manuscript_id):
        # LLM can be slow — generous timeout
        r = requests.post(
            f"{API}/manuscripts/{manuscript_id}/sections/abstract/generate",
            json={"extra_instructions": "Keep it concise."},
            headers=auth_headers,
            timeout=180,
        )
        assert r.status_code == 200, f"generate failed: {r.status_code} {r.text[:500]}"
        data = r.json()
        section = data["section"]
        assert section["status"] == "complete"
        assert isinstance(section["content"], str)
        assert len(section["content"]) > 500, f"content too short: {len(section['content'])} chars"

        # Verify persistence via GET
        g = session.get(f"{API}/manuscripts/{manuscript_id}", headers=auth_headers)
        assert g.status_code == 200
        assert g.json()["sections"]["abstract"]["status"] == "complete"
        assert len(g.json()["sections"]["abstract"]["content"]) > 500


# ---------- References ----------
class TestReferences:
    def test_reference_search(self, session, auth_headers):
        r = session.get(
            f"{API}/references/search",
            params={"q": "machine learning wind energy forecasting", "rows": 5},
            headers=auth_headers,
        )
        # Crossref can be flaky — accept any 2xx with results array
        assert r.status_code in (200, 502), f"unexpected status: {r.status_code} {r.text[:300]}"
        if r.status_code == 200:
            data = r.json()
            assert "results" in data
            assert isinstance(data["results"], list)
            if data["results"]:
                first = data["results"][0]
                # at least keys exist
                for key in ("doi", "title", "authors", "year"):
                    assert key in first


# ---------- Export ----------
class TestExport:
    def test_export_markdown(self, session, auth_headers, manuscript_id):
        r = session.get(
            f"{API}/manuscripts/{manuscript_id}/export",
            params={"format": "md"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "text/markdown" in ct
        assert len(r.content) > 0

    def test_export_docx(self, session, auth_headers, manuscript_id):
        r = session.get(
            f"{API}/manuscripts/{manuscript_id}/export",
            params={"format": "docx"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "officedocument.wordprocessingml.document" in ct
        assert r.content.startswith(b"PK")  # zip magic

    def test_export_pdf(self, session, auth_headers, manuscript_id):
        r = session.get(
            f"{API}/manuscripts/{manuscript_id}/export",
            params={"format": "pdf"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "application/pdf" in ct
        assert r.content.startswith(b"%PDF")

    def test_export_bad_format(self, session, auth_headers, manuscript_id):
        r = session.get(
            f"{API}/manuscripts/{manuscript_id}/export",
            params={"format": "xyz"},
            headers=auth_headers,
        )
        assert r.status_code == 400


# ---------- Cleanup ----------
def test_zz_cleanup(session, auth_headers, manuscript_id):
    """Delete the primary test manuscript (last)."""
    r = session.delete(f"{API}/manuscripts/{manuscript_id}", headers=auth_headers)
    assert r.status_code == 200
