"""add_gamification

Revision ID: 009
Revises: 008
Create Date: 2023-11-15 10:00:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "user_id", sa.String(), sa.ForeignKey("users.username"), nullable=False
        ),
        sa.Column("badge_code", sa.String(), nullable=False),
        sa.Column("earned_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "badge_code", name="uq_user_badge"),
    )


def downgrade() -> None:
    op.drop_table("achievements")
