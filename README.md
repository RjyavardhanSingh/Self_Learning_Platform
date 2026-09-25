# Adaptive Oral Learning Platform

Upload what you're studying, say what you need to achieve, practice by speaking your answers out loud, then get a clear report on what you know, what's weak, and what to retest.

Flow is one loop with 6 steps: **Upload → Goal → Preparing → Practice → Results → Retest**. See `PRD.md` for product spec.

## What's Done

- **Versioned production API** — canonical endpoints are under `/v1`; the old unversioned paths remain as deprecated compatibility aliases during migration. Requests receive an `X-Request-ID` and the API version header. Liveness and dependency readiness probes are available at `/health/live` and `/health/ready`.
- **Material upload** — text/Markdown via `POST /v1/materials` (JSON), PDF via `POST /v1/materials/upload` (multipart, stored in Neon Object Storage). Metadata in Postgres, presigned download via `GET /v1/materials/{id}/download`.
- **Goal → context** — `POST /v1/contexts` combines materials + learning goal (subject, target, level, deadline, language) into a `LearningContext`. Persisted in Postgres (`contexts`, `context_materials`), cached in Dragonfly for fast reads.
- **Question generation (LLM)** — `POST /v1/contexts/{id}/questions` calls OpenRouter (`src/services/openrouter_service.py`) with retry + model fallback + response cache. An optional `{ "count": 5 }` body can override the dynamic count. Each question is enriched: `text, topic, target_concepts, required_relationships, acceptable_alternatives, common_misconceptions, reference_answer, scoring_rubric {excellent, good, needs_work}, source_citations`. Reference answers and rubrics are server-only and are excluded from API responses. Cached in Dragonfly only.
- **Practice sessions** — `POST /v1/sessions` (from prepared questions), `GET /v1/sessions/{id}`, `POST /v1/sessions/{id}/answer` (typed answers for now, `skipped: true` supported per PRD §9.3). Answers must be submitted one question at a time; completed sessions and invalid ordering return `409`. Scoring is LLM rubric-based (`_score_with_gemini` in `src/services/session_service.py`) with keyword-overlap fallback when the LLM is unavailable.
- **Results** — `POST /v1/sessions/{id}/complete` computes readiness % (average score), persists session to Postgres, clears cache. `GET /v1/sessions/{id}/results` fetches from cache → DB fallback. Returns full questions/answers/scores (no Strong/Weak summary yet).
- **Retest (basic)** — `POST /v1/sessions/{id}/retest` creates a new session sliced from the completed parent's questions (`count` default 5). Not yet filtered by weak topics.
- **Infra** — FastAPI (`src/api/app.py`), Neon PostgreSQL + `src/db/schema.sql` (materials, contexts, context_materials, sessions), Alembic migrations in `src/migrations/`, Dragonfly (Redis-compatible) cache, Docker Compose for local Dragonfly, GitHub Actions CI (ruff + pytest).
- **Tests** — 47 passing (`tests/test_context.py`, `test_goal.py`, `test_ingestion.py`, `test_pdf.py`, `test_reference_answers.py`, `test_api_versioning.py`).

## What's Not Done

- **Results analysis** — no Strong / Needs work / Misconceptions summary (PRD §10); raw questions/answers/scores only.
- **Smart retest** — currently slices parent questions; no weak-topic filtering via LLM.
- **STT (Speech-to-Text)** — answers are typed; voice input is a Phase 1 goal.
- **TTS (Text-to-Speech)** — questions are text only.
- **Gap detection / research** — no filling missing knowledge from trusted sources.
- **Adaptive questioning** — no follow-up / difficulty adjustment mid-session.
- **Citations UI** — `source_citations` generated but no frontend to show them.
- **Frontend** — API only; `web/` is an unconnected Vite scaffold.
- **Chunking / retrieval** — full material text sent to LLM (truncated at ~3M chars); no RAG yet.

## Structure

