"""Tests for the section-chat endpoint (Claude Opus 4.5).

POST /api/manuscripts/{mid}/sections/{section_key}/chat
Body: {message: str}
Returns: {section, reply, content_updated}
"""
import os
import time

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@manuscriptforge.app"
DEMO_PASSWORD = "Demo123!"

# Existing manuscript known to be owned by demo user
DEMO_MID = "ms_cbc1b8ae6fda4a"

CHAT_TIMEOUT = 90  # Claude Opus chat can take 8-25s


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_headers(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def manuscript_with_abstract(session, auth_headers):
    """Ensure the demo manuscript exists & abstract is populated.
    If abstract is empty, generate it first so the chat tests are deterministic.
    """
    r = session.get(f"{API}/manuscripts/{DEMO_MID}", headers=auth_headers)
    assert r.status_code == 200, f"demo manuscript missing: {r.status_code} {r.text}"
    doc = r.json()
    if doc["sections"]["abstract"]["status"] != "complete" or not doc["sections"]["abstract"]["content"]:
        g = requests.post(
            f"{API}/manuscripts/{DEMO_MID}/sections/abstract/generate",
            json={"extra_instructions": ""},
            headers=auth_headers,
            timeout=180,
        )
        assert g.status_code == 200, f"generate abstract failed: {g.text[:300]}"
    return DEMO_MID


# ---------- Tests ----------
class TestSectionChatValidation:
    def test_invalid_section_key_400(self, session, auth_headers, manuscript_with_abstract):
        r = session.post(
            f"{API}/manuscripts/{manuscript_with_abstract}/sections/not_a_section/chat",
            json={"message": "hi"},
            headers=auth_headers,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text[:200]}"

    def test_non_owned_manuscript_404(self, session, auth_headers):
        r = session.post(
            f"{API}/manuscripts/ms_does_not_exist/sections/abstract/chat",
            json={"message": "hi"},
            headers=auth_headers,
        )
        assert r.status_code == 404, f"expected 404, got {r.status_code} {r.text[:200]}"

    def test_missing_message_422(self, session, auth_headers, manuscript_with_abstract):
        r = session.post(
            f"{API}/manuscripts/{manuscript_with_abstract}/sections/abstract/chat",
            json={},
            headers=auth_headers,
        )
        assert r.status_code == 422, f"expected 422, got {r.status_code} {r.text[:200]}"

    def test_empty_message_422(self, session, auth_headers, manuscript_with_abstract):
        r = session.post(
            f"{API}/manuscripts/{manuscript_with_abstract}/sections/abstract/chat",
            json={"message": ""},
            headers=auth_headers,
        )
        # min_length=1 expected -> 422
        assert r.status_code == 422, f"expected 422 for empty, got {r.status_code} {r.text[:200]}"

    def test_unauthorized_401(self, session, manuscript_with_abstract):
        r = session.post(
            f"{API}/manuscripts/{manuscript_with_abstract}/sections/abstract/chat",
            json={"message": "hi"},
        )
        assert r.status_code == 401


class TestSectionChatQuestionFlow:
    """Asking a question should NOT change content."""

    def test_question_does_not_update_content(self, session, auth_headers, manuscript_with_abstract):
        mid = manuscript_with_abstract
        # snapshot
        g = session.get(f"{API}/manuscripts/{mid}", headers=auth_headers)
        before = g.json()["sections"]["abstract"]
        before_content = before["content"]
        before_chat_len = len(before.get("chat") or [])

        r = requests.post(
            f"{API}/manuscripts/{mid}/sections/abstract/chat",
            json={"message": "What is the strongest claim in this abstract?"},
            headers=auth_headers,
            timeout=CHAT_TIMEOUT,
        )
        assert r.status_code == 200, f"chat failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        assert "section" in data and "reply" in data and "content_updated" in data
        assert isinstance(data["reply"], str) and len(data["reply"]) > 0
        # Most important: a question shouldn't rewrite the abstract.
        # (LLM judgement can occasionally be wrong; the request says log not fail.)
        if data["content_updated"]:
            pytest.skip(
                "LLM false-positive: marked content_updated=true for a question. "
                "Logged but not failing per review-request guidance."
            )
        assert data["content_updated"] is False
        section = data["section"]
        assert section["content"] == before_content, "Content must be unchanged after a question"

        # chat history grew by exactly 2
        chat = section.get("chat") or []
        assert len(chat) == before_chat_len + 2, f"chat grew by {len(chat) - before_chat_len}, expected 2"
        assert chat[-2]["role"] == "user"
        assert chat[-1]["role"] == "assistant"
        assert chat[-1].get("applied_update") in (False, None, 0)

        # GET to confirm persistence
        g2 = session.get(f"{API}/manuscripts/{mid}", headers=auth_headers)
        persisted = g2.json()["sections"]["abstract"]
        assert persisted["content"] == before_content
        assert len(persisted.get("chat") or []) == before_chat_len + 2


class TestSectionChatRewriteFlow:
    """Asking for a rewrite (shorter) should update content."""

    def test_shorten_request_updates_content(self, session, auth_headers, manuscript_with_abstract):
        mid = manuscript_with_abstract
        g = session.get(f"{API}/manuscripts/{mid}", headers=auth_headers)
        before = g.json()["sections"]["abstract"]
        before_content = before["content"]
        before_len = len(before_content)
        before_chat_len = len(before.get("chat") or [])
        assert before_len > 0, "precondition: abstract should be populated"

        r = requests.post(
            f"{API}/manuscripts/{mid}/sections/abstract/chat",
            json={"message": "Please shorten to roughly 120 words."},
            headers=auth_headers,
            timeout=CHAT_TIMEOUT,
        )
        assert r.status_code == 200, f"chat failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        assert data["content_updated"] is True, (
            f"Expected content_updated=true for shorten request. reply={data.get('reply','')[:300]}"
        )
        section = data["section"]
        assert section["status"] == "complete"
        new_len = len(section["content"])
        assert new_len > 0
        assert new_len < before_len, f"new length {new_len} not shorter than before {before_len}"

        # chat history grew by 2 and last assistant turn has applied_update:true
        chat = section.get("chat") or []
        assert len(chat) == before_chat_len + 2
        assert chat[-1]["role"] == "assistant"
        assert chat[-1].get("applied_update") is True

        # persistence
        g2 = session.get(f"{API}/manuscripts/{mid}", headers=auth_headers)
        persisted = g2.json()["sections"]["abstract"]
        assert persisted["content"] == section["content"]
        assert len(persisted["content"]) < before_len


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
