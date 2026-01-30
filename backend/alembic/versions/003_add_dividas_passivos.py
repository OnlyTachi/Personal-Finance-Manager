"""add_parcelas_table

Revision ID: 003
Revises: 002
Create Date: 2023-10-27 14:00:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "parcelas",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "passivo_id", sa.String(), sa.ForeignKey("passivos.id"), nullable=False
        ),
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column("data_vencimento", sa.DateTime(), nullable=True),
        sa.Column("valor", sa.Float(), nullable=False),
        sa.Column("status", sa.String(), default="Pendente"),
        sa.Column("data_pagamento", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("parcelas")
