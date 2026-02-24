from __future__ import annotations

import logging
from typing import Any
from supabase import create_client, Client

from .config import get_settings

logger = logging.getLogger(__name__)

class SupabaseHelper:
    _instance: SupabaseHelper | None = None

    def __init__(self):
        settings = get_settings()
        self.client: Client | None = None
        
        if settings.supabase_url and settings.supabase_key:
            try:
                self.client = create_client(settings.supabase_url, settings.supabase_key)
                logger.info("Supabase client initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
        else:
            logger.warning("Supabase URL or Key not provided. Operating in memory/fallback mode.")

    @classmethod
    def get(cls) -> SupabaseHelper:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
