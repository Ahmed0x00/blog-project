import redis
import json
from ..config import settings
from loguru import logger

redis_client = None

try:
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_client.ping()
except redis.ConnectionError:
    logger.warning("Could not connect to Redis. Caching will be disabled.")
    redis_client = None

def cache_get(key: str) -> dict | None:
    if not redis_client:
        return None
    try:
        data = redis_client.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.warning(f"Redis get error: {e}")
    return None

def cache_set(key: str, value: dict | list, ttl: int = 300):
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl, json.dumps(value))
    except Exception as e:
        logger.warning(f"Redis set error: {e}")

def cache_delete(key: str):
    if not redis_client:
        return
    try:
        redis_client.delete(key)
    except Exception as e:
        logger.warning(f"Redis delete error: {e}")

def cache_delete_pattern(pattern: str):
    if not redis_client:
        return
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
    except Exception as e:
        logger.warning(f"Redis delete pattern error: {e}")
