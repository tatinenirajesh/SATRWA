from datetime import datetime, timedelta

OTP_EXPIRY_MINUTES = 5

_store = {}


def save_otp(email, otp):
    _store[email.lower()] = {
        "otp": otp,
        "expires": datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    }


def verify_otp(email, otp):
    email = email.lower()

    if email not in _store:
        return False

    item = _store[email]

    if datetime.utcnow() > item["expires"]:
        del _store[email]
        return False

    if item["otp"] != otp:
        return False

    del _store[email]

    return True