```
src/
├── api/                    # FastAPI app factory + routes (6-step loop)
│   ├── app.py              # create_app(), /health
│   ├── schemas.py          # Pydantic request/response models
│   └── routes/
│       ├── materials.py    # Upload (text JSON + PDF alias)
│       ├── contexts.py     # Goal → context
│       ├── questions.py    # Preparing (generate/fetch)
│       └── sessions.py     # Practice → Results → Retest
├── services/               # Business logic
│   ├── material_service.py # Upload text/PDF, object storage
│   ├── context_service.py  # Build context, cache in Dragonfly
│   ├── question_service.py # Generate questions, cache only
│   ├── session_service.py  # Session lifecycle, LLM rubric scoring
│   ├── openrouter_service.py # LLM client (fallback, retry, cache)
│   └── object_storage.py   # Neon Object Storage (S3-compatible)
├── models/                 # Pydantic domain models (material, goal, context)
├── ingestion/              # PDF / text / Markdown parsers
├── context/                # ContextBuilder (material + goal → context)
├── cache/                  # Dragonfly (Redis) connection + CacheService
├── db/                     # Neon PostgreSQL connection + schema.sql
└── migrations/             # Alembic migrations
tests/                      # pytest suite (43 tests)
web/                        # Vite scaffold (not connected)
```

## Setup

Requires Python >=3.11 and [uv](https://docs.astral.sh/uv/).

```bash
uv sync              # install main dependencies
uv sync --group dev  # install dev dependencies (pytest, ruff)
```

## Environment Variables

Create a `.env` file:

```
DATABASE_URL=postgresql://...
DRAGONFLY_URL=redis://:password@localhost:6380
DRAGONFLY_PASSWORD=your_password

# Neon Object Storage (S3-compatible)
AWS_ENDPOINT_URL_S3=https://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2
NEON_STORAGE_BUCKET=materials

# LLM (OpenRouter) — required for question generation + scoring
OPENROUTER_API_KEY=sk-or-...
# STT (ElevenLabs Scribe realtime) — required for voice answers
ELEVENLABS_API_KEY=sk_...
# Optional (defaults shown):
# OPENROUTER_MODEL=poolside/laguna-s-2.1:free
# OPENROUTER_MODELS=model-a,model-b  (fallback list)
# OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
# Optional production HTTP settings
CORS_ORIGINS=https://app.example.com
TRUSTED_HOSTS=api.example.com
MAX_PDF_UPLOAD_BYTES=26214400
```

## Running

```bash
# Start Dragonfly
docker compose up -d

# Start server (from repo root)
PYTHONPATH=src uv run uvicorn api.app:app --reload --host 0.0.0.0 --port 8000
```

Swagger docs at `http://localhost:8000/docs`.

## API Endpoints

| Method | Path | Step | Description |
|---|---|---|---|
| `POST` | `/v1/materials` | Upload | Upload text/markdown (JSON body) |
| `POST` | `/v1/materials/upload` | Upload | Upload PDF file (multipart, alias) |
| `GET` | `/v1/materials/{id}` | Upload | Fetch material metadata |
| `GET` | `/v1/materials/{id}/download` | Upload | Presigned download URL (PDFs only) |
| `POST` | `/v1/contexts` | Goal | Build context from materials + goal |
| `GET` | `/v1/contexts/{id}` | Goal | Fetch context (cache → DB) |
| `POST` | `/v1/contexts/{id}/questions` | Preparing | Generate practice set (LLM), optional `{count}` |
| `GET` | `/v1/contexts/{id}/questions` | Preparing | Fetch cached questions |
| `POST` | `/v1/sessions` | Practice | Start session (`{context_id}`) |
| `GET` | `/v1/sessions/{id}` | Practice | Get session state |
| `POST` | `/v1/sessions/{id}/answer` | Practice | Submit answer one question at a time |
| `POST` | `/v1/sessions/{id}/complete` | Results | Complete session, readiness %, persist to DB |
| `GET` | `/v1/sessions/{id}/results` | Results | Fetch results (cache → DB) |
| `POST` | `/v1/sessions/{id}/retest` | Retest | New session from completed parent (`{count}`) |
| `GET` | `/health` | — | Liveness check |
| `GET` | `/health/ready` | — | Database/cache readiness probe |

## Testing

```bash
uv run pytest -v
```

## Linting

```bash
uv run ruff check src/ tests/
uv run ruff format src/ tests/
```
