"""Dragonfly connection and cache operations."""

from __future__ import annotations

import json
import os
from typing import Any

import redis

_CACHE: redis.Redis | None = None


def get_cache() -> CacheService:
    """Get or create the Dragonfly connection singleton."""
    global _CACHE
    if _CACHE is None:
        url = os.getenv("DRAGONFLY_URL", "redis://localhost:6379")
        _CACHE = redis.from_url(url, decode_responses=True)
    return CacheService(_CACHE)


class CacheService:
    """Wrapper around Dragonfly for typed get/set/delete operations."""

    def __init__(self, client: redis.Redis | None = None) -> None:
        self._client = client or get_cache()

    def set(self, key: str, value: Any, ttl: int = 86400) -> None:
        """Store a JSON-serializable value with TTL in seconds (default 24h)."""
        self._client.set(key, json.dumps(value, default=str), ex=ttl)

    def get(self, key: str) -> Any | None:
        """Retrieve a cached value, or None if missing/expired."""
        raw = self._client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    def delete(self, key: str) -> None:
        """Remove a key from cache."""
        self._client.delete(key)

    def exists(self, key: str) -> bool:
        """Check if a key exists."""
        return bool(self._client.exists(key))

    def ping(self) -> bool:
        """Verify that the cache is reachable."""
        return bool(self._client.ping())


def close_cache() -> None:
    """Close the process-wide cache client, if one was created."""
    global _CACHE
    if _CACHE is not None:
        _CACHE.close()
        _CACHE = None
