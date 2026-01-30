from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.session import Base
from sqlalchemy.sql import func


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.username"))
    badge_code = Column(String, nullable=False)  # Ex: 'FIRST_10K', 'SAVER_LVL1'
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
