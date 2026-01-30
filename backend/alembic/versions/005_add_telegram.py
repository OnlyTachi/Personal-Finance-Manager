"""add_telegram_devices

Revision ID: 005
Revises: 004
Create Date: 2023-10-30 10:00:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Cria a nova tabela
    op.create_table(
        "telegram_devices",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.username")),
        sa.Column("telegram_id", sa.String(), unique=True, index=True),
        sa.Column("device_name", sa.String()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )

    pass


def downgrade() -> None:
    op.drop_table("telegram_devices")
