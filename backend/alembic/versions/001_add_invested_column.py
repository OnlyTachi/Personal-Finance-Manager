"""add_invested_column

Revision ID: 001
Revises:
Create Date: 2023-10-27 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Utilizando batch_alter_table para suportar SQLite
    with op.batch_alter_table("snapshots", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("valor_total_investido", sa.Float(), nullable=True, default=0.0)
        )


def downgrade() -> None:
    with op.batch_alter_table("snapshots", schema=None) as batch_op:
        batch_op.drop_column("valor_total_investido")
