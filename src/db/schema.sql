CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  full_text TEXT NOT NULL,
  page_count INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  object_key TEXT
);

CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  target TEXT NOT NULL,
  level TEXT NOT NULL,
  deadline DATE,
  language TEXT DEFAULT 'en',
  source_count INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  reading_minutes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS context_materials (
  context_id TEXT REFERENCES contexts(id) ON DELETE CASCADE,
  material_id TEXT REFERENCES materials(id) ON DELETE CASCADE,
  PRIMARY KEY (context_id, material_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  context_id TEXT NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB DEFAULT '[]'::jsonb,
  scores JSONB DEFAULT '[]'::jsonb,
  readiness_score INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
