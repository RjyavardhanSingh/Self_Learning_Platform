# PRD Checklist — Adaptive Oral Learning Platform

Source: `PRD.md` v0.1 (11 Sep 2026). Order below is **suggested build order, not mandatory** — pick any item independently. Every PRD section is covered with its § reference.

Legend: `[x]` done · `[ ]` todo · `[/]` partial

## A. Foundation — entry point + infra (PRD §17, §12)

- [x] FastAPI is MVP entry point (`src/api/app.py`), CLI paused
- [x] `src/models/` domain models (Pydantic)
- [x] `src/ingestion/` PDF / text / Markdown extraction
- [x] `src/context/` ContextBuilder
- [x] `src/api/` routes (materials, contexts, questions, sessions)
- [x] `src/services/` business logic layer
- [x] `src/db/` Neon PostgreSQL + `schema.sql` (materials, contexts, context_materials, sessions)
- [x] Dragonfly cache + object storage + docker-compose + CI (ruff + pytest, 43 tests)
- [x] Fix run docs: `PYTHONPATH=src uv run uvicorn api.app:app` (README now says this)

## B. Upload — study material (PRD §5, §6 MVP)

- [x] Upload PDF via `POST /materials/upload` (multipart, Object Storage) (§6: Upload notes)
- [x] Upload text/Markdown via `POST /materials` (JSON, 50k char limit)
- [x] `GET /materials/{id}` metadata + `GET /materials/{id}/download` presigned URL
- [ ] UI: Home "Start practice" one-tap (§5 Home)
- [ ] UI: Upload screen — drag PDF or paste text (§5 Upload)

## C. Goal — what learner wants (PRD §5, §6 MVP)

- [x] `POST /contexts` — subject, target, level, deadline, language; cached + persisted (§6: What's your goal?)
- [x] `GET /contexts/{id}` cache → DB fallback
- [ ] UI: Goal form 3–5 fields (subject, exam/date optional, target e.g. "score 80%") (§5 Goal)
- [ ] UI: single "Settings" link for language / typed-vs-voice / difficulty (§5 overwhelm rule)

## D. Preparing — practice set (PRD §5, §6 MVP, §11-Curriculum)

- [x] `POST /contexts/{id}/questions` via OpenRouter — dynamic count 5/10/15/20 by word count (§6: Your practice set)
- [x] Enriched fields: topic, target_concepts, required_relationships, acceptable_alternatives, common_misconceptions, reference_answer, scoring_rubric, source_citations
- [x] Retry + model fallback + response cache (`src/services/openrouter_service.py`)
- [x] `GET /contexts/{id}/questions` cached fetch
- [ ] Auto topic map endpoint / "Topics we'll cover" (hidden structure, no jargon) (§6 MVP: topic map)
- [ ] UI: Preparing progress states — "Reading your notes… Finding gaps… Building your practice set…" in plain language (§5 Preparing)
- [ ] Curriculum: explicit blueprint (topic × weight × question type) stored per context (§11.3)

## E. Practice — answer one at a time (PRD §5, §9, §6 MVP)

- [x] `POST /sessions` from prepared questions, `GET /sessions/{id}` state (§6 Practice)
- [x] `POST /sessions/{id}/answer` with `question_index, answer_text, skipped` (§9.3 skip allowed, counted weak)
- [x] LLM rubric scoring (`_score_with_gemini`) + keyword fallback; per-answer concept_coverage / concepts_missed / misconceptions_found
- [/] API returns light per-answer feedback ("Got it / Needs work" mode); frontend does not display it yet (§9.5)
- [ ] STT answers — speak instead of type, Whisper/Deepgram/Google TBD (§6 MVP: Speak your answer; §15.6)
- [ ] STT confidence → "Could you say that again?" (no unfair penalties) (§6 Phase 2–4)
- [ ] UI: one question per screen, progress "Question 3 of 10", no answer key mid-session, default 10 Qs / 10–15 min (§9.1, §9.2, §9.4, §9.6)
- [ ] UI: end state always lands on Results, never dead end (§9.7)

## F. Scoring fairness (PRD §4, §6 MVP, §11-Evaluator)

- [/] Readiness % is backend-computed as the average of 0–100 answer scores; per-answer scores currently come from the LLM, so the final deterministic rubric mapping required by §11.5 is not complete
- [ ] Deterministic rubric→score rule documented + tested (LLM returns evidence, backend maps to score) (§6: deterministic score from rubrics; §11.5)
- [ ] Fairness: judged on understanding, not accent / perfect English; Hinglish accepted (§4.2, §3 Languages v1: English + Hindi)
- [ ] "Practice felt fair ≥ 4.0/5" in-app rating (§13)

## G. Results — the "aha" screen (PRD §5, §10, §6 MVP)

- [x] `POST /sessions/{id}/complete` → readiness %, persist to DB, clear cache
- [x] `GET /sessions/{id}/results` cache → DB fallback (questions/answers/scores)
- [ ] Aggregate Strong list (topics ≥ threshold) (§10)
- [ ] Aggregate Needs-work list (topics < threshold, incl. skips) (§10; §6: What to fix)
- [ ] Common mix-ups section in plain language (from `misconceptions_found`) (§10; §6: misconceptions)
- [ ] Max 3 next actions: 1) Retest weak areas (primary) 2) Review topic (sources) 3) Practice topic (§10)
- [ ] UI copy: "How you did", "What to fix", "Common mix-ups we noticed" — never "rubric / ontology" (§8)
- [ ] No raw model dumps / agent logs on screen (§10)

