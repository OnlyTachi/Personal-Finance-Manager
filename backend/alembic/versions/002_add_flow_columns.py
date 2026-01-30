"""add_flow_columns

Revision ID: 002
Revises: 001
Create Date: 2023-10-27 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("snapshots", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("total_aportes", sa.Float(), nullable=True, default=0.0)
        )
        batch_op.add_column(
            sa.Column("total_saques", sa.Float(), nullable=True, default=0.0)
        )


def downgrade() -> None:
    with op.batch_alter_table("snapshots", schema=None) as batch_op:
        batch_op.drop_column("total_aportes")
        batch_op.drop_column("total_saques")
