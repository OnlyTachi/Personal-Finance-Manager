from sqlalchemy.orm import Session
from app.modules.auth.models import UserPreference, User
from app.modules.auth.models import DiscordDevice


def get_user_by_discord_id(db: Session, discord_id: str) -> str | None:
    device = (
        db.query(DiscordDevice).filter(DiscordDevice.discord_id == discord_id).first()
    )
    return device.user_id if device else None


def verify_and_link_discord(
    db: Session, code: str, discord_id: str, device_name: str
) -> bool:
    pref = (
        db.query(UserPreference)
        .filter(
            UserPreference.pref_key == "discord_link_code",
            UserPreference.pref_value == code,
        )
        .first()
    )
    if not pref:
        return False

    existing = (
        db.query(DiscordDevice).filter(DiscordDevice.discord_id == discord_id).first()
    )
    if existing:
        existing.user_id = pref.username
        existing.device_name = device_name
    else:
        new_dev = DiscordDevice(
            user_id=pref.username, discord_id=discord_id, device_name=device_name
        )
        db.add(new_dev)

    db.delete(pref)
    db.commit()
    return True
