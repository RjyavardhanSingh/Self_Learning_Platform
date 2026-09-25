"""retest lineage, weak-area summary, scoring outbox, concept mastery

Revision ID: 002
Revises: 001
Create Date: 2026-09-26
"""

from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Retest lineage on sessions (self-reference; the parent row always
    #    exists when a retest is inserted, so this FK is safe).
    op.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS parent_session_id TEXT")
    op.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_retest BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS weak_only BOOLEAN DEFAULT FALSE")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'sessions_parent_session_id_fkey'
            ) THEN
                ALTER TABLE sessions
                    ADD CONSTRAINT sessions_parent_session_id_fkey
                    FOREIGN KEY (parent_session_id)
                    REFERENCES sessions(id) ON DELETE SET NULL;
            END IF;
        END
        $$;
        """
    )

    # 2. Weak-area summary persisted at completion (avoids recompute on read).
    op.execute(
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS topic_summary JSONB DEFAULT '{}'::jsonb"
    )
    op.execute(
        "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS weak_topics JSONB DEFAULT '[]'::jsonb"
    )

    # 3. Async scoring outbox (transient rows). NOTE: no FK on session_id —
    #    the sessions row is only inserted at completion, while jobs are
    #    enqueued during the active session.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS score_jobs (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          question_index INTEGER NOT NULL,
          question_snapshot JSONB NOT NULL,
          transcript TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_score_jobs_pending ON score_jobs(status, created_at)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_score_jobs_session ON score_jobs(session_id)")

    # 4. Cross-session concept memory ("last time 45% -> now 72%").
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS concept_mastery (
          id TEXT PRIMARY KEY,
          context_id TEXT NOT NULL,
          question_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          best_score INTEGER NOT NULL,
          attempts INTEGER DEFAULT 1,
          last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
          next_review_at TIMESTAMPTZ,
          UNIQUE(context_id, question_id)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_concept_mastery_review ON concept_mastery(next_review_at)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_concept_mastery_review")
    op.execute("DROP TABLE IF EXISTS concept_mastery")
    op.execute("DROP INDEX IF EXISTS idx_score_jobs_session")
    op.execute("DROP INDEX IF EXISTS idx_score_jobs_pending")
    op.execute("DROP TABLE IF EXISTS score_jobs")
    op.execute("ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_parent_session_id_fkey")
    op.execute("ALTER TABLE sessions DROP COLUMN IF EXISTS weak_topics")
    op.execute("ALTER TABLE sessions DROP COLUMN IF EXISTS topic_summary")
    op.execute("ALTER TABLE sessions DROP COLUMN IF EXISTS weak_only")
    op.execute("ALTER TABLE sessions DROP COLUMN IF EXISTS is_retest")
    op.execute("ALTER TABLE sessions DROP COLUMN IF EXISTS parent_session_id")
