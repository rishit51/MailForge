from collections.abc import AsyncGenerator
from typing import List

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import relationship, Mapped,mapped_column
from sqlalchemy import ForeignKey

from fastapi_users_db_sqlalchemy import (
    SQLAlchemyBaseUserTableUUID,
    SQLAlchemyUserDatabase,
    SQLAlchemyBaseOAuthAccountTableUUID,
)

from db.db_connection import get_db
from .base import Base


# -----------------------------
# OAuth Account Model
# -----------------------------

class OAuthAccount(SQLAlchemyBaseOAuthAccountTableUUID, Base):
    __tablename__ = "oauth_account"
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="oauth_accounts",
    )


# -----------------------------
# User Model
# -----------------------------

class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"

    oauth_accounts: Mapped[List[OAuthAccount]] = relationship(
        "OAuthAccount",
        back_populates="user",
        lazy="joined",
        cascade="all, delete-orphan",
    )


# -----------------------------
# User DB Adapter
# -----------------------------

async def get_user_db(
    session: AsyncSession = Depends(get_db),
) -> AsyncGenerator[SQLAlchemyUserDatabase, None]:
    yield SQLAlchemyUserDatabase(session, User, OAuthAccount)
