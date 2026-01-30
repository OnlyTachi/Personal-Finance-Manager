"""add_partner_id

Revision ID: 006
Revises: 005
Create Date: 2023-11-01 10:00:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        # 1. Adiciona a coluna SEM a ForeignKey aqui dentro
        batch_op.add_column(sa.Column("partner_id", sa.String(), nullable=True))

        # 2. Cria a ForeignKey explicitamente COM NOME ("fk_users_partner_id")
        batch_op.create_foreign_key(
            "fk_users_partner_id",  # Nome da constraint (Obrigatório no SQLite)
            "users",  # Tabela referenciada
            ["partner_id"],  # Coluna local
            ["username"],  # Coluna remota
        )


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        # Para remover, também precisamos passar o nome
        batch_op.drop_constraint("fk_users_partner_id", type_="foreignkey")
        batch_op.drop_column("partner_id")
