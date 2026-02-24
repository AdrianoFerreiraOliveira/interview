from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

try:
    from langfuse import Langfuse
except Exception as e:
    Langfuse = None
    import logging
    logging.warning(f"Failed to import Langfuse: {e}. Tracing will be disabled.")

from .config import Settings


class LangfuseHelper:
    def __init__(self, settings: Settings) -> None:
        self._enabled = bool(
            settings.langfuse_tracing_enabled
            and settings.langfuse_public_key
            and settings.langfuse_secret_key
            and settings.langfuse_base_url
            and Langfuse is not None
        )
        self._client: Any | None = None
        if self._enabled and Langfuse:
            self._client = Langfuse(
                public_key=settings.langfuse_public_key,
                secret_key=settings.langfuse_secret_key,
                host=settings.langfuse_base_url,
            )

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def client(self) -> Any | None:
        return self._client

    @contextmanager
    def trace(self, name: str, metadata: dict[str, Any] | None = None) -> Iterator[Any]:
        """Create a top-level trace (observation) as a span."""
        if not self._client:
            yield None
            return
        with self._client.start_as_current_observation(
            as_type="span", name=name, metadata=metadata
        ) as span:
            yield span
        self._client.flush()

    @contextmanager
    def generation(
        self,
        name: str,
        model: str,
        input: dict[str, Any] | None = None,
        model_parameters: dict[str, Any] | None = None,
    ) -> Iterator[Any]:
        """Create a generation observation (nested under the current span)."""
        if not self._client:
            yield None
            return
        with self._client.start_as_current_observation(
            as_type="generation",
            name=name,
            model=model,
            input=input,
            model_parameters=model_parameters,
        ) as gen:
            yield gen
