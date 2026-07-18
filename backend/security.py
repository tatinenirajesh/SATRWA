from passlib.context import CryptContext
import secrets
import string
from datetime import datetime, timedelta, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

LOCK_MINUTES = 15
MAX_ATTEMPTS = 3


def hash_pin(pin: str) -> str:
    return pwd_context.hash(pin)


def verify_pin(pin: str, pin_hash: str) -> bool:
    return pwd_context.verify(pin, pin_hash)


def generate_otp(length=6):
    return "".join(secrets.choice(string.digits) for _ in range(length))


def generate_temp_pin(length=6):
    chars = string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def lock_until():
    return datetime.now(timezone.utc) + timedelta(minutes=LOCK_MINUTES)