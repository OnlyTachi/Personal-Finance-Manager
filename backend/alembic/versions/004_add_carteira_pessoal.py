"""add_cashflow_table

Revision ID: 004
Revises: 003
Create Date: 2023-10-28 10:00:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "movimentacoes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "owner_id", sa.String(), sa.ForeignKey("users.username"), nullable=True
        ),
        sa.Column("descricao", sa.String(), nullable=False),
        sa.Column("valor", sa.Float(), nullable=False),
        sa.Column("data", sa.DateTime(), nullable=True),
        sa.Column("categoria", sa.String(), default="Outros"),
        sa.Column("origem", sa.String(), default="MANUAL"),
        sa.Column("fitid", sa.String(), nullable=True, unique=True),
        sa.Column("conciliado", sa.Boolean(), default=False),
        sa.Column("comprovante_url", sa.String(), nullable=True),
        sa.Column("observacao", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("movimentacoes")
