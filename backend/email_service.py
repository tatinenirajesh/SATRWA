import os
import smtplib

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")


def send_email(to_email, subject, body):

    msg = MIMEMultipart()

    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))

    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)

    server.starttls()

    server.login(SMTP_EMAIL, SMTP_PASSWORD)

    server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

    server.quit()


def send_otp(email, otp):

    body = f"""
Sri Anjaneya Township

Your OTP is

{otp}

Valid for 5 minutes.

Do not share this OTP with anyone.
"""

    send_email(email, "SATRWA OTP Verification", body)


def send_temp_pin(email, pin):

    body = f"""
Your temporary PIN is

{pin}

Login immediately and change your PIN.
"""

    send_email(email, "Temporary PIN", body)