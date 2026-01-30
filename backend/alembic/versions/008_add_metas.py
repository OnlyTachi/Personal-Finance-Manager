"""add_goals_table

Revision ID: 008
Revises: 007
Create Date: 2023-11-10 10:00:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.username")),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("valor_alvo", sa.Float(), nullable=False),
        sa.Column("valor_atual", sa.Float(), default=0.0),
        sa.Column("data_limite", sa.DateTime(), nullable=True),
        sa.Column("descricao", sa.String(), nullable=True),
        sa.Column("cor", sa.String(), default="#3b82f6"),  # Cor para o card (UI)
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("goals")