## H. Retest — close the loop (PRD §5, §6 MVP)

- [x] `POST /sessions/{id}/retest` creates child session (`count` default 5) — currently slices parent questions
- [ ] Retest targets weak topics only (filter by Needs-work + misconceptions, LLM or rule-based) (§6: Retest weak areas)
- [ ] UI: "Practice weak areas (5 questions)" one-tap primary button (§5 Retest)

## I. Grounded — trust (PRD §12 Phase 2, §6 Phase 2–4, §11 Provenance)

- [/] `source_citations` field generated per question (placeholder refs, no retrieval yet)
- [ ] Chunking + retrieval (material chunks, embeddings/store TBD) so questions ground in notes
- [ ] Citations on questions AND feedback — "See sources" user label (§6: See sources; §8)
- [ ] Provenance: every question + score ties to source chunk IDs (debuggable) (§11)
- [ ] Safety: strip web content as untrusted, validate LLM outputs against schemas (§11)

## J. Research — fill gaps (PRD §6 MVP + §12 Phase 3, §11-Research)

- [ ] Gap detection: goal requirements vs notes coverage → missing topics list
- [ ] Focused web research (curriculum → reputable sources → web priority order) (§11.2)
- [ ] Source ranking + "We filled a few gaps from trusted sources" short list + links (§6 MVP differentiator)
- [ ] Researched content feeds Curriculum (reference answers cite filled sources)

## K. Adaptive — it listens (PRD §6 Phase 2–4, §12 Phase 4, §11-Examiner)

- [ ] Next-question policy: harder / follow-up / diagnostic from weak spots (no separate mode)
- [ ] Misconception probes: targeted follow-ups when `misconceptions_found` non-empty
- [ ] Mastery per topic over time — simple bars "Your progress" (§6: Your progress)
- [ ] Scope step: goal → explicit requirements object (§11.1)
- [ ] Examiner step: ask + follow-up + adapt as distinct service (§11.4)

## L. Voice — real viva (PRD §12 Phase 5)

- [ ] TTS: hear questions read aloud — "Listen to question" (§6 Phase 2–4)
- [ ] Re-ask on unclear speech (TTS + STT-confidence combo)
- [ ] Full voice loop: listen → speak → scored, 10–15 min session

## M. Simplicity + overwhelm guardrails (PRD §4, §5, §8)

- [ ] One loop only: Upload → Goal → Practice → Results → Retest; no modes/agents menus day one (§4.1, §5)
- [ ] Never show: agents, rubrics, knowledge graphs, hybrid RAG, ontology, policy — use §8 "Do say" column
- [ ] Copy audit: Preparing your practice / Topics we'll cover / How you did / See sources / Common mix-ups / Next question based on your answers (§8 table)
- [ ] If any button needs a tooltip, flow is too complex (§16)

## N. Safety fix (PRD §11 — blocks MVP fairness claim)

- [ ] Stop sending `reference_answer` + `scoring_rubric` to client (`QuestionResponse` currently leaks both) — serve a public question view vs internal scoring view

## O. Metrics + decisions + scope (PRD §13, §15, §14, §6-later)

- [ ] Instrument: % finish first session (≥60%), % start retest (≥40%), fairness rating, upload→goal drop-off (<25%), weekly human spot-check of "needs work" labels (§13)
- [ ] Decide: product name, web-only vs wrapper, free-tier limits, per-question vs end-only feedback, India-first vs global-first GTM, STT provider (§15.1–6)
- [ ] Do NOT build v1: CBSE-approved claims, proctoring, social loops, fluency coaching (§14); avatars/gamification, extra modes, video/YouTube/scans, 22 languages, mobile/IVR, teacher dashboards/LMS, spaced repetition (§6-later)

## P. Long-term / scale (PRD §12 Phase 6+)

- [ ] Long-term progress, study plans, more languages, classrooms
