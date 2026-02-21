"""Prompt configuration store – persists prompt templates as a local JSON file.

Follows item 6 of the technical challenge:
- Prompts separated by responsibility
- Clear instructions
- Hallucination control
- Ambiguity handling
- Easy maintenance
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from pydantic import BaseModel, Field


_CONFIG_FILE = Path(__file__).resolve().parent.parent / "prompts_config.json"
_lock = Lock()


# ---------------------------------------------------------------------------
#  Default prompt templates
# ---------------------------------------------------------------------------

DEFAULT_PROMPTS: dict[str, Any] = {
    "version": "1.0.0",
    "description": "Prompt configuration for the Multi-Agent AI Assistant – AB InBev",
    "last_updated": datetime.now(timezone.utc).isoformat(),

    "system_prompt": (
        "Você é um assistente inteligente da AB InBev especializado em operações internas. "
        "Seu papel é responder perguntas de forma clara, objetiva e profissional, "
        "utilizando exclusivamente as informações fornecidas no contexto. "
        "Responda sempre em português brasileiro. "
        "Mantenha um tom corporativo e acessível."
    ),

    "rag_prompt_template": (
        "### Instruções\n"
        "Você é um assistente especializado em documentos internos. "
        "Use o contexto fornecido abaixo para responder à pergunta do usuário.\n\n"
        "### Regras adicionais\n"
        "1. Priorize sempre responder com base nas informações disponíveis abaixo.\n"
        "2. Cite o documento de origem quando possível.\n"
        "3. Seja conciso mas completo na resposta.\n\n"
        "4. Se a resposta não estiver clara, indique quais partes do contexto são relevantes.\n"
        "5. Não seja deslexo, ao terminar qualquer resposta, pergunte se o usuário gostaria de mais detalhes ou de outros documentos relacionados.\n\n"
        "### Contexto\n{context}\n\n"
        "### Pergunta\n{question}\n\n"
        "### Resposta"
    ),

    "compliance_prompt": (
        "Você é um classificador de compliance. Analise a mensagem do usuário e determine "
        "se ela se refere a algum dos tópicos proibidos listados abaixo.\n\n"
        "Tópicos proibidos:\n"
        "- Política (partidos, eleições, governos, ideologias políticas)\n"
        "- Religião (crenças, práticas religiosas, denominações)\n"
        "- Violência (atos violentos, armas, agressões)\n"
        "- Drogas (substâncias ilícitas, uso recreativo)\n"
        "- Layoffs / Demissões (demissões em massa, cortes de pessoal)\n\n"
        "Responda APENAS com um JSON: {\"is_blocked\": true/false, \"detected_topic\": \"...\", \"reasoning\": \"...\"}\n"
        "Se não for proibido, retorne is_blocked=false com detected_topic vazio."
    ),

    "hallucination_guard": (
        "INSTRUÇÕES ANTI-ALUCINAÇÃO:\n"
        "- Responda EXCLUSIVAMENTE com base nas informações do contexto fornecido.\n"
        "- Se não houver informação suficiente, diga claramente que não sabe.\n"
        "- Não invente nomes, datas, números ou fatos.\n"
        "- Se houver dúvida sobre a precisão, prefira dizer \"não tenho certeza\" a inventar.\n"
        "- Diferencie claramente entre fatos encontrados no contexto e interpretações."
    ),

    "ambiguity_handler": (
        "TRATAMENTO DE AMBIGUIDADES:\n"
        "- Se a pergunta for vaga ou ambígua, solicite esclarecimentos ao usuário.\n"
        "- Liste as possíveis interpretações e peça confirmação.\n"
        "- Se múltiplos documentos responderem de forma diferente, apresente as diferentes perspectivas.\n"
        "- Indique quando uma pergunta pode ter mais de uma resposta válida."
    ),

    "response_format_instructions": (
        "FORMATO DA RESPOSTA:\n"
        "- Use markdown para formatação (títulos, listas, negrito).\n"
        "- Organize respostas longas em seções com subtítulos.\n"
        "- Inclua os trechos relevantes do documento entre aspas quando citar.\n"
        "- Ao final, indique os documentos de origem consultados.\n"
        "- Mantenha parágrafos curtos e objetivos."
    ),

    "blocked_topics_list": [
        "política",
        "religião",
        "violência",
        "drogas",
        "layoffs",
        "demissões",
    ],
}


# ---------------------------------------------------------------------------
#  Pydantic model
# ---------------------------------------------------------------------------

class PromptConfig(BaseModel):
    version: str = "1.0.0"
    description: str = ""
    last_updated: str = ""
    system_prompt: str = ""
    rag_prompt_template: str = ""
    compliance_prompt: str = ""
    hallucination_guard: str = ""
    ambiguity_handler: str = ""
    response_format_instructions: str = ""
    blocked_topics_list: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
#  Store singleton
# ---------------------------------------------------------------------------

class PromptStore:
    _instance: PromptStore | None = None
    config: PromptConfig

    def __init__(self) -> None:
        self.config = self._load()

    # --- singleton ---
    @classmethod
    def get(cls) -> PromptStore:
        if cls._instance is None:
            with _lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    # --- persistence ---
    def _load(self) -> PromptConfig:
        if _CONFIG_FILE.exists():
            try:
                data = json.loads(_CONFIG_FILE.read_text(encoding="utf-8"))
                return PromptConfig(**data)
            except Exception:
                pass
        # First run – create default config
        cfg = PromptConfig(**DEFAULT_PROMPTS)
        self._write_file(cfg)
        return cfg

    @staticmethod
    def _write_file(cfg: PromptConfig) -> None:
        """Write config to disk (no locking – callers are responsible)."""
        _CONFIG_FILE.write_text(
            json.dumps(cfg.model_dump(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    # --- public API ---
    def update(self, patch: dict[str, Any]) -> PromptConfig:
        with _lock:
            data = self.config.model_dump()
            data.update(patch)
            data["last_updated"] = datetime.now(timezone.utc).isoformat()
            self.config = PromptConfig(**data)
            self._write_file(self.config)
        return self.config

    def reset(self) -> PromptConfig:
        with _lock:
            defaults = dict(DEFAULT_PROMPTS)
            defaults["last_updated"] = datetime.now(timezone.utc).isoformat()
            self.config = PromptConfig(**defaults)
            self._write_file(self.config)
        return self.config

    def build_rag_prompt(self, context: str, question: str) -> str:
        """Build the final RAG prompt by combining all relevant prompt sections."""
        template = self.config.rag_prompt_template
        hallucination = self.config.hallucination_guard
        ambiguity = self.config.ambiguity_handler
        fmt = self.config.response_format_instructions

        full_prompt = (
            f"{hallucination}\n\n"
            f"{ambiguity}\n\n"
            f"{fmt}\n\n"
            f"{template.format(context=context, question=question)}"
        )
        return full_prompt
