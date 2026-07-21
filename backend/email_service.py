import os
import smtplib

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")


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

def send_complaint_notification(complaint):

    body = f"""
New Complaint Raised

Complaint ID :
{complaint.get("complaint_id","")}

Owner :
{complaint.get("owner_name","")}

Flat :
{complaint.get("block","")}-{complaint.get("flat_no","")}

Complaint Type :
{complaint.get("complaint_type","")}

Subject :
{complaint.get("subject","")}

Description :
{complaint.get("description","")}

Please login to the SATRWA Admin Portal for further action.
"""

    send_email(
        ADMIN_EMAIL,
        "New Complaint Raised",
        body,
    )

def send_gatepass_generated_notification(gp):

    body = f"""
Move Out Gate Pass Generated

Gate Pass No :
{gp["gate_pass_no"]}

Owner :
{gp["owner_name"]}

Flat :
{gp["block"]}-{gp["flat_no"]}

Move Out Date :
{gp["move_out_date"]}

Vehicle :
{gp["vehicle_number"]}

Reason :
{gp["reason"]}

Conveyance Charges :
₹250

Status :
SUCCESS
"""

    send_email(
        ADMIN_EMAIL,
        "Move Out Gate Pass Generated",
        body,
    )

def send_gatepass_denied_notification(data, due):

    body = f"""
Resident attempted to generate a Move Out Gate Pass.

Flat :
{data.block}-{data.flat_no}

Email :
{data.resident_email}

Outstanding Due :
₹{due}

Gate Pass was NOT generated.
"""

    send_email(
        ADMIN_EMAIL,
        "Gate Pass Request Denied",
        body,
    )

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")


FOOTER = """

------------------------------------------------------------
Sri Anjaneya Township Welfare Association
Community Management System (SATRWA)

This is an automated email.
Please do not reply to this email.
------------------------------------------------------------
"""


def _safe_send(to_email, subject, body):

    try:

        send_email(
            to_email,
            subject,
            body + FOOTER,
        )

    except Exception as e:

        print("Email Error:", e)


# -------------------------------------------------
# REGISTRATION
# -------------------------------------------------

def send_registration_approved(email, owner_name, temp_pin):

    body = f"""
Dear {owner_name},

Welcome to Sri Anjaneya Township.

Your registration has been approved.

Temporary PIN

{temp_pin}

Please login and change your PIN immediately.

Thank you.
"""

    _safe_send(
        email,
        "Registration Approved",
        body,
    )


# -------------------------------------------------
# COMPLAINTS
# -------------------------------------------------

def send_complaint_to_resident(doc):

    body = f"""
Dear {doc.get("owner_name","Resident")},

Your complaint has been registered successfully.

Complaint ID
{doc.get("complaint_id","")}

Complaint Type
{doc.get("complaint_type","")}

Subject
{doc.get("subject","")}

Our maintenance team will review your complaint shortly.

Thank you.
"""

    _safe_send(

        doc["email"],

        "Complaint Registered Successfully",

        body,

    )


def send_complaint_to_admin(doc):

    body = f"""
A new complaint has been raised.

Complaint ID
{doc.get("complaint_id","")}

Owner
{doc.get("owner_name","")}

Flat
{doc.get("block","")}-{doc.get("flat_no","")}

Complaint Type
{doc.get("complaint_type","")}

Subject
{doc.get("subject","")}

Description

{doc.get("description","")}
"""

    _safe_send(

        ADMIN_EMAIL,

        "New Complaint Raised",

        body,

    )


# -------------------------------------------------
# GATE PASS
# -------------------------------------------------

def send_gatepass_generated_resident(doc):

    body = f"""
Dear {doc.get("owner_name","Resident")},

Your Move Out Gate Pass has been generated successfully.

Gate Pass Number

{doc.get("gate_pass_no")}

Move Out Date

{doc.get("move_out_date")}

Vehicle

{doc.get("vehicle_number")}

Please show this Gate Pass to the Security Team while exiting.

Thank you.
"""

    _safe_send(

        doc["resident_email"],

        "Move Out Gate Pass Generated",

        body,

    )


def send_gatepass_generated_admin(doc):

    body = f"""
Gate Pass Generated

Gate Pass No

{doc.get("gate_pass_no")}

Owner

{doc.get("owner_name")}

Flat

{doc.get("block")}-{doc.get("flat_no")}

Move Out Date

{doc.get("move_out_date")}

Vehicle

{doc.get("vehicle_number")}

Reason

{doc.get("reason")}
"""

    _safe_send(

        ADMIN_EMAIL,

        "Move Out Gate Pass Generated",

        body,

    )


def send_gatepass_denied_resident(email, due):

    body = f"""
Your Move Out Gate Pass could not be generated.

Outstanding Maintenance Due

₹{due}

Please clear all dues before requesting Gate Pass again.

Thank you.
"""

    _safe_send(

        email,

        "Gate Pass Request Pending",

        body,

    )


def send_gatepass_denied_admin(body, due):

    text = f"""
Resident attempted to generate a Gate Pass.

Flat

{body.block}-{body.flat_no}

Email

{body.resident_email}

Outstanding Due

₹{due}

Gate Pass NOT generated.
"""

    _safe_send(

        ADMIN_EMAIL,

        "Gate Pass Request Denied",

        text,

    )


# -------------------------------------------------
# PAYMENT
# -------------------------------------------------

def send_payment_success_resident(doc):

    body = f"""
Payment Successful

Amount

₹{doc.get("total_amount",0)}

Receipt

{doc.get("receipt_no","")}

Thank you for paying your maintenance.
"""

    _safe_send(

        doc["email"],

        "Maintenance Payment Successful",

        body,

    )


def send_payment_success_admin(doc):

    body = f"""
Maintenance Payment Received

Owner

{doc.get("owner_name","")}

Flat

{doc.get("block","")}-{doc.get("flat_no","")}

Amount

₹{doc.get("total_amount",0)}

Receipt

{doc.get("receipt_no","")}
"""

    _safe_send(

        ADMIN_EMAIL,

        "Maintenance Payment Received",

        body,

    )
