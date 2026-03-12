"""limit task title to 140 chars

Revision ID: e58a40d5a59b
Revises: c53d90165ff2
Create Date: 2026-03-10 20:53:39.179029

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e58a40d5a59b'
down_revision: Union[str, None] = 'c53d90165ff2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "tasks",
        "title",
        existing_type=sa.String(),
        type_=sa.String(length=140),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "tasks",
        "title",
        existing_type=sa.String(length=140),
        type_=sa.String(),
        existing_nullable=False,
    )