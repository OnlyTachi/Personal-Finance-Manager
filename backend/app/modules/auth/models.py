from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, backref
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    username = Column(String, primary_key=True, index=True)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    partner_id = Column(String, ForeignKey("users.username"), nullable=True)

    ativos = relationship("Ativo", back_populates="owner")
    passivos = relationship("Passivo", back_populates="owner")
    partner = relationship(
        "User", remote_side=[username], backref=backref("partner_of", uselist=False)
    )

    telegram_devices = relationship(
        "TelegramDevice", back_populates="user", cascade="all, delete-orphan"
    )


class TelegramDevice(Base):
    __tablename__ = "telegram_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.username"))
    telegram_id = Column(String, unique=True, index=True)
    device_name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="telegram_devices")


class UserPreference(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    pref_key = Column(String)
    pref_value = Column(String)
