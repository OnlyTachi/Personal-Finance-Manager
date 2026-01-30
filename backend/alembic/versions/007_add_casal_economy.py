"""add_shared_transaction

Revision ID: 007
Revises: 006
Create Date: 2023-11-05 10:00:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adiciona a coluna 'shared' (booleano) na tabela movimentacoes
    # Default False (despesa individual)
    with op.batch_alter_table("movimentacoes", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("shared", sa.Boolean(), nullable=True, default=False)
        )


def downgrade() -> None:
    with op.batch_alter_table("movimentacoes", schema=None) as batch_op:
        batch_op.drop_column("shared")
