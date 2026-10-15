import sqlalchemy as sa
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("imports", sa.Column("currency", sa.String(3), nullable=True))
    op.add_column(
        "imports", sa.Column("processing_version", sa.Integer(), server_default="1", nullable=False)
    )
    op.alter_column("imports", "processing_version", server_default=None)


def downgrade() -> None:
    op.drop_column("imports", "processing_version")
    op.drop_column("imports", "currency")
