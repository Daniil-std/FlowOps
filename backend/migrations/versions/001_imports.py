import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "imports",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("filename", sa.String(180), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("total_rows", sa.Integer(), nullable=False),
        sa.Column("valid_rows", sa.Integer(), nullable=False),
        sa.Column("duplicate_rows", sa.Integer(), nullable=False),
        sa.Column("invalid_rows", sa.Integer(), nullable=False),
        sa.Column("issue_count", sa.Integer(), nullable=False),
        sa.Column("normalized_rows", sa.Integer(), nullable=False),
        sa.Column("records", postgresql.JSONB(), nullable=False),
        sa.Column("issues", postgresql.JSONB(), nullable=False),
        sa.Column("changes", postgresql.JSONB(), nullable=False),
        sa.Column("column_changes", postgresql.JSONB(), nullable=False),
        sa.CheckConstraint("total_rows = valid_rows + duplicate_rows + invalid_rows"),
    )


def downgrade() -> None:
    op.drop_table("imports")
