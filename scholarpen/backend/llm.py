"""ScholarPen LLM client — direct Anthropic SDK wrapper.

Centralizes Anthropic Messages API access so the rest of the server stays clean
regardless of platform. No emergentintegrations / no proprietary wrappers.
"""
from __future__ import annotations

import os
from typing import List, Optional

from anthropic import AsyncAnthropic

_DEFAULT_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-5-20251101")
_DEFAULT_VISION_MODEL = os.environ.get("ANTHROPIC_VISION_MODEL", _DEFAULT_MODEL)
_MAX_TOKENS_LONG = int(os.environ.get("LLM_MAX_TOKENS_LONG", "8000"))
_MAX_TOKENS_CHAT = int(os.environ.get("LLM_MAX_TOKENS_CHAT", "4000"))

_client: Optional[AsyncAnthropic] = None


def _get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set.")
        _client = AsyncAnthropic(api_key=api_key)
    return _client


async def generate_text(
    system: str,
    user_prompt: str,
    *,
    max_tokens: int = _MAX_TOKENS_LONG,
    model: Optional[str] = None,
) -> str:
    """Send a text-only message and return the assistant's text."""
    client = _get_client()
    resp = await client.messages.create(
        model=model or _DEFAULT_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return _extract_text(resp)


async def chat_text(
    system: str,
    user_prompt: str,
    *,
    max_tokens: int = _MAX_TOKENS_CHAT,
    model: Optional[str] = None,
) -> str:
    """Shorter-form chat reply (alias of generate_text with smaller cap)."""
    return await generate_text(system, user_prompt, max_tokens=max_tokens, model=model)


async def vision_text(
    system: str,
    user_prompt: str,
    image_base64: str,
    *,
    media_type: str = "image/png",
    max_tokens: int = _MAX_TOKENS_CHAT,
    model: Optional[str] = None,
) -> str:
    """Send a message with one inline base64 image attachment."""
    client = _get_client()
    resp = await client.messages.create(
        model=model or _DEFAULT_VISION_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": image_base64},
                    },
                    {"type": "text", "text": user_prompt},
                ],
            }
        ],
    )
    return _extract_text(resp)


def _extract_text(resp) -> str:
    """Concatenate text blocks from an Anthropic Messages response."""
    parts: List[str] = []
    for block in getattr(resp, "content", []) or []:
        if getattr(block, "type", None) == "text":
            parts.append(getattr(block, "text", ""))
    return "".join(parts).strip()
