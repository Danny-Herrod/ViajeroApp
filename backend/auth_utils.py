"""
Utilidades para autenticación y manejo de contraseñas
"""
import hashlib
import secrets
from typing import Optional

def hash_password(password: str) -> str:
    """
    Hashea una contraseña usando SHA-256 con sal

    Args:
        password: Contraseña en texto plano

    Returns:
        str: Contraseña hasheada con sal
    """
    # Generar sal aleatoria
    salt = secrets.token_hex(16)

    # Hashear la contraseña con la sal
    password_hash = hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

    # Devolver sal + hash separados por ':'
    return f"{salt}:{password_hash}"

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verifica si una contraseña coincide con su hash

    Args:
        password: Contraseña en texto plano
        hashed_password: Hash almacenado en formato 'sal:hash'

    Returns:
        bool: True si la contraseña es correcta
    """
    try:
        # Separar sal y hash
        salt, stored_hash = hashed_password.split(':')

        # Generar hash con la misma sal
        test_hash = hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

        # Comparar hashes
        return test_hash == stored_hash
    except (ValueError, AttributeError):
        return False

def generate_token() -> str:
    """
    Genera un token aleatorio para sesiones

    Returns:
        str: Token hexadecimal
    """
    return secrets.token_urlsafe(32)
