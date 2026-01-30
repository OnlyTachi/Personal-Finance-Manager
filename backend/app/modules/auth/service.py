from sqlalchemy.orm import Session
from app.modules.auth import models
from app.core.security import get_password_hash
import random
import string
import logging

logger = logging.getLogger(__name__)


def generate_telegram_code(db: Session, username: str) -> str:
    """
    Gera um código numérico de 6 dígitos e salva nas preferências do usuário.
    """
    code = "".join(random.choices(string.digits, k=6))

    # Remove código anterior se existir
    db.query(models.UserPreference).filter(
        models.UserPreference.username == username,
        models.UserPreference.pref_key == "telegram_link_code",
    ).delete()

    # Salva novo código
    pref = models.UserPreference(
        username=username, pref_key="telegram_link_code", pref_value=code
    )
    db.add(pref)
    db.commit()
    return code


def verify_and_link_telegram(
    db: Session, code: str, telegram_id: str, device_name: str
) -> bool:
    """
    Verifica se o código existe e vincula o telegram_id ao usuário dono do código.
    """
    pref = (
        db.query(models.UserPreference)
        .filter(
            models.UserPreference.pref_key == "telegram_link_code",
            models.UserPreference.pref_value == code,
        )
        .first()
    )

    if not pref:
        return False

    # Verifica se já existe este dispositivo
    existing = (
        db.query(models.TelegramDevice)
        .filter(models.TelegramDevice.telegram_id == telegram_id)
        .first()
    )

    if existing:
        # Atualiza usuário se já existir (re-link)
        existing.user_id = pref.username
        existing.device_name = device_name
    else:
        # Cria novo dispositivo
        new_device = models.TelegramDevice(
            user_id=pref.username, telegram_id=telegram_id, device_name=device_name
        )
        db.add(new_device)

    # Deleta o código usado (segurança)
    db.delete(pref)
    db.commit()
    return True


def get_linked_devices(db: Session, username: str):
    return (
        db.query(models.TelegramDevice)
        .filter(models.TelegramDevice.user_id == username)
        .all()
    )


def unlink_device(db: Session, device_id: int, username: str):
    device = (
        db.query(models.TelegramDevice)
        .filter(
            models.TelegramDevice.id == device_id,
            models.TelegramDevice.user_id == username,
        )
        .first()
    )
    if device:
        db.delete(device)
        db.commit()
        return True
    return False


def change_password(db: Session, username: str, new_password: str):
    user = db.query(models.User).filter(models.User.username == username).first()
    if user:
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        return True
    return False
