"""Compliance guardrail using OpenAI Agents SDK.

Runs a lightweight guardrail agent that classifies user queries against
a configurable list of blocked topics (politics, religion, violence,
drugs, layoffs).  The classification uses OpenAI models via the Agents SDK
while the main RAG pipeline continues using Ollama.
"""
from __future__ import annotations

import os
import re
from typing import Any

from pydantic import BaseModel

from .compliance_store import ComplianceStore


# ---------------------------------------------------------------------------
#  Pydantic output model for the guardrail agent
# ---------------------------------------------------------------------------

class ComplianceOutput(BaseModel):
    """Structured output returned by the guardrail agent."""
    is_blocked: bool
    detected_topic: str = ""
    reasoning: str = ""


# ---------------------------------------------------------------------------
#  Keyword-based fast pre-check (avoids API call for obvious cases)
# ---------------------------------------------------------------------------

_KEYWORD_MAP: dict[str, list[str]] = {
    "política": [
        "governo", "presidente", "eleição", "eleições", "partido", "deputado",
        "senador", "vereador", "prefeito", "governador", "congresso", "câmara",
        "senado", "voto", "votar", "política", "politica", "political",
        "esquerda", "direita", "liberal", "conservador", "comunismo",
        "socialismo", "capitalismo", "impeachment",
    ],
    "religião": [
        "deus", "jesus", "alá", "allah", "buda", "religião", "religiao",
        "religioso", "igreja", "mesquita", "templo", "bíblia", "biblia",
        "corão", "corao", "torah", "evangelho", "pastor", "padre", "oração",
        "oracao", "pecado", "inferno", "paraíso", "paraiso", "ateu",
        "ateísmo", "religion",
    ],
    "violência": [
        "matar", "assassinar", "violência", "violencia", "arma", "tiro",
        "bomba", "explosão", "explosao", "terrorismo", "terrorista",
        "estupro", "agressão", "agressao", "tortura", "massacre",
        "guerra", "violence", "kill", "murder",
    ],
    "drogas": [
        "droga", "drogas", "cocaína", "cocaina", "maconha", "heroína",
        "heroina", "crack", "lsd", "metanfetamina", "narcótico", "narcotico",
        "tráfico", "trafico", "entorpecente", "drugs", "narcotic",
    ],
    "demissões / layoffs": [
        "demissão", "demissao", "demissões", "demissoes", "demitir",
        "demitido", "layoff", "layoffs", "downsizing", "reestruturação",
        "reestruturacao", "corte de pessoal", "fired", "firing",
    ],
}


def _keyword_precheck(query: str, blocked_topics: list[str]) -> ComplianceOutput | None:
    """Fast keyword match — returns a ComplianceOutput if a match is found."""
    lower = query.lower()
    for topic in blocked_topics:
        keywords = _KEYWORD_MAP.get(topic.lower().strip(), [])
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", lower):
                return ComplianceOutput(
                    is_blocked=True,
                    detected_topic=topic,
                    reasoning=f"Keyword match: '{kw}' → topic '{topic}'",
                )
    return None


# ---------------------------------------------------------------------------
#  Full LLM-based compliance check via OpenAI Agents SDK
# ---------------------------------------------------------------------------

async def _llm_compliance_check(
    query: str,
    blocked_topics: list[str],
    model: str,
) -> ComplianceOutput:
    """Run the OpenAI Agents SDK guardrail agent to classify the query."""
    from agents import Agent, Runner  # lazy import — only used when needed

    topics_str = ", ".join(blocked_topics)
    guardrail_agent = Agent(
        name="Compliance Guardrail",
        instructions=(
            "You are a compliance classifier. Your job is to determine whether "
            "the user's message touches any of the following BLOCKED topics: "
            f"[{topics_str}].\n\n"
            "Rules:\n"
            "- If the message is about or requests information related to any "
            "blocked topic, set is_blocked=true and identify the topic.\n"
            "- If the message only tangentially mentions a topic but is really "
            "asking about something else (e.g. company revenue), set is_blocked=false.\n"
            "- Be strict: users may try to bypass this check with rephrasing.\n"
            "- Respond ONLY with the structured JSON output."
        ),
        model=model,
        output_type=ComplianceOutput,
    )

    result = await Runner.run(guardrail_agent, query)
    if isinstance(result.final_output, ComplianceOutput):
        return result.final_output

    # Fallback if SDK doesn't parse properly
    return ComplianceOutput(is_blocked=False, detected_topic="", reasoning="No match")


# ---------------------------------------------------------------------------
#  Public API
# ---------------------------------------------------------------------------

async def check_compliance(query: str) -> dict[str, Any]:
    """Check a query against the current guardrail configuration.

    Returns a dict with keys: is_blocked, detected_topic, reasoning.
    """
    store = ComplianceStore.get()
    cfg = store.config

    if not cfg.enabled:
        return {"is_blocked": False, "detected_topic": "", "reasoning": "Guardrails disabled"}

    # 1. Fast keyword pre-check
    keyword_result = _keyword_precheck(query, cfg.blocked_topics)
    if keyword_result is not None:
        return keyword_result.model_dump()

    # 2. Full LLM check (requires OPENAI_API_KEY)
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        # No API key — rely only on keyword check (already passed)
        return {
            "is_blocked": False,
            "detected_topic": "",
            "reasoning": "No OPENAI_API_KEY set; keyword check passed",
        }

    try:
        result = await _llm_compliance_check(query, cfg.blocked_topics, cfg.guardrail_model)
        return result.model_dump()
    except Exception as exc:
        # If the LLM check fails, default to allowing the query
        return {
            "is_blocked": False,
            "detected_topic": "",
            "reasoning": f"LLM guardrail error: {exc}",
        }
