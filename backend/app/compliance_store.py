"""In-memory store for guardrail / compliance configuration."""
from __future__ import annotations

from pydantic import BaseModel, Field


DEFAULT_BLOCKED_TOPICS: list[str] = [
    "política",
    "religião",
    "violência",
    "drogas",
    "demissões / layoffs",
]

DEFAULT_COMPLIANCE_MESSAGE = (
    "⚠️ Esta pergunta não pode ser respondida por envolver conteúdo sensível "
    "relacionado a tópicos restritos pela política de compliance."
)


class GuardrailConfig(BaseModel):
    enabled: bool = True
    blocked_topics: list[str] = Field(default_factory=lambda: list(DEFAULT_BLOCKED_TOPICS))
    compliance_message: str = DEFAULT_COMPLIANCE_MESSAGE
    guardrail_model: str = "gpt-4o-mini"


class ComplianceStore:
    """Singleton-like store keeping the current guardrail configuration."""

    _instance: ComplianceStore | None = None
    _config: GuardrailConfig

    def __init__(self) -> None:
        self._config = GuardrailConfig()

    @classmethod
    def get(cls) -> ComplianceStore:
        if cls._instance is None:
            cls._instance = ComplianceStore()
        return cls._instance

    @property
    def config(self) -> GuardrailConfig:
        return self._config

    def update(self, patch: dict) -> GuardrailConfig:
        data = self._config.model_dump()
        data.update({k: v for k, v in patch.items() if v is not None})
        self._config = GuardrailConfig(**data)
        return self._config
