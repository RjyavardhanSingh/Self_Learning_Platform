"""rename file_name to name in materials

Revision ID: 001
Revises:
Create Date: 2026-09-18
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(
        text("SELECT column_name FROM information_schema.columns WHERE table_name = 'materials'")
    )
    columns = {row[0] for row in result}

    if "file_name" in columns and "name" not in columns:
        op.alter_column("materials", "file_name", new_column_name="name")
    elif "file_name" not in columns and "name" not in columns:
        op.add_column("materials", sa.Column("name", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(
        text("SELECT column_name FROM information_schema.columns WHERE table_name = 'materials'")
    )
    columns = {row[0] for row in result}

    if "name" in columns and "file_name" not in columns:
        op.alter_column("materials", "name", new_column_name="file_name")
