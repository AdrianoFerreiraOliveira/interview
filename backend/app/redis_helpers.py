import json
import logging
import redis
from .config import get_settings

logger = logging.getLogger(__name__)

# Global Redis Client
_redis_client = None

def get_redis_client():
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        try:
            _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            _redis_client.ping() # test connection
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Falling back to memory/no cache.")
            _redis_client = False # Use False to signify failed connection
    return _redis_client if _redis_client is not False else None


class RedisHelpers:
    @staticmethod
    def get_cache_key(query: str, model: str) -> str:
        # Simple cache key generation
        import hashlib
        raw_key = f"{query.strip().lower()}|{model}"
        return "rag_cache:" + hashlib.md5(raw_key.encode()).hexdigest()

    @staticmethod
    def check_cache(query: str, model: str):
        client = get_redis_client()
        if not client:
            return None
            
        key = RedisHelpers.get_cache_key(query, model)
        try:
            cached_data = client.get(key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Redis cache read error: {e}")
        return None

    @staticmethod
    def set_cache(query: str, model: str, response_data: dict, ttl: int = 3600):
        client = get_redis_client()
        if not client:
            return
            
        key = RedisHelpers.get_cache_key(query, model)
        try:
            client.setex(key, ttl, json.dumps(response_data))
        except Exception as e:
            logger.warning(f"Redis cache write error: {e}")

    @staticmethod
    def get_chat_history(session_id: str, limit: int = 10) -> str:
        """Returns the chat history formatted as a string for context."""
        client = get_redis_client()
        if not client or not session_id:
            return ""
            
        key = f"chat_history:{session_id}"
        try:
            # We store elements as distinct items in a list
            # LLMs need chronological order, so we fetch [-limit, -1]
            history_items = client.lrange(key, -limit, -1)
            formatted = []
            for item in history_items:
                data = json.loads(item)
                role = data.get("role", "unknown")
                content = data.get("content", "")
                formatted.append(f"{role.capitalize()}: {content}")
                
            return "\n".join(formatted)
        except Exception as e:
            logger.warning(f"Redis chat history read error: {e}")
            return ""

    @staticmethod
    def add_chat_history(session_id: str, user_query: str, ai_response: str):
        """Adds a User + AI interaction to the chat history list."""
        client = get_redis_client()
        if not client or not session_id:
            return
            
        key = f"chat_history:{session_id}"
        try:
            user_msg = json.dumps({"role": "user", "content": user_query})
            ai_msg = json.dumps({"role": "assistant", "content": ai_response})
            
            # Push to the end of the list
            client.rpush(key, user_msg, ai_msg)
            # Expire session history after 24h
            client.expire(key, 86400) 
        except Exception as e:
            logger.warning(f"Redis chat history write error: {e}")
