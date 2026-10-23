"""Narration layer: one OpenAI-compatible client for any free LLM provider.

The LLM only writes explanations. Prices, vetoes and routes are always decided
by deterministic code, so a weak or missing model can never agree to a
money-losing contract (Liang et al. 2026 found that in 19% of runs with
small models).

Choose a provider with SCM_LLM_PROVIDER:
  groq (recommended, free, no card), gemini, openrouter, or none.
With "none" or no API key, every call returns the caller's fallback text.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Provider:
    base_url: str
    default_model: str
    key_env: str


PROVIDERS = {
    "groq": Provider("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile", "GROQ_API_KEY"),
    "gemini": Provider(
        "https://generativelanguage.googleapis.com/v1beta/openai", "gemini-3.5-flash-lite", "GEMINI_API_KEY"
    ),
    "openrouter": Provider("https://openrouter.ai/api/v1", "openai/gpt-oss-120b:free", "OPENROUTER_API_KEY"),
}


class Narrator:
    def __init__(self, provider: str | None = None, model: str | None = None, timeout_s: float = 20.0):
        name = (provider or os.environ.get("SCM_LLM_PROVIDER", "none")).lower()
        self.provider = PROVIDERS.get(name)
        self.api_key = os.environ.get(self.provider.key_env) if self.provider else None
        self.model = model or os.environ.get("SCM_LLM_MODEL") or (self.provider.default_model if self.provider else None)
        self.timeout_s = timeout_s

    @property
    def enabled(self) -> bool:
        return bool(self.provider and self.api_key)

    @property
    def model_label(self) -> str:
        return self.model if self.enabled else "deterministic-template"

    async def say(self, system: str, user: str, fallback: str, max_tokens: int = 80) -> str:
        if not self.enabled:
            return fallback
        try:
            async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                resp = await client.post(
                    f"{self.provider.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "max_tokens": max_tokens,
                        "temperature": 0.6,
                        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    },
                )
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"]
                return text.strip() or fallback
        except Exception as exc:  # narration must never break a deal
            log.warning("LLM call failed, using fallback text: %s", exc)
            return fallback
