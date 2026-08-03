import uuid


def generate_uuid() -> str:
    """
    Gera um UUID v4 em formato de string.
    Centralizado para uso como default_factory em modelos SQLAlchemy e serviços.
    """
    return str(uuid.uuid4())
