"""Neon PostgreSQL connection pool."""

from __future__ import annotations

import os
from typing import Any, AsyncGenerator

import asyncpg

_POOL: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Get or create the async connection pool."""
    global _POOL
    if _POOL is None:
        url = os.getenv("DATABASE_URL")
        if not url:
            raise RuntimeError("DATABASE_URL env var is not set")
        _POOL = await asyncpg.create_pool(url)
    return _POOL


class Database:
    """Thin wrapper around asyncpg for typed queries."""

    def __init__(self, pool: asyncpg.Pool | None = None) -> None:
        self._pool = pool

    async def _get_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            self._pool = await get_pool()
        return self._pool

    async def fetchrow(self, query: str, *args: Any) -> asyncpg.Record | None:
        pool = await self._get_pool()
        return await pool.fetchrow(query, *args)

    async def fetch(self, query: str, *args: Any) -> list[asyncpg.Record]:
        pool = await self._get_pool()
        return await pool.fetch(query, *args)

    async def execute(self, query: str, *args: Any) -> str:
        pool = await self._get_pool()
        return await pool.execute(query, *args)

    async def ping(self) -> bool:
        """Verify that the database is reachable."""
        pool = await self._get_pool()
        return await pool.fetchval("SELECT 1") == 1


async def close_pool() -> None:
    """Close the process-wide PostgreSQL pool, if one was created."""
    global _POOL
    if _POOL is not None:
        await _POOL.close()
        _POOL = None


async def get_db() -> AsyncGenerator[Database, None]:
    """FastAPI dependency that yields a Database instance."""
    yield Database()
