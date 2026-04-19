"""
pipeline_api.py — Kaala Dristi pipeline API (port 8101)
Serves pre-computed Panchangam data from kaala_dristi_db.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import date, datetime, time
from typing import Optional
from zoneinfo import ZoneInfo

import asyncpg
from fastapi import FastAPI, HTTPException, Query

IST = ZoneInfo("Asia/Kolkata")

# ---------------------------------------------------------------------------
# Date-keyed in-memory cache — panchang rows are immutable once computed,
# so a plain dict is safe (single asyncio event loop, no lock needed).
# ---------------------------------------------------------------------------
_cache: dict[str, dict] = {}

# ---------------------------------------------------------------------------
# DB connection pool
# ---------------------------------------------------------------------------
_pool: Optional[asyncpg.Pool] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=os.environ["KAALA_DRISTI_DB_URL"],  # e.g. postgresql://user:pw@host/kaala_dristi_db
        min_size=1,
        max_size=5,
    )
    yield
    if _pool:
        await _pool.close()


app = FastAPI(title="Kaala Dristi Pipeline API", version="1.0.0", lifespan=lifespan)

# ---------------------------------------------------------------------------
# SQL — single join, no N+1
# ---------------------------------------------------------------------------
_SQL = """
SELECT
    today.*,
    tomorrow.tithi_name     AS tithi_next_name,
    tomorrow.nakshatra_name AS nakshatra_next_name,
    tomorrow.karana_name    AS karana_next_name
FROM km_daily_panchang today
LEFT JOIN km_daily_panchang tomorrow
    ON tomorrow.date = today.date + INTERVAL '1 day'
WHERE today.date = $1
"""


def _fmt_time(v: object) -> Optional[str]:
    """Serialize a DB time/timedelta value to 'HH:MM:SS' string, or None."""
    if v is None:
        return None
    if isinstance(v, str):
        return v
    if isinstance(v, time):
        return v.strftime("%H:%M:%S")
    # asyncpg returns PostgreSQL TIME as datetime.time; INTERVAL as timedelta
    # Timedelta edge-case (shouldn't happen for TIME columns, but guard anyway)
    total = int(v.total_seconds()) if hasattr(v, "total_seconds") else None
    if total is not None:
        h, rem = divmod(total, 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
    return str(v)


async def _fetch(target: date) -> Optional[dict]:
    key = target.isoformat()
    if key in _cache:
        return _cache[key]

    assert _pool is not None, "DB pool not initialised"
    async with _pool.acquire() as conn:
        row = await conn.fetchrow(_SQL, target)

    if row is None:
        return None

    result = dict(row)

    # Normalise date → ISO string
    if isinstance(result.get("date"), date):
        result["date"] = result["date"].isoformat()

    # Normalise time columns → "HH:MM:SS" strings
    for col in ("sunrise_ist", "sunset_ist", "tithi_end_ist", "nakshatra_end_ist"):
        result[col] = _fmt_time(result.get(col))

    # LEFT JOIN produces NULL for next-day fields when tomorrow row is missing —
    # keep them as None; the frontend already handles Optional fields.

    _cache[key] = result
    return result


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@app.get("/api/panchang/daily")
async def get_daily_panchang(
    date: Optional[str] = Query(None, description="YYYY-MM-DD — defaults to today IST"),
):
    if date is None:
        target = datetime.now(IST).date()
    else:
        try:
            target = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=422, detail="date must be YYYY-MM-DD")

    row = await _fetch(target)
    if row is None:
        raise HTTPException(status_code=404, detail="No panchang data for date")

    return row
