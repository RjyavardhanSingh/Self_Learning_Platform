"""Material upload and retrieval service."""

from __future__ import annotations

import os

from db.connection import Database
from ingestion import extract_path, extract_text
from models import MaterialKind, SourceDocument
from services.object_storage import get_presigned_url
from services.object_storage import upload_file as s3_upload

BUCKET = os.getenv("NEON_STORAGE_BUCKET", "materials")


async def upload_pdf(db: Database, filename: str, data: bytes) -> SourceDocument:
    """Store PDF in object storage, extract text, save metadata to DB."""
    import hashlib

    content_hash = hashlib.sha1(data).hexdigest()[:12]
    object_key = f"pdfs/{content_hash}/{filename}"

    s3_upload(BUCKET, object_key, data, content_type="application/pdf")

    doc = extract_path(_write_temp(data, filename))

    await db.execute(
        """INSERT INTO materials (id, name, kind, full_text, page_count, word_count, object_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING""",
        doc.source_id,
        filename,
        doc.kind.value,
        doc.full_text,
        doc.page_count,
        doc.word_count,
        object_key,
    )
    return doc


async def upload_text(
    db: Database,
    content: str,
    name: str = "pasted-notes.txt",
    kind: MaterialKind = MaterialKind.TEXT,
) -> SourceDocument:
    """Ingest pasted text and store in DB. Returns the source document."""
    doc = extract_text(content, name=name, kind=kind)
    await db.execute(
        """INSERT INTO materials (id, name, kind, full_text, page_count, word_count)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING""",
        doc.source_id,
        doc.name,
        doc.kind.value,
        doc.full_text,
        doc.page_count,
        doc.word_count,
    )
    return doc


async def get_material(db: Database, material_id: str) -> dict | None:
    """Fetch a material record by ID."""
    row = await db.fetchrow("SELECT * FROM materials WHERE id = $1", material_id)
    return dict(row) if row else None


def get_download_url(material: dict) -> str | None:
    """Get a presigned download URL for a material's file, if it has one."""
    object_key = material.get("object_key")
    if not object_key:
        return None
    return get_presigned_url(BUCKET, object_key)


def _write_temp(data: bytes, filename: str) -> str:
    """Write bytes to a temp file and return the path."""
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=f"_{filename}", delete=False) as f:
        f.write(data)
        return f.name
