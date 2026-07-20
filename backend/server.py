from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, date
from amenity_engine import GYM_SLOTS, POOL_SLOTS, gym_cycle, pool_cycle

import pandas as pd
from reportlab.lib.pagesizes import A5
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
import qrcode
from urllib.parse import quote
from receipt_engine import next_receipt
from admin_payment_engine import verify_payment
from payment_engine import (
    create_payment,
    submit_payment,
    create_gateway_order,
    payment_success,
    payment_failed,
)
from pdf_generator import generate_gate_pass

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
accounts = db.accounts
registration_requests = db.registration_requests
notifications = db.notifications
maintenance_payments = db.maintenance_payments
gym_memberships = db.gym_memberships
gym_bookings = db.gym_bookings
pool_memberships = db.pool_memberships
pool_bookings = db.pool_bookings
guest_room_bookings = db.guest_room_bookings
community_hall_bookings = db.community_hall_bookings

gym_memberships = db.gym_memberships
gym_bookings = db.gym_bookings
pool_memberships = db.pool_memberships
pool_bookings = db.pool_bookings
guest_room_bookings = db.guest_room_bookings
hall_bookings = db.hall_bookings
amenity_invoices = db.amenity_invoices
amenity_payments = db.amenity_payments
guest_room_bookings = db.guest_room_bookings
guest_room_bookings = db.guest_room_bookings
hall_bookings = db.hall_bookings
hall_invoices = db.hall_invoices
community_hall_bookings = db.community_hall_bookings
community_hall_invoices = db.community_hall_invoices
hall_booking_credits = db.hall_booking_credits
payments = db.payments
receipt_books = db.receipt_books
payment_logs = db.payment_logs
commercial_accounts = db.commercial_accounts
commercial_payments = db.commercial_payments
meter_readings = db.meter_readings
audit_logs = db.audit_logs
settings = db.settings

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------------- CONSTANTS ----------------
MAINT_RATES = {"2BHK": 2000, "3BHK": 2500}
CONVEYANCE = 250
GYM_PER_PERSON = 300
POOL_TARIFF = {1: 700, 2: 1000, 3: 1500, 4: 2000}
ADMIN_PIN = "1234"
LATE_FEE_DEFAULT = 50  # ₹ per late month
DUE_DAY = 15  # after this day of current month, current month is also late

# UPI config (society)
UPI_VPA = "satrwa@icici"
UPI_PAYEE_NAME = "Sri Anjaneya Township RWA"
UPI_MERCHANT_SHORT = "SATRWA"

GYM_MONTHLY_FEE = 300

GYM_SLOT_CAPACITY = 5

GYM_MAX_PER_FLAT = 2

GYM_START_DAY = 15

POOL_SINGLE = 700
POOL_DOUBLE = 1000
POOL_TRIPLE = 1500
POOL_FOUR = 2000
POOL_FIVE = 2500

POOL_ADULT_LIMIT = 15
POOL_KID_LIMIT = 5

POOL_START_DAY = 19

ROOM_101_RATE = 1250
ROOM_201_RATE = 1000
ROOM_202_RATE = 1000

FH_RATE = 10000
DH_RATE = 5000

POOL_ADULT_CAPACITY = 15
POOL_KID_CAPACITY = 5

POOL_PRICE = {
    1:700,
    2:1000,
    3:1500,
    4:2000,
    5:2500,
}

GUEST_ROOMS = {
    "101": 1250,
    "201": 1000,
    "202": 1000,
}

ROOM_CHECKIN_TIME = "17:00"
ROOM_CLEANING_CUTOFF = 12

GUEST_ROOM_PRICES = {
    "101": 1250,
    "201": 1000,
    "202": 1000,
}

ROOMS = [
    "101",
    "201",
    "202",
]

ROOM_CHECKIN = "17:00"
ROOM_CLEANING_HOUR = 12

BOOKING_RESERVED = "RESERVED"
BOOKING_CONFIRMED = "CONFIRMED"
BOOKING_CHECKED_IN = "CHECKED_IN"
BOOKING_CHECKED_OUT = "CHECKED_OUT"
BOOKING_COMPLETED = "COMPLETED"
BOOKING_CANCELLED = "CANCELLED"

FUNCTION_HALL_RATE = 10000
DINING_HALL_RATE = 5000

FUNCTION_HALL = "FUNCTION_HALL"
DINING_HALL = "DINING_HALL"

MORNING = "MORNING"
EVENING = "EVENING"

# ---------------- MODELS ----------------

class RequestPinReset(BaseModel):
    email: str


class ResetPin(BaseModel):
    email: str
    otp: str
    new_pin: str
    confirm_pin: str

class ComplaintRequest(BaseModel):
    block: str
    flat_no: str
    owner_name: str
    email: str
    phone: str
    complaint_type: str
    subject: str
    description: str

class GatewayWebhook(BaseModel):

    payment_id: str

    transaction_id: str

    status: str

class CreateGatewayOrder(BaseModel):

    payment_id: str

class SystemSettingsUpdate(BaseModel):

    society_name: str

    society_short_name: str

    maintenance_conveyance: float

    late_fee: float

    gym_fee_per_member: float

    pool_guest_fee: float

    electricity_rate: float

    support_phone: str

    support_email: str

    upi_id: str

class ElectricityRateUpdate(BaseModel):
    email: str
    rate: float

class MeterReadingEntry(BaseModel):
    email: str
    reading: float

class CommercialRentUpdate(BaseModel):
    email: str
    monthly_rent: float

class CommercialLogin(BaseModel):
    email: str
    pin: str

class CommercialRegister(BaseModel):
    account_type: str
    shop_name: str
    owner_name: str
    phone: str
    email: str
    pin: str

class PaymentStatusResponse(BaseModel):
    payment_type: str
    amount: float
    status: str
    verified: bool
    receipt_no: Optional[str] = None
    paid_at: Optional[str] = None

class PaymentReject(BaseModel):
    id: str
    payment_type: str
    pin: str
    reason: str = "Rejected by Admin"

class PaymentApproval(BaseModel):
    id: str
    payment_type: str
    pin: str

class ManualPayment(BaseModel):
    pin: str

    payment_type: str

    block: str
    flat_no: str

    amount: float

    payment_mode: str

    upi_ref_no: str = ""

    remarks: str = ""

class SubmitCentralPayment(BaseModel):

    payment_id:str

    upi_id:str

    upi_ref_no:str

class CommunityHallBookingRequest(BaseModel):

    email: str

    booking_date: str

    function_hall: bool

    dining_hall: bool

    session: Literal[
        "MORNING",
        "EVENING",
    ]

    upi_id: str

    upi_ref_no: str

class VerifyCentralPayment(BaseModel):

    payment_id:str

    verified_by:str

class GuestRoomAvailabilityRequest(BaseModel):
    checkin_date: str
    checkin_time: str


class GuestRoomBookingRequest(BaseModel):
    email: str
    room: Literal["101","201","202"]

    checkin_date: str
    checkout_date: str

    checkin_time: str
    checkout_time: str

    upi_id: str
    upi_ref_no: str

class GuestRoomBookingRequest(BaseModel):
    email: str
    room: Literal["101", "201", "202"]
    checkin_date: str
    checkout_date: str
    checkin_time: str
    checkout_time: str
    upi_id: str
    upi_ref_no: str

class FlatRegister(BaseModel):
    role: Literal["OWNER", "TENANT"]

    block: str
    flat_no: str
    bhk_type: Literal["2BHK", "3BHK"]

    owner_name: str
    phone: str
    email: str

    pin: str
    confirm_pin: str

    otp: str

    start_month: Optional[str] = None

class FlatLogin(BaseModel):
    role: Literal["OWNER", "TENANT", "CORPORATE", "ADMIN"]
    email: str
    pin: str

class PayMaintenance(BaseModel):
    block: str
    flat_no: str
    mode: Literal["full", "current_month"]
    include_conveyance: bool = False
    include_opening_due: bool = False
    upi_id: Optional[str] = ""
    upi_ref_no: Optional[str] = ""

class BookGym(BaseModel):
    block: str
    flat_no: str
    members: int
    booking_date: str
    upi_id: Optional[str] = ""
    upi_ref_no: Optional[str] = ""

class BookPool(BaseModel):
    block: str
    flat_no: str
    persons: int
    booking_date: str
    upi_id: Optional[str] = ""
    upi_ref_no: Optional[str] = ""

class SeriesCreate(BaseModel):
    prefix: str
    start: int
    end: int
    pin: str

class SeriesActivate(BaseModel):
    series_id: str
    pin: str

class LateFeeUpdate(BaseModel):
    late_fee: int
    pin: str

class VerifyPayment(BaseModel):
    receipt_no: str
    pin: str
    verified: bool = True

class OpeningDueSet(BaseModel):
    block: str
    flat_no: str
    amount: float
    pin: str

class FlatDelete(BaseModel):
    block: str
    flat_no: str
    pin: str

class TestPayment(BaseModel):
    block: str
    flat_no: str
    amount: float
    note: Optional[str] = "Admin Test Payment"
    pin: str

class TestReset(BaseModel):
    pin: str
    scope: Literal["flat", "all_test"] = "flat"
    block: Optional[str] = None
    flat_no: Optional[str] = None

class CorporateFlatEntry(BaseModel):
    block: str
    flat_no: str
    bhk_type: Literal["2BHK", "3BHK"] = "2BHK"

class CorporateRegister(BaseModel):
    name: str
    pin: str
    email: Optional[str] = ""
    flats: List[CorporateFlatEntry] = []

class CorporateLogin(BaseModel):
    name: str
    pin: str

class CorporatePayEntry(BaseModel):
    block: str
    flat_no: str
    amount: float
    purpose: Literal["maintenance", "conveyance"] = "maintenance"

class CorporatePay(BaseModel):
    payer_id: str
    entries: List[CorporatePayEntry]
    txn_ref: Optional[str] = ""
    upi_id: Optional[str] = ""

class RecoveryRequest(BaseModel):
    account_type: Literal["individual", "corporate"]
    email: str
    block: Optional[str] = None
    flat_no: Optional[str] = None
    name: Optional[str] = None

class GatePassRequest(BaseModel):
    resident_email: str
    block: str
    flat_no: str
    move_out_date: str
    vehicle_number: str
    reason: str

# ---------------- HELPERS ----------------

async def get_system_settings():

    return await settings.find_one(
        {
            "_id": "SYSTEM"
        }
    )

async def initialize_settings():

    existing = await settings.find_one({"_id": "SYSTEM"})

    if existing:
        return

    await settings.insert_one({

        "_id": "SYSTEM",

        "society_name": "Sri Anjaneya Township Residents Welfare Association",

        "society_short_name": "SATRWA",

        "maintenance_conveyance": 100,

        "late_fee": 100,

        "gym_fee_per_member": 100,

        "pool_guest_fee": 100,

        "pool_price": {
            "1": 700,
            "2": 1000,
            "3": 1500,
            "4": 2000,
            "5": 2500
        },

        "electricity_rate": 15,

        "support_phone": "",

        "support_email": "",

        "upi_id": "",

        "admin_pin": ADMIN_PIN

    })

async def write_audit(action: str, details: dict):

    await audit_logs.insert_one({

        "id": str(uuid.uuid4()),

        "action": action,

        "details": details,

        "created_at": datetime.now(timezone.utc).isoformat()

    })

async def next_receipt_for_payment(payment_type: str, payment_mode: str):

    if payment_type == "maintenance":

        series_type = (
            "maintenance_online"
            if payment_mode == "ONLINE"
            else "maintenance_cash"
        )

    else:

        series_type = "clubhouse"

    return await next_receipt_number(series_type)

async def hall_booking_exists(
    booking_date: str,
):

    return await community_hall_bookings.find_one(
        {
            "booking_date": booking_date,
            "status": {
                "$in": [
                    BOOKING_CONFIRMED,
                    BOOKING_RESERVED,
                ]
            },
        }
    )

def month_range(start_ym: str, end_ym: str) -> List[str]:
    sy, sm = map(int, start_ym.split("-"))
    ey, em = map(int, end_ym.split("-"))
    out = []
    y, m = sy, sm
    while (y, m) <= (ey, em):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m = 1; y += 1
    return out

def current_ym() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.year:04d}-{now.month:02d}"

def today_str() -> str:
    return date.today().isoformat()

async def get_flat(block: str, flat_no: str) -> Optional[dict]:
    return await db.flats.find_one({"block": block.upper(), "flat_no": str(flat_no)}, {"_id": 0})

async def room_rate(room:str):

    return GUEST_ROOM_PRICES[room]

async def rooms_booked_by_flat(
    block: str,
    flat_no: str,
    checkin_date: str,
):

    return await guest_room_bookings.count_documents(
        {
            "block": block,
            "flat_no": flat_no,
            "checkin_date": checkin_date,
            "status": {
                "$in": [
                    "RESERVED",
                    "CONFIRMED",
                    "CHECKED_IN",
                ]
            },
        }
    )

async def get_or_create_corporate_flat(block: str, flat_no: str, bhk_type: str, payer: dict) -> dict:
    """Corporate coverage is independent of individual registration. If the flat doesn't
    exist yet, auto-create a minimal record (no owner_name/phone) so dues can be tracked and
    paid against it. If it already exists (an individual may have registered it, or another
    corporate call already created it), just mark it as corporate-covered."""
    existing = await get_flat(block, flat_no)
    if existing:
        await db.flats.update_one(
            {"block": existing["block"], "flat_no": existing["flat_no"]},
            {"$set": {
                "corporate_covered": True,
                "corporate_payer_id": payer["id"],
                "corporate_payer_name": payer["name"],
            }},
        )
        return await get_flat(block, flat_no)
    now = datetime.now(timezone.utc)
    start_month = f"{now.year}-{str(now.month).zfill(2)}"
    flat = {
        "id": str(uuid.uuid4()),
        "block": block.upper(),
        "flat_no": str(flat_no),
        "bhk_type": bhk_type,
        "owner_name": "",
        "phone": "",
        "start_month": start_month,
        "corporate_covered": True,
        "corporate_payer_id": payer["id"],
        "corporate_payer_name": payer["name"],
        "auto_created": True,
        "created_at": now.isoformat(),
    }
    await db.flats.insert_one(flat.copy())
    return await get_flat(block, flat_no)

async def get_late_fee() -> int:
    return LATE_FEE_DEFAULT

def require_txn_ref(ref: Optional[str]):
    if not (ref or "").strip():
        raise HTTPException(400, "UPI reference number or bank transaction number is required.")

def normalize_email(email: Optional[str]) -> str:
    return (email or "").strip().lower()

from security import (
    hash_pin,
    verify_pin,
    generate_otp,
    generate_temp_pin,
    lock_until,
    MAX_ATTEMPTS,
)

from otp_store import (
    save_otp,
    verify_otp,
)

from email_service import (
    send_otp,
    send_temp_pin,
)

async def get_account(email: str):
    return await accounts.find_one(
        {"email": normalize_email(email)},
        {"_id": 0},
    )


async def pending_registration(email: str):
    return None

async def compute_dues(flat: dict) -> dict:

    if not flat:
        return {
            "bhk_type": None,
            "rate": 0,
            "pending_months": [],
            "pending_count": 0,
            "late_months": [],
            "late_count": 0,
            "late_fee_per_month": 0,
            "late_fee_total": 0,
            "maintenance_total": 0,
            "opening_due": 0,
            "opening_due_remaining": 0,
            "total_due": 0,
            "current_month": current_ym(),
            "current_month_pending": False,
            "current_month_late": False,
            "due_day": DUE_DAY,
            "all_months": [],
            "paid_months": [],
            "has_any_due": False,
        }

    start = flat.get("start_month")

    if not start:

        return {
            "bhk_type": flat.get("bhk_type"),
            "rate": MAINT_RATES.get(flat.get("bhk_type"), 0),
            "pending_months": [],
            "pending_count": 0,
            "late_months": [],
            "late_count": 0,
            "late_fee_per_month": await get_late_fee(),
            "late_fee_total": 0,
            "maintenance_total": 0,
            "opening_due": flat.get("opening_due", 0),
            "opening_due_remaining": flat.get("opening_due", 0),
            "total_due": flat.get("opening_due", 0),
            "current_month": current_ym(),
            "current_month_pending": False,
            "current_month_late": False,
            "due_day": DUE_DAY,
            "all_months": [],
            "paid_months": [],
            "has_any_due": flat.get("opening_due", 0) > 0,
        }

    now_ym = current_ym()

    all_months = month_range(start, now_ym)

    paid_docs = await db.maintenance_payments.find(
        {
            "block": flat["block"],
            "flat_no": flat["flat_no"],
        },
        {"_id": 0},
    ).to_list(1000)

    paid_months = set()

    opening_due_paid = 0.0

    for p in paid_docs:

        for m in p.get("months_covered", []):
            paid_months.add(m)

        opening_due_paid += (
            p.get("opening_due_amount", 0) or 0
        )

    pending = [
        m
        for m in all_months
        if m not in paid_months
    ]

    rate = MAINT_RATES[flat["bhk_type"]]

    late_fee = await get_late_fee()

    today = date.today()

    late_months = []

    for m in pending:

        if m < now_ym:
            late_months.append(m)

        elif (
            m == now_ym
            and today.day > DUE_DAY
        ):
            late_months.append(m)

    late_fee_total = len(late_months) * late_fee

    maint_total = len(pending) * rate

    opening_due_set = flat.get("opening_due", 0) or 0

    opening_due_remaining = max(
        0.0,
        opening_due_set - opening_due_paid,
    )

    total_due = (
        maint_total
        + late_fee_total
        + opening_due_remaining
    )

    return {

        "bhk_type": flat["bhk_type"],

        "rate": rate,

        "pending_months": pending,

        "pending_count": len(pending),

        "late_months": late_months,

        "late_count": len(late_months),

        "late_fee_per_month": late_fee,

        "late_fee_total": late_fee_total,

        "maintenance_total": maint_total,

        "opening_due": opening_due_set,

        "opening_due_remaining": opening_due_remaining,

        "total_due": total_due,

        "current_month": now_ym,

        "current_month_pending": now_ym in pending,

        "current_month_late": now_ym in late_months,

        "due_day": DUE_DAY,

        "all_months": all_months,

        "paid_months": sorted(list(paid_months)),

        "has_any_due": total_due > 0,

    }

async def next_receipt_number() -> str:
    series = await db.receipt_series.find_one({"active": True}, {"_id": 0})
    if not series:
        raise HTTPException(500, "No active receipt series. Ask admin to configure.")
    current = series["current"]
    if current > series["end"]:
        raise HTTPException(400, "Receipt series exhausted. Admin must add new series.")
    receipt_no = f"{series['prefix']}{current:03d}"
    await db.receipt_series.update_one({"id": series["id"]}, {"$set": {"current": current + 1}})
    return receipt_no

def build_upi_url(amount: float, note: str) -> str:
    """Build UPI intent URL — works with any UPI app."""
    params = (
        f"pa={UPI_VPA}"
        f"&pn={quote(UPI_PAYEE_NAME)}"
        f"&am={amount:.2f}"
        f"&cu=INR"
        f"&tn={quote(note)}"
        f"&mc=0000"
    )
    return f"upi://pay?{params}"

async def room_price(room: str):

    return GUEST_ROOMS[room]

async def ensure_seed():
    existing = await db.receipt_series.find_one({})
    if not existing:
        await db.receipt_series.insert_one({
            "id": str(uuid.uuid4()),
            "prefix": "OP",
            "start": 1,
            "end": 100,
            "current": 1,
            "fy_label": "FY-Initial",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    existing = await db.receipt_series.find_one({})
    if not existing:
        await db.receipt_series.insert_one({
            "id": str(uuid.uuid4()),
            "prefix": "OP",
            "start": 1,
            "end": 100,
            "current": 1,
            "fy_label": "FY-Initial",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

# ---------------- ROUTES ----------------
@api_router.get("/")
async def root():
    return {"message": "SATRWA Township API", "ok": True}

@api_router.post("/auth/login")
async def login(body: FlatLogin):

    email = normalize_email(body.email)

    account = await accounts.find_one(
        {
            "email": email,
            "role": body.role,
        },
        {"_id": 0},
    )

    if not account:
        raise HTTPException(400, "Invalid email or PIN.")

    if not account.get("approved", False):
        raise HTTPException(
            403,
            "Your account is pending committee approval."
        )

    locked_until = account.get("locked_until")

    if locked_until:

        unlock_time = datetime.fromisoformat(locked_until)

        if unlock_time > datetime.now(timezone.utc):

            raise HTTPException(
                403,
                "Account locked. Please try again after 15 minutes."
            )

    if not verify_pin(body.pin, account["pin_hash"]):

        attempts = account.get("failed_attempts", 0) + 1

        update = {
            "failed_attempts": attempts
        }

        if attempts >= MAX_ATTEMPTS:
            update["locked_until"] = lock_until().isoformat()

        await accounts.update_one(
            {"id": account["id"]},
            {"$set": update},
        )

        remaining = MAX_ATTEMPTS - attempts

        if remaining > 0:
            raise HTTPException(
                400,
                f"Invalid PIN. {remaining} attempt(s) remaining."
            )

        raise HTTPException(
            403,
            "Account locked for 15 minutes."
        )

    await accounts.update_one(
        {"id": account["id"]},
        {
            "$set": {
                "failed_attempts": 0,
                "locked_until": None,
                "last_login": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    flat = await get_flat(
        account["block"],
        account["flat_no"],
    )

    dues = await compute_dues(flat)

    return {
        "exists": True,
        "account": account,
        "flat": flat,
        "dues": dues,
    }

class SendOTP(BaseModel):
    email: str


class VerifyOTP(BaseModel):
    email: str
    otp: str


class ApproveRegistration(BaseModel):
    registration_id: str
    pin: str

class RejectRegistration(BaseModel):
    registration_id: str
    reason: str

@app.post("/auth/send-otp")
async def auth_send_otp(req: SendOTP):

    email = normalize_email(req.email)

    # Already approved account
    if await get_account(email):
        raise HTTPException(
            400,
            "Email is already registered."
        )

    # Already waiting for committee approval
    existing_request = await registration_requests.find_one(
        {
            "email": email,
            "status": "PENDING",
        }
    )

    if existing_request:
        raise HTTPException(
            400,
            "Registration is already pending committee approval."
        )

    otp = generate_otp()

    save_otp(email, otp)

    try:
        send_otp(email, otp)
    except Exception as ex:
        raise HTTPException(
            500,
            f"Unable to send OTP. {ex}"
        )

    return {
        "success": True,
        "message": "OTP sent successfully."
    }


@app.post("/auth/verify-otp")
async def auth_verify_otp(req: VerifyOTP):

    email = normalize_email(req.email)

    ok = verify_otp(email, req.otp)

    if not ok:
        raise HTTPException(400, "Invalid or expired OTP.")

    return {
        "success": True,
        "verified": True
    }

@app.post("/auth/request-pin-reset")
async def request_pin_reset(req: RequestPinReset):

    email = normalize_email(req.email)

    account = await accounts.find_one(
        {"email": email},
        {"_id": 0},
    )

    if not account:
        raise HTTPException(
            404,
            "Account not found."
        )

    otp = generate_otp()

    save_otp(email, otp)

    send_otp(email, otp)

    return {
        "success": True,
        "message": "OTP sent successfully."
    }

@app.post("/auth/reset-pin")
async def reset_pin(req: ResetPin):

    email = normalize_email(req.email)

    if req.new_pin != req.confirm_pin:
        raise HTTPException(
            400,
            "PINs do not match."
        )

    if len(req.new_pin) != 4 or not req.new_pin.isdigit():
        raise HTTPException(
            400,
            "PIN must be exactly 4 digits."
        )

    if not verify_otp(email, req.otp):
        raise HTTPException(
            400,
            "Invalid or expired OTP."
        )

    account = await accounts.find_one(
        {"email": email}
    )

    if not account:
        raise HTTPException(
            404,
            "Account not found."
        )

    await accounts.update_one(
        {"email": email},
        {
            "$set": {
                "pin_hash": hash_pin(req.new_pin),
                "failed_attempts": 0,
                "locked_until": None,
            }
        }
    )

    return {
        "success": True,
        "message": "PIN reset successfully."
    }

@app.get("/admin/pending-registrations")
async def pending_registrations():

    rows = []

    async for item in registration_requests.find(
        {"status": "PENDING"},
        {"_id": 0}
    ):

        rows.append(item)

    return rows


@api_router.post("/admin/reject-registration")
async def reject_registration(body: RejectRegistration):

    req = await registration_requests.find_one(
        {"id": body.registration_id},
        {"_id": 0},
    )

    if not req:
        raise HTTPException(404, "Registration not found.")

    await registration_requests.update_one(
        {"id": body.registration_id},
        {
            "$set": {
                "status": "REJECTED",
                "reason": body.reason,
                "approved": False,
                "rejected_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    return {
        "success": True
    }

@api_router.post("/auth/register")
async def register(body: FlatRegister):

    email = normalize_email(body.email)

    if body.pin != body.confirm_pin:
        raise HTTPException(400, "PINs do not match.")

    if not verify_otp(email, body.otp):
        raise HTTPException(400, "Invalid or expired OTP.")

    if body.block.upper() not in ["A", "B", "C", "D", "F"]:
        raise HTTPException(400, "Invalid Block.")

    existing = await accounts.find_one(
        {
            "email": email
        },
        {
            "_id": 0
        }
    )

    if existing:
        raise HTTPException(400, "Email already registered.")

    account = {

        "id": str(uuid.uuid4()),

        "role": body.role,

        "block": body.block.upper(),

        "flat_no": str(body.flat_no),

        "bhk_type": body.bhk_type,

        "owner_name": body.owner_name,

        "phone": body.phone,

        "email": email,

        "pin_hash": hash_pin(body.pin),

        "status": "ACTIVE",

        "approved": True,

        "created_at": datetime.now(timezone.utc).isoformat(),

    }

    await accounts.insert_one(account)

    flat = await db.flats.find_one(
        {
            "block": body.block.upper(),
            "flat_no": str(body.flat_no)
        }
    )

    if not flat:

        await db.flats.insert_one({

            "id": str(uuid.uuid4()),

            "block": body.block.upper(),

            "flat_no": str(body.flat_no),

            "bhk_type": body.bhk_type,

            "owner_name": body.owner_name,

            "phone": body.phone,

            "email": email,

            "start_month": datetime.now().strftime("%Y-%m"),

            "corporate_covered": False,

            "corporate_payer_id": None,

            "corporate_payer_name": None,

            "auto_created": False,

            "created_at": datetime.now(timezone.utc).isoformat(),

        })

    return {

        "success": True,

        "message": "Registration completed successfully.",

        "status": "ACTIVE",

    }

@api_router.get("/dues/{block}/{flat_no}")
async def get_dues(block: str, flat_no: str):
    flat = await get_flat(block, flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    dues = await compute_dues(flat)
    return {"flat": flat, "dues": dues}

@api_router.post("/maintenance/pay")
async def pay_maintenance(body: PayMaintenance):

    flat = await get_flat(body.block, body.flat_no)

    if not flat:
        raise HTTPException(404, "Flat not registered")

    dues = await compute_dues(flat)

    pending = dues["pending_months"]

    opening_due_remaining = dues["opening_due_remaining"]

    if (
        not pending
        and not body.include_conveyance
        and not (
            body.include_opening_due
            and opening_due_remaining > 0
        )
    ):
        raise HTTPException(
            400,
            "No dues to pay."
        )

    if body.mode == "full":

        months_to_pay = pending

    else:

        now_ym = current_ym()

        if now_ym not in pending:

            raise HTTPException(
                400,
                "Current month is already paid."
            )

        months_to_pay = [now_ym]

    late_fee_pm = dues["late_fee_per_month"]

    late_months_paid = [

        m

        for m in months_to_pay

        if m in dues["late_months"]

    ]

    late_fee_amount = len(late_months_paid) * late_fee_pm

    rate = dues["rate"]

    maint_amount = len(months_to_pay) * rate

    conveyance = (
        CONVEYANCE
        if body.include_conveyance
        else 0
    )

    opening_due_amount = (

        opening_due_remaining

        if (
            body.include_opening_due
            and body.mode == "full"
        )

        else 0

    )

    total = (

        maint_amount
        + conveyance
        + late_fee_amount
        + opening_due_amount

    )

    payment = await create_payment(

        db,

        module="MAINTENANCE",

        entity_type="RESIDENT",

        entity_id=f"{flat['block']}-{flat['flat_no']}",

        payer_name=flat.get(
            "owner_name",
            "",
        ),

        block=flat["block"],

        flat_no=flat["flat_no"],

        amount=total,

        payment_mode="ICICI",

        receipt_book="MAINTENANCE",

    )

    now_iso = datetime.now(
        timezone.utc
    ).isoformat()

    doc = {

        "id": str(uuid.uuid4()),

        "payment_id": payment["payment_id"],

        "receipt_no": None,

        "type": "maintenance",

        "block": flat["block"],

        "flat_no": flat["flat_no"],

        "owner_name": flat.get(
            "owner_name",
            "",
        ),

        "phone": flat.get(
            "phone",
            "",
        ),

        "bhk_type": flat["bhk_type"],

        "mode": body.mode,

        "months_covered": months_to_pay,

        "months_count": len(
            months_to_pay
        ),

        "rate": rate,

        "maintenance_amount": maint_amount,

        "conveyance_amount": conveyance,

        "late_fee_amount": late_fee_amount,

        "late_months_paid": late_months_paid,

        "opening_due_amount": opening_due_amount,

        "total_amount": total,

        "gateway": "ICICI",

        "gateway_status": "NOT_STARTED",

        "upi_id": body.upi_id or "",

        "upi_ref_no": (
            body.upi_ref_no or ""
        ).strip(),

        "verified": False,

        "status": "PENDING_VERIFICATION",

        "paid_at": now_iso,

        "timeline": [

            {

                "status": "PAYMENT_CREATED",

                "at": now_iso,

                "by": "SYSTEM",

            }

        ],

        "paid_date": today_str(),

    }

    await db.maintenance_payments.insert_one(doc)

    fresh_dues = await compute_dues(flat)

    return {

        "success": True,

        "gateway": "ICICI",

        "payment": payment,

        "receipt": doc,

        "dues": fresh_dues,

    }

@api_router.post("/payment/create-order")
async def create_gateway_order_api(
    body: CreateGatewayOrder,
):

    payment = await db.payments.find_one(
        {
            "payment_id": body.payment_id,
        },
        {
            "_id": 0,
        },
    )

    if not payment:

        raise HTTPException(
            404,
            "Payment not found.",
        )

    order_id = str(uuid.uuid4())

    payment_url = ""

    await create_gateway_order(

        db,

        payment["payment_id"],

        order_id,

        payment_url,

    )

    return {

        "success": True,

        "gateway": "ICICI",

        "order_id": order_id,

        "payment_url": payment_url,

    }

@api_router.post("/payment/webhook")
async def payment_webhook(
    body: GatewayWebhook,
):

    if body.status == "SUCCESS":

        await payment_success(

            db,

            body.payment_id,

            body.transaction_id,

        )

    else:

        await payment_failed(

            db,

            body.payment_id,

        )

    return {

        "success": True,

    }

@api_router.post("/amenity/gym")
async def book_gym(body: BookGym):
    require_txn_ref(body.upi_ref_no)

    flat = await get_flat(body.block, body.flat_no)

    if not flat:
        raise HTTPException(404, "Flat not registered")

    dues = await compute_dues(flat)

    if dues["has_any_due"]:
        raise HTTPException(
            status_code=402,
            detail={
                "message": "Clear maintenance dues before booking amenity.",
                "dues": dues,
            },
        )

    if body.members <= 0:
        raise HTTPException(400, "Members must be at least 1.")

    cfg = await get_system_settings()

    gym_fee = cfg["gym_fee_per_member"]

    total = body.members * gym_fee

    receipt_no = None

    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": str(uuid.uuid4()),
        "receipt_no": None,
        "type": "gym",
        "block": flat["block"],
        "flat_no": flat["flat_no"],
        "owner_name": flat.get("owner_name", ""),
        "phone": flat.get("phone", ""),
        "email": flat.get("email", ""),
        "bhk_type": flat["bhk_type"],
        "members": body.members,
        "rate_per_person": GYM_PER_PERSON,
        "total_amount": total,
        "booking_date": body.booking_date,
        "upi_id": body.upi_id or "",
        "upi_ref_no": (body.upi_ref_no or "").strip(),
        "verified": False,
        "status": "PENDING_VERIFICATION",
        "paid_at": now_iso,
        "paid_date": today_str(),
        "timeline": [
            {
                "status": "SUBMITTED",
                "at": now_iso,
                "by": "RESIDENT",
            }
        ],
    }

    await db.amenity_bookings.insert_one(doc.copy())

    doc.pop("_id", None)

    return {
        "receipt": doc
    }
@api_router.post("/amenity/pool")
async def book_pool(body: BookPool):
    require_txn_ref(body.upi_ref_no)
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    dues = await compute_dues(flat)
    if dues["has_any_due"]:
        raise HTTPException(status_code=402, detail={
            "message": "Clear maintenance dues before booking amenity.",
            "dues": dues,
        })
    if body.persons not in POOL_TARIFF:
        raise HTTPException(400, "Persons must be 1, 2, 3 or 4.")
    total = POOL_TARIFF[body.persons]
    receipt_no = None
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_no": None,
        "type": "pool",
        "block": flat["block"],
        "flat_no": flat["flat_no"],
        "owner_name": flat.get("owner_name", ""),
        "phone": flat.get("phone", ""),
        "bhk_type": flat["bhk_type"],
        "persons": body.persons,
        "total_amount": total,
        "booking_date": body.booking_date,
        "upi_id": body.upi_id or "",
        "upi_ref_no": (body.upi_ref_no or "").strip(),
        "verified": False,
        "status": "PENDING_VERIFICATION",
        "timeline": [
    {
        "status": "SUBMITTED",
        "at": now_iso,
        "by": "RESIDENT"
    }
],
    }
    await db.amenity_bookings.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"receipt": doc}

@api_router.get("/tariff")
async def get_tariff():
    return {
        "maintenance": MAINT_RATES,
        "conveyance": CONVEYANCE,
        "gym_per_person": GYM_PER_PERSON,
        "pool": POOL_TARIFF,
        "late_fee": await get_late_fee(),
        "due_day": DUE_DAY,
    }

@api_router.get("/upi/info")
async def upi_info(amount: float, note: str = "Payment"):
    upi_url = build_upi_url(amount, note)
    return {
        "vpa": UPI_VPA,
        "payee_name": UPI_PAYEE_NAME,
        "amount": amount,
        "note": note,
        "upi_url": upi_url,
        "gpay_url": "tez://" + upi_url.split("://", 1)[1],
        "phonepe_url": "phonepe://pay?" + upi_url.split("?", 1)[1],
        "paytm_url": "paytmmp://pay?" + upi_url.split("?", 1)[1],
    }

@api_router.get("/upi/qr")
async def upi_qr(amount: float, note: str = "Payment"):
    upi_url = build_upi_url(amount, note)
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    qr.add_data(upi_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0A0A0A", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png", headers={"Cache-Control": "no-cache"})

@api_router.get("/history/{block}/{flat_no}")
async def history(block: str, flat_no: str):
    m = await db.maintenance_payments.find(
        {"block": block.upper(), "flat_no": str(flat_no)}, {"_id": 0}
    ).sort("paid_at", -1).to_list(500)
    b = await db.amenity_bookings.find(
        {"block": block.upper(), "flat_no": str(flat_no)}, {"_id": 0}
    ).sort("paid_at", -1).to_list(500)
    return {"maintenance": m, "bookings": b}

@api_router.get("/receipt/{receipt_no}")
async def get_receipt(receipt_no: str):
    doc = await db.maintenance_payments.find_one({"receipt_no": receipt_no}, {"_id": 0})
    if not doc:
        doc = await db.amenity_bookings.find_one({"receipt_no": receipt_no}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Receipt not found")
    return doc

def _draw_receipt_pdf(rec: dict) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A5)
    W, H = A5

    gold = colors.HexColor("#B5952F")
    dark = colors.HexColor("#0A0A0A")
    grey = colors.HexColor("#555555")

    # Border frame
    c.setStrokeColor(gold); c.setLineWidth(1.5)
    c.rect(10*mm, 10*mm, W - 20*mm, H - 20*mm)
    c.setLineWidth(0.3)
    c.rect(12*mm, 12*mm, W - 24*mm, H - 24*mm)

    # Header
    c.setFillColor(gold); c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(W/2, H - 26*mm, "SATRWA")
    c.setFillColor(dark); c.setFont("Helvetica", 11)
    c.drawCentredString(W/2, H - 34*mm, "Sri Anjaneya Township")
    c.setStrokeColor(gold); c.setLineWidth(0.5)
    c.line(W/2 - 15*mm, H - 37*mm, W/2 + 15*mm, H - 37*mm)

    # Receipt No + Date
    c.setFont("Helvetica-Bold", 10); c.setFillColor(dark)
    c.drawString(18*mm, H - 50*mm, "RECEIPT NO")
    c.setFont("Helvetica-Bold", 16); c.setFillColor(gold)
    c.drawString(18*mm, H - 58*mm, rec["receipt_no"])
    c.setFillColor(dark); c.setFont("Helvetica-Bold", 10)
    c.drawRightString(W - 18*mm, H - 50*mm, "DATE")
    dt = datetime.fromisoformat(rec["paid_at"].replace("Z", "+00:00"))
    c.setFont("Helvetica", 12)
    c.drawRightString(W - 18*mm, H - 58*mm, dt.strftime("%d %b %Y"))

    # Body
    y = H - 72*mm
    c.setLineWidth(0.3); c.setStrokeColor(gold)
    c.line(18*mm, y, W - 18*mm, y)
    y -= 8*mm

    def row(label, value):
        nonlocal y
        c.setFillColor(grey); c.setFont("Helvetica", 9)
        c.drawString(18*mm, y, label.upper())
        c.setFillColor(dark); c.setFont("Helvetica", 11)
        c.drawRightString(W - 18*mm, y, str(value))
        y -= 6.5*mm

    type_label = {"maintenance": "Maintenance Payment", "gym": "Gymnasium Booking", "pool": "Swimming Pool Booking"}.get(rec["type"], rec["type"].title())
    row("Type", type_label)
    row("Block / Flat", f"{rec['block']} - {rec['flat_no']}")
    if rec.get("owner_name"):
        row("Owner", rec["owner_name"])
    if rec.get("phone"):
        row("Phone", rec["phone"])

    if rec["type"] == "maintenance":
        row("Flat Type", rec["bhk_type"])
        row("Rate/month", f"Rs. {rec['rate']}")
        row("Months Paid", f"{rec['months_count']}")
        months = rec.get("months_covered", [])
        if months:
            row("Period", ", ".join(months[:6]) + ("..." if len(months) > 6 else ""))
        if rec.get("late_fee_amount", 0) > 0:
            row("Late Fee", f"Rs. {rec['late_fee_amount']}")
        if rec.get("conveyance_amount", 0) > 0:
            row("Conveyance", f"Rs. {rec['conveyance_amount']}")
    elif rec["type"] == "gym":
        row("Members", rec["members"])
        row("Rate", f"Rs. {rec['rate_per_person']} / person")
        row("Booking Date", rec["booking_date"])
    elif rec["type"] == "pool":
        row("Persons", rec["persons"])
        row("Booking Date", rec["booking_date"])

    row("UPI ID", rec.get("upi_id") or "-")
    if rec.get("upi_ref_no"):
        row("UPI Ref No", rec["upi_ref_no"])

    # Total
    y -= 4*mm
    c.setLineWidth(0.5); c.setStrokeColor(gold)
    c.line(18*mm, y, W - 18*mm, y)
    y -= 10*mm
    c.setFillColor(dark); c.setFont("Helvetica-Bold", 14)
    c.drawString(18*mm, y, "TOTAL PAID")
    c.setFillColor(gold); c.setFont("Helvetica-Bold", 20)
    c.drawRightString(W - 18*mm, y, f"Rs. {rec['total_amount']:,}")

    # PAID stamp — green if verified, gold if pending
    verified = bool(rec.get("verified"))
    stamp_color = colors.HexColor("#1E7A3E") if verified else colors.HexColor("#B5952F")
    stamp_text = "PAID" if verified else "PENDING"
    c.saveState()
    c.translate(W - 45*mm, 40*mm); c.rotate(-15)
    c.setStrokeColor(stamp_color); c.setFillColor(stamp_color)
    c.setLineWidth(2)
    c.rect(-18*mm, -6*mm, 36*mm, 12*mm)
    c.setFont("Helvetica-Bold", 14 if not verified else 18)
    c.drawCentredString(0, -3*mm, stamp_text)
    c.restoreState()

    # Footer
    c.setFillColor(grey); c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(W/2, 18*mm, "This is a computer-generated receipt from SATRWA Township App.")

    c.showPage(); c.save()
    buf.seek(0)
    return buf.getvalue()

@api_router.get("/receipt/{receipt_no}/pdf")
async def receipt_pdf(receipt_no: str):
    doc = await db.maintenance_payments.find_one({"receipt_no": receipt_no}, {"_id": 0})
    if not doc:
        doc = await db.amenity_bookings.find_one({"receipt_no": receipt_no}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Receipt not found")
    pdf_bytes = _draw_receipt_pdf(doc)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={receipt_no}.pdf"},
    )

@api_router.post("/admin/verify-payment")
async def admin_verify_payment(body: VerifyPayment):
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    upd = {"verified": body.verified, "verified_at": datetime.now(timezone.utc).isoformat() if body.verified else None}
    r1 = await db.maintenance_payments.update_one({"receipt_no": body.receipt_no}, {"$set": upd})
    if r1.matched_count == 0:
        r2 = await db.amenity_bookings.update_one({"receipt_no": body.receipt_no}, {"$set": upd})
        if r2.matched_count == 0:
            raise HTTPException(404, "Receipt not found")
    rec = await db.maintenance_payments.find_one({"receipt_no": body.receipt_no}, {"_id": 0})
    if not rec:
        rec = await db.amenity_bookings.find_one({"receipt_no": body.receipt_no}, {"_id": 0})
    if body.verified and rec:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "payment_verified",
            "receipt_no": body.receipt_no,
            "block": rec.get("block"),
            "flat_no": rec.get("flat_no"),
            "corporate_payer_id": rec.get("corporate_payer_id"),
            "title": "Payment verified",
            "message": f"Receipt {body.receipt_no} has been verified by the committee.",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"ok": True, "verified": body.verified}

# -------- ADMIN: TEST TOOLS --------
@api_router.post("/admin/test-payment")
async def admin_test_payment(body: TestPayment):
    """Record a payment of any custom amount (e.g. Re.1) for real UPI testing. Tagged is_test=True."""
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be greater than 0")
    receipt_no = None
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_no": None,
        "type": "maintenance",
        "block": flat["block"],
        "flat_no": flat["flat_no"],
        "owner_name": flat.get("owner_name", ""),
        "phone": flat.get("phone", ""),
        "bhk_type": flat["bhk_type"],
        "mode": "test",
        "months_covered": [],
        "months_count": 0,
        "rate": 0,
        "maintenance_amount": 0,
        "conveyance_amount": 0,
        "late_fee_amount": 0,
        "opening_due_amount": 0,
        "total_amount": body.amount,
        "upi_id": "",
        "upi_ref_no": "",
        "note": body.note,
        "is_test": True,
        "verified": False,
        "status": "PENDING_VERIFICATION",
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "paid_date": today_str(),
    }
    await db.maintenance_payments.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"receipt": doc}

@api_router.post("/admin/test-reset")
async def admin_test_reset(body: TestReset):
    """Reset test data: either wipe payments for one flat, or wipe every payment tagged is_test."""
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    if body.scope == "all_test":
        r1 = await db.maintenance_payments.delete_many({"is_test": True})
        r2 = await db.amenity_bookings.delete_many({"is_test": True})
        return {"ok": True, "deleted_maintenance": r1.deleted_count, "deleted_bookings": r2.deleted_count}
    else:
        if not body.block or not body.flat_no:
            raise HTTPException(400, "block and flat_no required for scope=flat")
        q = {"block": body.block.upper(), "flat_no": str(body.flat_no)}
        r1 = await db.maintenance_payments.delete_many(q)
        r2 = await db.amenity_bookings.delete_many(q)
        return {"ok": True, "deleted_maintenance": r1.deleted_count, "deleted_bookings": r2.deleted_count}

# -------- ADMIN: OPENING DUES --------
@api_router.post("/admin/opening-due")
async def set_opening_due(body: OpeningDueSet):
    """Admin manually sets a flat's opening/historical due (pre-app balance)."""
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    if body.amount < 0:
        raise HTTPException(400, "Amount cannot be negative")
    await db.flats.update_one(
        {"block": flat["block"], "flat_no": flat["flat_no"]},
        {"$set": {"opening_due": body.amount}},
    )
    updated_flat = await get_flat(body.block, body.flat_no)
    dues = await compute_dues(updated_flat)
    return {"flat": updated_flat, "dues": dues}

@api_router.post("/admin/manual-payment")
async def admin_manual_payment(body: ManualPayment):

    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")

    flat = await get_flat(
        body.block,
        body.flat_no,
    )

    if not flat:
        raise HTTPException(
            404,
            "Flat not found."
        )

    receipt_no = await next_receipt_number()

    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {

        "id":str(uuid.uuid4()),

        "receipt_no":receipt_no,

        "type":body.payment_type,

        "block":body.block,

        "flat_no":body.flat_no,

        "owner_name":flat.get(
            "owner_name",
            "",
        ),

        "payment_mode":body.payment_mode,

        "amount":body.amount,

        "upi_ref_no":body.upi_ref_no,

        "remarks":body.remarks,

        "verified":True,

        "verified_by":"ADMIN",

        "created_at":now.isoformat(),

        "paid_date":today_str(),
         
         "timeline": [
    {
        "status": "SUBMITTED",
        "at": now_iso,
        "by": "ADMIN"
    }
],

    }

    await db.manual_payments.insert_one(doc.copy())

    return {
        "success": True,
        "receipt_no": None,
        "payment": doc,
    }

@api_router.get("/admin/opening-dues")
async def list_opening_dues():
    """List all flats with a non-zero opening due, for admin review."""
    flats = await db.flats.find({"opening_due": {"$gt": 0}}, {"_id": 0}).to_list(1000)
    out = []
    for f in flats:
        dues = await compute_dues(f)
        out.append({"flat": f, "dues": dues})
    return {"flats": out}

# -------- ADMIN: FLAT MANAGEMENT --------
@api_router.get("/admin/flats")
async def list_flats():
    flats = await db.flats.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return {"flats": flats}

@api_router.post("/admin/flat/delete")
async def delete_flat(body: FlatDelete):
    """Fully remove a flat's registration and ALL its payment history (maintenance + amenities)."""
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    q = {"block": flat["block"], "flat_no": flat["flat_no"]}
    r0 = await db.flats.delete_one(q)
    r1 = await db.maintenance_payments.delete_many(q)
    r2 = await db.amenity_bookings.delete_many(q)
    return {
        "ok": True,
        "flat_deleted": r0.deleted_count > 0,
        "deleted_maintenance": r1.deleted_count,
        "deleted_bookings": r2.deleted_count,
    }

# -------- CORPORATE / BULK PAYER --------
async def get_corporate(name: str) -> Optional[dict]:
    return await db.corporate_payers.find_one({"name": name}, {"_id": 0})

@api_router.post("/corporate/register")
async def corporate_register(body: CorporateRegister):
    existing = await get_corporate(body.name)
    if existing:
        raise HTTPException(400, "Corporate payer already registered. Please login.")
    if not body.pin or len(body.pin) < 4:
        raise HTTPException(400, "PIN must be at least 4 digits")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "pin": body.pin,
        "email": normalize_email(body.email),
        "flats": [{"block": f.block.upper(), "flat_no": str(f.flat_no)} for f in body.flats],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.corporate_payers.insert_one(doc.copy())
    # Independent of individual registration — auto-create/tag each covered flat now.
    for f in body.flats:
        await get_or_create_corporate_flat(f.block, f.flat_no, f.bhk_type, doc)
    doc.pop("_id", None)
    doc.pop("pin", None)
    return {"payer": doc}

@api_router.post("/corporate/login")
async def corporate_login(body: CorporateLogin):
    payer = await get_corporate(body.name)
    if not payer or payer.get("pin") != body.pin:
        raise HTTPException(401, "Invalid name or PIN")
    payer.pop("pin", None)
    # These flats always exist now (auto-created on add), so dues are always available.
    flats_with_dues = []
    for entry in payer.get("flats", []):
        flat = await get_flat(entry["block"], entry["flat_no"])
        if flat:
            dues = await compute_dues(flat)
            flats_with_dues.append({"block": flat["block"], "flat_no": flat["flat_no"], "registered": True, "dues": dues})
        else:
            flats_with_dues.append({"block": entry["block"], "flat_no": entry["flat_no"], "registered": False, "dues": None})
    payer["flats"] = flats_with_dues
    return {"payer": payer}

@api_router.post("/corporate/flats/add")
async def corporate_add_flat(payer_id: str, block: str, flat_no: str, pin: str, bhk_type: str = "2BHK"):
    payer = await db.corporate_payers.find_one({"id": payer_id}, {"_id": 0})
    if not payer or payer.get("pin") != pin:
        raise HTTPException(401, "Invalid payer or PIN")
    if bhk_type not in ("2BHK", "3BHK"):
        bhk_type = "2BHK"
    flats = payer.get("flats", [])
    if not any(f["block"] == block.upper() and f["flat_no"] == str(flat_no) for f in flats):
        flats.append({"block": block.upper(), "flat_no": str(flat_no)})
        await db.corporate_payers.update_one({"id": payer_id}, {"$set": {"flats": flats}})
    # Independent of individual registration — this flat now exists and is marked corporate-covered,
    # regardless of whether any resident has ever logged into the app for it.
    await get_or_create_corporate_flat(block, flat_no, bhk_type, payer)
    return {"ok": True, "flats": flats}

@api_router.post("/corporate/pay")
async def corporate_pay(body: CorporatePay):
    payer = await db.corporate_payers.find_one({"id": body.payer_id}, {"_id": 0})
    if not payer:
        raise HTTPException(404, "Corporate payer not found")
    if not body.entries:
        raise HTTPException(400, "No flats/amounts provided")
    require_txn_ref(body.txn_ref)

    # Validate ALL entries first (stop before any payment if any flat is invalid). Since coverage
    # is independent of individual registration, a flat "not found" here only means it was never
    # added via /corporate/flats/add for this payer — not that the resident must register first.
    covered = {(f["block"], f["flat_no"]) for f in payer.get("flats", [])}
    validated = []
    errors = []
    for e in body.entries:
        if (e.block.upper(), str(e.flat_no)) not in covered:
            errors.append(f"{e.block}-{e.flat_no}: not in your covered flats list — add it first")
            continue
        flat = await get_flat(e.block, e.flat_no)
        if not flat:
            errors.append(f"{e.block}-{e.flat_no}: flat record missing — re-add it to your covered list")
            continue
        if e.amount <= 0:
            errors.append(f"{e.block}-{e.flat_no}: amount must be greater than 0")
            continue
        dues = await compute_dues(flat)
        validated.append({"flat": flat, "dues": dues, "amount": e.amount, "purpose": e.purpose})
    if errors:
        raise HTTPException(400, {"message": "Fix the following before payment can proceed", "errors": errors})

    group_id = str(uuid.uuid4())
    receipts = []
    for item in validated:
        flat, dues, amount, purpose = item["flat"], item["dues"], item["amount"], item["purpose"]
        receipt_no = None

        if purpose == "conveyance":
            months_to_pay, rate, maint_amt, leftover = [], 0, 0, 0
            conveyance_amt = amount
        else:
            rate = dues["rate"]
            pending = dues["pending_months"]
            months_affordable = int(amount // rate) if rate else 0
            months_to_pay = pending[:months_affordable] if months_affordable > 0 else []
            leftover = amount - (len(months_to_pay) * rate)
            maint_amt = len(months_to_pay) * rate
            conveyance_amt = 0

        doc = {
            "id": str(uuid.uuid4()),
            "receipt_no": None,
            "type": "maintenance" if purpose == "maintenance" else "conveyance",
            "block": flat["block"],
            "flat_no": flat["flat_no"],
            "owner_name": flat.get("owner_name", ""),
            "phone": flat.get("phone", ""),
            "bhk_type": flat["bhk_type"],
            "mode": "corporate",
            "months_covered": months_to_pay,
            "months_count": len(months_to_pay),
            "rate": rate,
            "maintenance_amount": maint_amt,
            "conveyance_amount": conveyance_amt,
            "late_fee_amount": 0,
            "opening_due_amount": 0,
            "leftover_credit": leftover,
            "total_amount": amount,
            "upi_id": body.upi_id or "",
            "upi_ref_no": (body.txn_ref or "").strip(),
            "corporate_payer_id": payer["id"],
            "corporate_payer_name": payer["name"],
            "corporate_group_id": group_id,
            "verified": False,
            "status": "PENDING_VERIFICATION",
           "timeline": [
    {
        "status": "SUBMITTED",
        "at": now_iso,
        "by": "CORPORATE"
    }
],
        }
        await db.maintenance_payments.insert_one(doc.copy())
        doc.pop("_id", None)
        receipts.append(doc)

    return {"group_id": group_id, "receipts": receipts, "total_paid": sum(r["total_amount"] for r in receipts)}

# -------- ADMIN --------
@api_router.post("/admin/verify")
async def admin_verify(body: dict):
    return {"ok": body.get("pin") == ADMIN_PIN}

@api_router.get("/admin/series")
async def list_series():
    series = await db.receipt_series.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"series": series}

@api_router.post("/admin/series")
async def add_series(body: SeriesCreate):
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    if body.start <= 0 or body.end < body.start:
        raise HTTPException(400, "Invalid range")
    await db.receipt_series.update_many({}, {"$set": {"active": False}})
    doc = {
        "id": str(uuid.uuid4()),
        "prefix": body.prefix.upper(),
        "start": body.start,
        "end": body.end,
        "current": body.start,
        "fy_label": f"{body.prefix.upper()}-{body.start}-{body.end}",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.receipt_series.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"series": doc}

@api_router.post("/admin/series/activate")
async def activate_series(body: SeriesActivate):
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    await db.receipt_series.update_many({}, {"$set": {"active": False}})
    res = await db.receipt_series.update_one({"id": body.series_id}, {"$set": {"active": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Series not found")
    return {"ok": True}

@api_router.get("/admin/late-fee")
async def get_admin_late_fee():
    return {"late_fee": await get_late_fee()}

@api_router.post("/admin/late-fee")
async def set_admin_late_fee(body: LateFeeUpdate):
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    raise HTTPException(403, f"Late fee is fixed at {LATE_FEE_DEFAULT} after the {DUE_DAY}th and cannot be changed.")

@api_router.post("/auth/recovery/request")
async def request_recovery(body: RecoveryRequest):
    email = normalize_email(body.email)
    if not email:
        raise HTTPException(400, "Registered email is required.")
    if body.account_type == "individual":
        if not body.block or not body.flat_no:
            raise HTTPException(400, "Block and flat number are required.")
        account = await get_flat(body.block, body.flat_no)
        account_id = account.get("id") if account and normalize_email(account.get("email")) == email else None
    else:
        if not body.name:
            raise HTTPException(400, "Corporate name is required.")
        account = await get_corporate(body.name)
        account_id = account.get("id") if account and normalize_email(account.get("email")) == email else None
    if account_id:
        await db.recovery_requests.insert_one({
            "id": str(uuid.uuid4()),
            "account_type": body.account_type,
            "account_id": account_id,
            "email": email,
            "status": "pending_committee_action",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return {
        "ok": True,
        "message": "If the email matches our records, the committee will contact you to reset access securely.",
    }


@api_router.get("/admin/payments")
async def admin_payments(

    status:str="PAYMENT_PENDING_VERIFICATION",

):

    rows = await db.payments.find(

        {

            "status":status,

        },

        {

            "_id":0,

        },

    ).sort(

        "created_at",

        1,

    ).to_list(1000)

    return {
    "maintenance": maintenance_rows,
    "bookings": booking_rows,
}

@api_router.get("/admin/payment/{payment_id}")
async def admin_payment_details(
    payment_id: str,
):

    payment = await db.payments.find_one(
        {
            "payment_id": payment_id,
        },
        {
            "_id": 0,
        },
    )

    if not payment:
        raise HTTPException(
            404,
            "Payment not found.",
        )

    return payment

@api_router.get("/admin/payment-history")
async def admin_payment_history(

    module: str = None,

):

    query = {}

    if module:

        query["module"] = module.upper()

    rows = await db.payments.find(

        query,

        {

            "_id": 0,

        },

    ).sort(

        "created_at",

        -1,

    ).to_list(1000)

    return rows

@api_router.get("/admin/payment-books")
async def payment_books():

    rows = await db.receipt_books.find(

        {},

        {

            "_id": 0,

        },

    ).sort(

        "book",

        1,

    ).to_list(100)

    return rows

@api_router.get("/admin/payments/today")
async def payments_today():
    return await all_payments(date_filter=today_str())

def _flatten_for_excel(doc: dict) -> dict:
    doc = dict(doc)
    for k in ("months_covered", "late_months_paid"):
        if k in doc and isinstance(doc[k], list):
            doc[k] = ", ".join(doc[k])
    return doc

async def _build_excel(m: List[dict], b: List[dict]) -> io.BytesIO:
    df_m = pd.DataFrame([_flatten_for_excel(x) for x in m]) if m else pd.DataFrame()
    df_b = pd.DataFrame([_flatten_for_excel(x) for x in b]) if b else pd.DataFrame()
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        (df_m if not df_m.empty else pd.DataFrame([{"info": "No maintenance payments"}])).to_excel(writer, sheet_name="Maintenance", index=False)
        (df_b if not df_b.empty else pd.DataFrame([{"info": "No amenity bookings"}])).to_excel(writer, sheet_name="Amenities", index=False)
    buf.seek(0)
    return buf

@api_router.get("/admin/export")
async def export_excel(pin: str, date_filter: Optional[str] = None):
    if pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    q = {}
    if date_filter:
        q = {"paid_date": date_filter}
    m = await db.maintenance_payments.find(q, {"_id": 0}).sort("paid_at", 1).to_list(5000)
    b = await db.amenity_bookings.find(q, {"_id": 0}).sort("paid_at", 1).to_list(5000)
    buf = await _build_excel(m, b)
    suffix = f"_{date_filter}" if date_filter else ""
    fname = f"satrwa_records{suffix}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={fname}"},
    )

@api_router.get("/admin/export/today")
async def export_excel_today(pin: str):
    return await export_excel(pin=pin, date_filter=today_str())

class GymAvailabilityRequest(BaseModel):
    booking_date: str
    slot: str


class GymBookingRequest(BaseModel):
    email: str
    booking_date: str
    slot: str
    members: int

class GymAvailabilityResponse(BaseModel):
    slot: str
    booked_members: int
    booked_flats: int
    remaining_members: int
    remaining_flats: int
    available: bool
async def gym_cycle():

    from amenity_engine import gym_cycle

    start, end = gym_cycle()

    return start.isoformat(), end.isoformat()

async def gym_membership_active(email: str):

    start, end = await gym_cycle()

    return await gym_memberships.find_one(
        {
            "email": email.lower(),
            "cycle_start": start,
            "cycle_end": end,
            "status": "ACTIVE",
        },
        {"_id": 0},
    )

async def pool_cycle_dates():

    from amenity_engine import pool_cycle

    start, end = pool_cycle()

    return start.isoformat(), end.isoformat()


async def pool_membership_active(email: str):

    start, end = await pool_cycle_dates()

    return await pool_memberships.find_one(
        {
            "email": email.lower(),
            "cycle_start": start,
            "cycle_end": end,
            "status": "ACTIVE",
        },
        {"_id": 0},
    )

async def pool_slot_usage(
    booking_date: str,
    slot: str,
    category: str,
):

    rows = await pool_bookings.find(
        {
            "booking_date": booking_date,
            "slot": slot,
            "category": category,
        },
        {"_id": 0},
    ).to_list(1000)

    print("====================================")
    print("QUERY:", booking_date, slot, category)
    print("ROWS:", rows)
    print("====================================")

    members = sum(
        x["members"]
        for x in rows
    )

    flats = len(
        set(
            (
                x["block"],
                x["flat_no"],
            )
            for x in rows
        )
    )

    return members, flats

def pool_amount(member_count: int):

    if member_count < 1 or member_count > 5:
        raise HTTPException(
            400,
            "Pool membership allows only 1 to 5 members."
        )

    return POOL_PRICE[member_count]

async def pool_flat_members(
    booking_date: str,
    slot: str,
    block: str,
    flat_no: str,
):

    rows = await pool_bookings.find(
        {
            "booking_date": booking_date,
            "slot": slot,
            "block": block,
            "flat_no": flat_no,
        },
        {"_id": 0},
    ).to_list(100)

    return sum(
        x["members"]
        for x in rows
    )

async def gym_slot_usage(
    booking_date: str,
    slot: str,
):

    rows = await gym_bookings.find(
        {
            "booking_date": booking_date,
            "slot": slot,
        },
        {"_id": 0},
    ).to_list(500)

    members = sum(
        x["members"]
        for x in rows
    )

    flats = len(
        set(
            (
                x["block"],
                x["flat_no"],
            )
            for x in rows
        )
    )

    return members, flats

async def gym_dues_clear(email: str):

    account = await accounts.find_one(
        {
            "email": email.lower()
        },
        {"_id":0},
    )

    if not account:
        return False

    flat = await get_flat(
        account["block"],
        account["flat_no"],
    )

    dues = await compute_dues(flat)

    return dues["total_due"] == 0

async def gym_flat_booking_count(
    booking_date: str,
    slot: str,
    block: str,
    flat_no: str,
):

    return await gym_bookings.count_documents(
        {
            "booking_date": booking_date,
            "slot": slot,
            "block": block,
            "flat_no": flat_no,
        }
    )

@api_router.post("/gym/book")
async def gym_book(
    body: GymBookingRequest,
):

    account = await accounts.find_one(
        {
            "email": body.email.lower()
        },
        {"_id":0},
    )

    if not account:
        raise HTTPException(
            404,
            "Account not found."
        )

    if not await gym_dues_clear(body.email):
        raise HTTPException(
            400,
            "Maintenance dues must be cleared before booking Gym."
        )

    membership = await gym_membership_active(
        body.email
    )

    if not membership:
        raise HTTPException(
            400,
            "No active Gym membership."
        )

    members, flats = await gym_slot_usage(
        body.booking_date,
        body.slot,
    )

    if members + body.members > GYM_SLOT_CAPACITY:
        raise HTTPException(
            400,
            "Selected slot is full."
        )

    already = await gym_flat_booking_count(
        body.booking_date,
        body.slot,
        account["block"],
        account["flat_no"],
    )

    if already + body.members > 2:
        raise HTTPException(
            400,
            "Maximum two members per flat are allowed in one slot."
        )

    await gym_bookings.insert_one(
        {
            "id": str(uuid.uuid4()),
            "email": body.email.lower(),
            "block": account["block"],
            "flat_no": account["flat_no"],
            "booking_date": body.booking_date,
            "slot": body.slot,
            "members": body.members,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    return {
        "success": True,
        "message": "Gym booked successfully."
    }

class GymMembershipRequest(BaseModel):
    email: str
    upi_id: str
    upi_ref_no: str

class PoolMembershipRequest(BaseModel):
    email: str
    members: int
    upi_id: str
    upi_ref_no: str


class PoolBookingRequest(BaseModel):
    email: str
    booking_date: str
    slot: str
    category: Literal["ADULT", "KID"]
    members: int

@api_router.post("/gym/membership")
async def gym_membership(
    body: GymMembershipRequest,
):

    account = await accounts.find_one(
        {
            "email": body.email.lower()
        },
        {"_id": 0},
    )

    if not account:
        raise HTTPException(
            404,
            "Account not found."
        )

    flat = await get_flat(
        account["block"],
        account["flat_no"],
    )

    dues = await compute_dues(flat)

    if dues["total_due"] > 0:
        raise HTTPException(
            400,
            "Maintenance dues must be cleared before Gym membership."
        )

    start, end = await gym_cycle()

    existing = await gym_memberships.find_one(
        {
            "email": body.email.lower(),
            "cycle_start": start,
            "cycle_end": end,
            "status": "ACTIVE",
        }
    )

    if existing:
        raise HTTPException(
            400,
            "Gym membership already active for this billing cycle."
        )

    await gym_memberships.insert_one(
        {
            "id": str(uuid.uuid4()),
            "email": body.email.lower(),
            "block": account["block"],
            "flat_no": account["flat_no"],
            "amount": GYM_MONTHLY_FEE,
            "upi_id": body.upi_id,
            "upi_ref_no": body.upi_ref_no,
            "cycle_start": start,
            "cycle_end": end,
            "status": "ACTIVE",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    return {
        "success": True,
        "message": "Gym membership activated.",
        "cycle_start": start,
        "cycle_end": end,
        "amount": GYM_MONTHLY_FEE,
    }

@api_router.get("/gym/availability")
async def gym_availability(
    booking_date: str,
):

    result = []

    for slot in GYM_SLOTS:

        members, flats = await gym_slot_usage(
            booking_date,
            slot,
        )

        result.append(
            {
                "slot": slot,
                "booked_members": members,
                "booked_flats": flats,
                "remaining_members":
                    GYM_SLOT_CAPACITY
                    - members,

                "remaining_flats":
                    GYM_SLOT_CAPACITY
                    - flats,

                "available":
                    members
                    < GYM_SLOT_CAPACITY,
            }
        )

    return result

@api_router.get("/pool/availability")
async def pool_availability(
    booking_date: str,
):

    result = []

    for slot in POOL_SLOTS:

        for category in ["ADULT", "KID"]:

            members, flats = await pool_slot_usage(
                booking_date,
                slot,
                category,
            )

            capacity = (
                POOL_ADULT_CAPACITY
                if category == "ADULT"
                else POOL_KID_CAPACITY
            )

            result.append(
                {
                    "slot": slot,
                    "category": category,
                    "booked_members": members,
                    "booked_flats": flats,
                    "remaining": capacity - members,
                    "capacity": capacity,
                    "available": members < capacity,
                }
            )

    return result

@api_router.post("/pool/membership")
async def pool_membership(
    body: PoolMembershipRequest,
):

    account = await accounts.find_one(
        {
            "email": body.email.lower(),
        },
        {"_id": 0},
    )

    if not account:
        raise HTTPException(
            404,
            "Account not found."
        )

    flat = await get_flat(
        account["block"],
        account["flat_no"],
    )

    dues = await compute_dues(flat)

    if dues["total_due"] > 0:
        raise HTTPException(
            400,
            "Maintenance dues must be cleared before Pool membership."
        )

    start, end = await pool_cycle_dates()

    existing = await pool_memberships.find_one(
        {
            "email": body.email.lower(),
            "cycle_start": start,
            "cycle_end": end,
        },
        {"_id": 0},
    )

    required_amount = pool_amount(
        body.members
    )

    already_paid = 0

    if existing:

        already_paid = existing.get(
            "amount",
            0,
        )

    payable = required_amount - already_paid

    if payable <= 0:

        raise HTTPException(
            400,
            "Pool membership already active."
        )

    await pool_memberships.update_one(
        {
            "email": body.email.lower(),
            "cycle_start": start,
            "cycle_end": end,
        },
        {
            "$set": {
                "email": body.email.lower(),
                "block": account["block"],
                "flat_no": account["flat_no"],
                "members": body.members,
                "amount": required_amount,
                "cycle_start": start,
                "cycle_end": end,
                "status": "ACTIVE",
                "upi_id": body.upi_id,
                "upi_ref_no": body.upi_ref_no,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )

    return {
        "success": True,
        "payable_now": payable,
        "total_members": body.members,
        "membership_value": required_amount,
    }

@api_router.post("/pool/book")
async def pool_book(
    body: PoolBookingRequest,
):

    membership = await pool_membership_active(
        body.email
    )

    if not membership:

        raise HTTPException(
            400,
            "Pool membership not active."
        )

    account = await accounts.find_one(
        {
            "email": body.email.lower(),
        },
        {"_id":0},
    )

    members, flats = await pool_slot_usage(
        body.booking_date,
        body.slot,
        body.category,
    )

    capacity = (
        POOL_ADULT_CAPACITY
        if body.category == "ADULT"
        else POOL_KID_CAPACITY
    )

    if members + body.members > capacity:

        raise HTTPException(
            400,
            "Selected slot is full."
        )

    existing = await pool_flat_members(
        body.booking_date,
        body.slot,
        account["block"],
        account["flat_no"],
    )

    if existing + body.members > 5:

        raise HTTPException(
            400,
            "Maximum 5 members from one flat per slot."
        )

    await pool_bookings.insert_one(
        {
            "email":body.email.lower(),
            "block":account["block"],
            "flat_no":account["flat_no"],
            "booking_date":body.booking_date,
            "slot":body.slot,
            "category":body.category,
            "members":body.members,
            "created_at":datetime.now(timezone.utc).isoformat(),
        }
    )

    return {
        "success":True,
        "message":"Pool booked successfully."
    }
from datetime import datetime, timedelta

def room_available_for_checkin(
    booking: dict,
    requested_date: str,
    requested_time: str,
):

    if booking is None:
        return True

    req = datetime.strptime(
        requested_date + " " + requested_time,
        "%Y-%m-%d %H:%M",
    )

    checkout = datetime.strptime(
        booking["checkout_date"] + " " + booking["checkout_time"],
        "%Y-%m-%d %H:%M",
    )

    if checkout.hour < 12:

        available = datetime.strptime(
            booking["checkout_date"] + " 17:00",
            "%Y-%m-%d %H:%M",
        )

    else:

        available = datetime.strptime(
            (
                datetime.strptime(
                    booking["checkout_date"],
                    "%Y-%m-%d",
                ) + timedelta(days=1)
            ).strftime("%Y-%m-%d")
            + " 12:00",
            "%Y-%m-%d %H:%M",
        )

    return req >= available

@api_router.get("/guest-room/availability")
async def guest_room_availability(
    checkin_date: str,
    checkin_time: str = "17:00",
):

    result = []

    for room in ROOMS:

        booking = await guest_room_bookings.find_one(
            {
                "room": room,
                "status": {
                    "$in": [
                        BOOKING_RESERVED,
                        BOOKING_CONFIRMED,
                        BOOKING_CHECKED_IN,
                    ]
                },
            },
            sort=[("checkout_date", -1)],
        )

        available = room_available_for_checkin(
            booking,
            checkin_date,
            checkin_time,
        )

        result.append(
            {
                "room": room,
                "price": GUEST_ROOM_PRICES[room],
                "available": available,
                "status": (
                    "AVAILABLE"
                    if available
                    else booking["status"]
                ),
            }
        )

    return result

from datetime import datetime, timedelta

def next_available_date(
    checkout_date: str,
    checkout_time: str,
):

    dt = datetime.strptime(
        checkout_date,
        "%Y-%m-%d",
    )

    hour = int(
        checkout_time.split(":")[0]
    )

    if hour < 12:
        return checkout_date

    return (
        dt + timedelta(days=1)
    ).strftime("%Y-%m-%d")

async def guest_room_book(
    body: GuestRoomBookingRequest,
):

    account = await accounts.find_one(
        {
            "email": body.email.lower(),
        },
        {"_id": 0},
    )

    if not account:
        raise HTTPException(
            404,
            "Account not found."
        )

    flat = await get_flat(
        account["block"],
        account["flat_no"],
    )

    dues = await compute_dues(flat)

    if dues["total_due"] > 0:
        raise HTTPException(
            400,
            "Maintenance dues must be cleared before booking."
        )

    existing = await guest_room_bookings.find_one(
        {
            "room": body.room,
            "status": {
                "$in": [
                    BOOKING_RESERVED,
                    BOOKING_CONFIRMED,
                    BOOKING_CHECKED_IN,
                ]
            },
            "$or": [
                {
                    "checkin_date": {
                        "$lte": body.checkin_date,
                    },
                    "checkout_date": {
                        "$gte": body.checkin_date,
                    },
                },
                {
                    "checkin_date": {
                        "$lte": body.checkout_date,
                    },
                    "checkout_date": {
                        "$gte": body.checkout_date,
                    },
                },
            ],
        }
    )

    if existing:
        raise HTTPException(
            400,
            "Selected room is not available."
        )

    booked = await rooms_booked_by_flat(
        account["block"],
        account["flat_no"],
        body.checkin_date,
    )

    if booked >= 2:
        raise HTTPException(
            400,
            "Maximum two guest rooms can be booked per flat."
        )

    amount = await room_rate(body.room)

    await guest_room_bookings.insert_one(
        {
            "id": str(uuid.uuid4()),
            "email": body.email.lower(),
            "block": account["block"],
            "flat_no": account["flat_no"],

            "room": body.room,

            "checkin_date": body.checkin_date,
            "checkout_date": body.checkout_date,

            "checkin_time": body.checkin_time,
            "checkout_time": body.checkout_time,

            "amount": amount,

            "status": "CONFIRMED",

            "upi_id": body.upi_id,
            "upi_ref_no": body.upi_ref_no,

            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    return {
        "success": True,
        "room": body.room,
        "amount": amount,
        "status": "CONFIRMED",
    }

@api_router.get("/community-hall/availability")
async def community_hall_availability(
    booking_date: str,
):

    fh = await community_hall_bookings.find_one(
        {
            "booking_date": booking_date,
            "function_hall": True,
            "status": BOOKING_CONFIRMED,
        }
    )

    dh = await community_hall_bookings.find_one(
        {
            "booking_date": booking_date,
            "dining_hall": True,
            "status": BOOKING_CONFIRMED,
        }
    )

    return {

        "booking_date": booking_date,

        "function_hall": fh is None,

        "dining_hall": dh is None,

    }

@api_router.post("/community-hall/book")
async def community_hall_book(
    body: CommunityHallBookingRequest,
):

    if not body.function_hall and not body.dining_hall:
        raise HTTPException(
            400,
            "Select Function Hall, Dining Hall or both."
        )

    account = await accounts.find_one(
        {
            "email": body.email.lower(),
        },
        {"_id": 0},
    )

    if not account:
        raise HTTPException(
            404,
            "Account not found."
        )

    flat = await get_flat(
        account["block"],
        account["flat_no"],
    )

    dues = await compute_dues(flat)

    if dues["total_due"] > 0:
        raise HTTPException(
            400,
            "Maintenance dues must be cleared."
        )

    existing = await hall_booking_exists(
        body.booking_date,
    )

    if existing:
        raise HTTPException(
            400,
            "Community Hall already booked."
        )

    amount = 0

    if body.function_hall:
        amount += FUNCTION_HALL_RATE

    if body.dining_hall:
        amount += DINING_HALL_RATE

    booking_id = str(uuid.uuid4())

    await community_hall_bookings.insert_one(
        {

            "booking_id": booking_id,

            "email": body.email.lower(),

            "block": account["block"],

            "flat_no": account["flat_no"],

            "booking_date": body.booking_date,

            "session": body.session,

            "function_hall": body.function_hall,

            "dining_hall": body.dining_hall,

            "hall_amount": amount,

            "status": BOOKING_CONFIRMED,

            "upi_id": body.upi_id,

            "upi_ref_no": body.upi_ref_no,

            "created_at":
                datetime.now(
                    timezone.utc
                ).isoformat(),
            "timeline": [
    {
        "status": "SUBMITTED",
        "at": now_iso,
        "by": "RESIDENT"
    }
],
        }
    )

    return {

        "success": True,

        "booking_id": booking_id,

        "amount": amount,

        "status": BOOKING_CONFIRMED,
    }

@api_router.get("/maintenance/summary")
async def maintenance_summary(
    email: str,
):

    account = await accounts.find_one(
        {
            "email": email.lower(),
        },
        {"_id": 0},
    )

    if not account:
        raise HTTPException(
            404,
            "Account not found."
        )

    flat = await get_flat(
        account["block"],
        account["flat_no"],
    )

    dues = await compute_dues(flat)

    return {
        "owner_name": account.get("owner_name"),
        "block": account["block"],
        "flat_no": account["flat_no"],
        **dues,
    }

@api_router.get("/maintenance/history")
async def maintenance_history(
    email: str,
):

    account = await accounts.find_one(
        {
            "email": email.lower(),
        },
        {"_id": 0},
    )

    if not account:
        raise HTTPException(
            404,
            "Account not found."
        )

    rows = await db.maintenance_payments.find(
        {
            "block": account["block"],
            "flat_no": account["flat_no"],
        },
        {
            "_id": 0,
        },
    ).sort(
        "paid_at",
        -1,
    ).to_list(100)

    return rows

@api_router.get("/gym/status")
async def gym_status(
    email:str,
):

    member = await gym_membership_active(
        email,
    )

    start,end = await gym_cycle()

    return{

        "active":member is not None,

        "cycle_start":start,

        "cycle_end":end,

        "membership":member,

    }
@api_router.get("/admin/payments")
async def admin_payments():

    maintenance = await db.maintenance_payments.find(
        {},
        {"_id": 0},
    ).sort(
        "paid_at",
        -1,
    ).to_list(1000)

    bookings = await db.amenity_bookings.find(
        {},
        {"_id": 0},
    ).sort(
        "paid_at",
        -1,
    ).to_list(1000)

    return {
        "maintenance": maintenance,
        "bookings": bookings,
    }

@api_router.post("/admin/payment/verify")
async def admin_verify_payment(
    body:VerifyCentralPayment,
):

    receipt = await verify_payment(

        db,

        body.payment_id,

        body.verified_by,

    )

    return{

        "success":True,

        "receipt_no":receipt,

    }

@api_router.post("/payment/submit")
async def payment_submit(

    body:SubmitCentralPayment,

):

    await submit_payment(

        db,

        body.payment_id,

        body.upi_id,

        body.upi_ref_no,

    )

    return{

        "success":True

    }

@api_router.get("/admin/payment-summary")
async def payment_summary():

    return{

        "created":

        await db.payments.count_documents(

            {

                "status":"PAYMENT_CREATED",

            }

        ),

        "pending":

        await db.payments.count_documents(

            {

                "status":"PAYMENT_PENDING_VERIFICATION",

            }

        ),

        "verified":

        await db.payments.count_documents(

            {

                "status":"PAYMENT_VERIFIED",

            }

        ),

        "rejected":

        await db.payments.count_documents(

            {

                "status":"PAYMENT_REJECTED",

            }

        ),

    }

@api_router.get("/admin/dashboard")
async def admin_dashboard():

    return {

        "pending_registrations":
        await registration_requests.count_documents(
            {
                "status":"PENDING",
            }
        ),

        "pending_payments":
        await db.payments.count_documents(
            {
                "status":"PAYMENT_PENDING_VERIFICATION",
            }
        ),

        "verified_payments":
        await db.payments.count_documents(
            {
                "status":"PAYMENT_VERIFIED",
            }
        ),

        "owners":
        await accounts.count_documents(
            {
                "role":"OWNER",
            }
        ),

        "tenants":
        await accounts.count_documents(
            {
                "role":"TENANT",
            }
        ),

        "corporates":
        await accounts.count_documents(
            {
                "role":"CORPORATE",
            }
        ),

        "commercial":
        await accounts.count_documents(
            {
                "role":"COMMERCIAL",
            }
        ),

    }

@api_router.get("/admin/payment-modules")
async def payment_modules():

    pipeline = [

        {

            "$group":{

                "_id":"$module",

                "count":{

                    "$sum":1,

                }

            }

        },

        {

            "$sort":{

                "_id":1,

            }

        }

    ]

    rows = await db.payments.aggregate(
        pipeline
    ).to_list(100)

    return rows

@api_router.get("/admin/payment-modes")
async def payment_modes():

    pipeline=[

        {

            "$group":{

                "_id":"$payment_mode",

                "count":{

                    "$sum":1,

                }

            }

        }

    ]

    rows=await db.payments.aggregate(
        pipeline
    ).to_list(100)

    return rows

@api_router.get("/admin/pending-payments")
async def pending_payments():

    result = []

    collections = [

        ("maintenance", db.maintenance_payments),
        ("manual", db.manual_payments),
        ("amenity", db.amenity_bookings),
        ("guest_room", db.guest_room_bookings),
        ("community_hall", db.community_hall_bookings),

    ]

    for payment_type, collection in collections:

        rows = await collection.find(
            {
                "verified": False
            },
            {
                "_id": 0
            }
        ).to_list(1000)

        for row in rows:

            row["payment_type"] = payment_type

            result.append(row)

    result.sort(
        key=lambda x: x.get("paid_at", ""),
        reverse=True
    )

    return result

@api_router.post("/admin/approve-payment")
async def approve_payment(body: PaymentApproval):

    if body.pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid Admin PIN")

    collections = {
        "maintenance": db.maintenance_payments,
        "manual": db.manual_payments,
        "amenity": db.amenity_bookings,
        "guest_room": db.guest_room_bookings,
        "community_hall": db.community_hall_bookings,
    }

    collection = collections.get(body.payment_type)

    if collection is None:
        raise HTTPException(status_code=400, detail="Invalid payment type")

    payment = await collection.find_one(
        {
            "id": body.id
        }
    )

    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.get("verified", False):
        return {
            "message": "Payment already verified",
            "receipt_no": payment.get("receipt_no", "")
        }

    receipt_no = await next_receipt_for_payment(
        body.payment_type,
        payment.get("payment_mode", "ONLINE")
    )

    receipt_date = today_str()

    verified_time = datetime.now(timezone.utc).isoformat()

    timeline = payment.get("timeline", [])

    timeline.append({
        "status": "VERIFIED",
        "at": verified_time,
        "by": "ADMIN"
    })

    await collection.update_one(
        {
            "id": body.id
        },
        {
            "$set": {
                "verified": True,
                "status": "VERIFIED",
                "receipt_no": receipt_no,
                "receipt_date": receipt_date,
                "verified_at": verified_time,
                "verified_by": "ADMIN",
                "timeline": timeline,
            }
        }
    )

    await write_audit(
        "PAYMENT_APPROVED",
        {
            "payment_id": body.id,
            "payment_type": body.payment_type,
            "receipt_no": receipt_no,
        }
    )

    return {
        "success": True,
        "message": "Payment verified successfully.",
        "receipt_no": receipt_no,
    }

@api_router.post("/admin/reject-payment")
async def reject_payment(body: PaymentReject):

    if body.pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid Admin PIN")

    collections = {
        "maintenance": db.maintenance_payments,
        "manual": db.manual_payments,
        "amenity": db.amenity_bookings,
        "guest_room": db.guest_room_bookings,
        "community_hall": db.community_hall_bookings,
    }

    collection = collections.get(body.payment_type)

    if collection is None:
        raise HTTPException(status_code=400, detail="Invalid payment type")

    payment = await collection.find_one(
        {
            "id": body.id
        }
    )

    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    rejected_time = datetime.now(timezone.utc).isoformat()

    timeline = payment.get("timeline", [])

    timeline.append({
        "status": "REJECTED",
        "at": rejected_time,
        "by": "ADMIN",
        "reason": body.reason,
    })

    await collection.update_one(
        {
            "id": body.id
        },
        {
            "$set": {
                "verified": False,
                "status": "REJECTED",
                "reject_reason": body.reason,
                "rejected_at": rejected_time,
                "rejected_by": "ADMIN",
                "timeline": timeline,
            }
        }
    )

    await write_audit(
        "PAYMENT_REJECTED",
        {
            "payment_id": body.id,
            "payment_type": body.payment_type,
            "reason": body.reason,
        }
    )

    return {
        "success": True,
        "message": "Payment Rejected"
    }

@api_router.get("/payment/status")
async def payment_status(email: str):

    result = []

    collections = [

        ("maintenance", db.maintenance_payments),
        ("manual", db.manual_payments),
        ("amenity", db.amenity_bookings),
        ("guest_room", db.guest_room_bookings),
        ("community_hall", db.community_hall_bookings),

    ]

    for payment_type, collection in collections:

        rows = await collection.find(
            {
                "email": email
            },
            {
                "_id": 0
            }
        ).sort(
            "paid_at",
            -1
        ).to_list(500)

        for row in rows:

            result.append({

                "payment_type": payment_type,

                "amount":
                    row.get(
                        "total_amount",
                        row.get(
                            "amount",
                            0
                        )
                    ),

                "status":
                    row.get(
                        "status",
                        "UNKNOWN"
                    ),

                "verified":
                    row.get(
                        "verified",
                        False
                    ),

                "receipt_no":
                    row.get(
                        "receipt_no"
                    ),

                "paid_at":
                    row.get(
                        "paid_at"
                    ),

            })

    result.sort(

        key=lambda x: x.get(
            "paid_at",
            ""
        ),

        reverse=True,

    )

    return result

@api_router.post("/commercial/register")
async def commercial_register(body: CommercialRegister):

    if await commercial_accounts.find_one({"email": normalize_email(body.email)}):
        raise HTTPException(400, "Email already exists")

    doc = {
        "id": str(uuid.uuid4()),
        "account_type": body.account_type,
        "shop_name": body.shop_name,
        "owner_name": body.owner_name,
        "phone": body.phone,
        "email": normalize_email(body.email),
        "pin": body.pin,
        "monthly_rent": 0,
        "electricity_rate": 15,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await commercial_accounts.insert_one(doc)

    doc.pop("_id", None)

    return doc

@api_router.post("/commercial/login")
async def commercial_login(body: CommercialLogin):

    acc = await commercial_accounts.find_one(
        {
            "email": normalize_email(body.email),
            "pin": body.pin,
        },
        {
            "_id": 0,
        },
    )

    if not acc:
        raise HTTPException(401, "Invalid credentials")

    return acc

@api_router.post("/admin/commercial/rent")
async def update_commercial_rent(body: CommercialRentUpdate):

    await commercial_accounts.update_one(
        {
            "email": normalize_email(body.email)
        },
        {
            "$set": {
                "monthly_rent": body.monthly_rent
            }
        }
    )

    return {
        "success": True
    }

@api_router.post("/commercial/meter-reading")
async def commercial_meter_reading(body: MeterReadingEntry):

    account = await commercial_accounts.find_one({
        "email": normalize_email(body.email)
    })

    if not account:
        raise HTTPException(404, "Commercial account not found")

    previous = await meter_readings.find_one(
        {
            "email": normalize_email(body.email)
        },
        sort=[("reading_date", -1)]
    )

    previous_reading = previous["reading"] if previous else 0

    units = body.reading - previous_reading

    if units < 0:
        raise HTTPException(400, "Reading cannot decrease")

    amount = units * account.get("electricity_rate", 15)

    doc = {
        "id": str(uuid.uuid4()),
        "email": normalize_email(body.email),
        "previous_reading": previous_reading,
        "current_reading": body.reading,
        "units": units,
        "rate": account.get("electricity_rate", 15),
        "amount": amount,
        "reading_date": datetime.now(timezone.utc).isoformat()
    }

    await meter_readings.insert_one(doc)

    doc.pop("_id", None)

    return doc

@api_router.get("/commercial/current-bill")
async def commercial_current_bill(email: str):

    account = await commercial_accounts.find_one(
        {
            "email": normalize_email(email)
        },
        {
            "_id": 0
        }
    )

    if not account:
        raise HTTPException(404, "Commercial account not found")

    reading = await meter_readings.find_one(
        {
            "email": normalize_email(email)
        },
        sort=[("reading_date", -1)]
    )

    electricity = reading["amount"] if reading else 0

    return {

        "shop_name": account["shop_name"],

        "account_type": account["account_type"],

        "monthly_rent": account["monthly_rent"],

        "electricity_amount": electricity,

        "total_due": account["monthly_rent"] + electricity

    }

@api_router.post("/admin/commercial/electricity-rate")
async def update_electricity_rate(body: ElectricityRateUpdate):

    await commercial_accounts.update_one(
        {
            "email": normalize_email(body.email)
        },
        {
            "$set": {
                "electricity_rate": body.rate
            }
        }
    )

    return {
        "success": True
    }

@api_router.get("/admin/series/dashboard")
async def series_dashboard():

    rows = await receipt_series.find(
        {},
        {
            "_id": 0
        }
    ).sort(
        "series_type",
        1
    ).to_list(100)

    return rows

@api_router.get("/admin/cash-book")
async def cash_book():

    rows = await db.manual_payments.find(
        {
            "payment_mode": "CASH",
            "verified": True
        },
        {
            "_id": 0
        }
    ).sort(
        "receipt_no",
        1
    ).to_list(5000)

    return rows

@api_router.get("/admin/online-book")
async def online_book():

    maintenance = await db.maintenance_payments.find(
        {
            "verified": True
        },
        {
            "_id": 0
        }
    ).to_list(5000)

    amenities = await db.amenity_bookings.find(
        {
            "verified": True
        },
        {
            "_id": 0
        }
    ).to_list(5000)

    rows = maintenance + amenities

    rows.sort(
        key=lambda x: x.get("paid_at", ""),
        reverse=True
    )

    return rows

@api_router.get("/admin/clubhouse-book")
async def clubhouse_book():

    guest = await db.guest_room_bookings.find(
        {
            "verified": True
        },
        {
            "_id": 0
        }
    ).to_list(5000)

    hall = await db.community_hall_bookings.find(
        {
            "verified": True
        },
        {
            "_id": 0
        }
    ).to_list(5000)

    rows = guest + hall

    rows.sort(
        key=lambda x: x.get("paid_at", ""),
        reverse=True
    )

    return rows

@api_router.get("/admin/day-closing")
async def day_closing():

    today = today_str()

    cash = await db.manual_payments.aggregate([
        {
            "$match": {
                "verified": True,
                "paid_date": today,
                "payment_mode": "CASH"
            }
        },
        {
            "$group": {
                "_id": None,
                "amount": {
                    "$sum": "$total_amount"
                }
            }
        }
    ]).to_list(1)

    online = await db.maintenance_payments.aggregate([
        {
            "$match": {
                "verified": True,
                "paid_date": today
            }
        },
        {
            "$group": {
                "_id": None,
                "amount": {
                    "$sum": "$total_amount"
                }
            }
        }
    ]).to_list(1)

    cash_total = cash[0]["amount"] if cash else 0
    online_total = online[0]["amount"] if online else 0

    return {

        "cash": cash_total,

        "online": online_total,

        "total": cash_total + online_total

    }

@api_router.get("/admin/receipt-search")
async def receipt_search(receipt_no: str):

    collections = [

        db.maintenance_payments,

        db.manual_payments,

        db.amenity_bookings,

        db.guest_room_bookings,

        db.community_hall_bookings,

    ]

    for c in collections:

        row = await c.find_one(
            {
                "receipt_no": receipt_no
            },
            {
                "_id": 0
            }
        )

        if row:

            return row

    raise HTTPException(
        404,
        "Receipt not found"
    )

@api_router.get("/admin/audit-logs")
async def admin_audit_logs(limit: int = 200):

    rows = await audit_logs.find(
        {},
        {
            "_id": 0
        }
    ).sort(
        "created_at",
        -1
    ).to_list(limit)

    return rows

@api_router.get("/admin/search-payments")
async def search_payments(q: str):

    q = q.strip()

    collections = [

        ("maintenance", db.maintenance_payments),

        ("manual", db.manual_payments),

        ("amenity", db.amenity_bookings),

        ("guest_room", db.guest_room_bookings),

        ("community_hall", db.community_hall_bookings),

    ]

    results = []

    for payment_type, collection in collections:

        cursor = collection.find(
            {
                "$or": [
                    {"receipt_no": q},
                    {"flat_no": q},
                    {"phone": q},
                    {"owner_name": {"$regex": q, "$options": "i"}},
                    {"upi_ref_no": q},
                ]
            },
            {
                "_id": 0
            }
        )

        rows = await cursor.to_list(100)

        for row in rows:
            row["payment_type"] = payment_type
            results.append(row)

    results.sort(
        key=lambda x: x.get("paid_at", ""),
        reverse=True,
    )

    return results

@api_router.get("/admin/statistics")
async def admin_statistics():

    maintenance = await db.maintenance_payments.count_documents({})

    amenities = await db.amenity_bookings.count_documents({})

    manual = await db.manual_payments.count_documents({})

    pending = (
        await db.maintenance_payments.count_documents(
            {
                "verified": False
            }
        )
        +
        await db.amenity_bookings.count_documents(
            {
                "verified": False
            }
        )
    )

    return {

        "maintenance": maintenance,

        "manual": manual,

        "amenities": amenities,

        "pending": pending,

    }

@api_router.get("/admin/reprint/{receipt_no}")
async def admin_reprint(receipt_no: str):

    collections = [

        db.maintenance_payments,

        db.manual_payments,

        db.amenity_bookings,

        db.community_hall_bookings,

        db.guest_room_bookings,

    ]

    for c in collections:

        row = await c.find_one(
            {
                "receipt_no": receipt_no
            }
        )

        if row:

            row.pop("_id", None)

            return row

    raise HTTPException(
        404,
        "Receipt not found"
    )

@api_router.get("/admin/series-status")
async def series_status():

    rows = await receipt_series.find(
        {},
        {
            "_id": 0
        }
    ).sort(
        "series_type",
        1
    ).to_list(100)

    return rows

@api_router.get("/admin/settings")
async def get_settings():

    row = await settings.find_one(
        {"_id": "SYSTEM"},
        {"_id": 0}
    )

    return row

@api_router.post("/admin/settings")
async def update_settings(body: SystemSettingsUpdate):

    await settings.update_one(

        {
            "_id": "SYSTEM"
        },

        {
            "$set": body.model_dump()
        }

    )

    await write_audit(

        "SETTINGS_UPDATED",

        body.model_dump()

    )

    return {

        "success": True

    }

@api_router.get("/resident/payment-history")
async def resident_payment_history(
    block: str,
    flat_no: str
):

    maintenance = await db.maintenance_payments.find(
        {
            "block": block,
            "flat_no": flat_no
        },
        {
            "_id": 0
        }
    ).to_list(500)

    amenities = await db.amenity_bookings.find(
        {
            "block": block,
            "flat_no": flat_no
        },
        {
            "_id": 0
        }
    ).to_list(500)

    data = []

    for r in maintenance:

        r["payment_type"] = "Maintenance"

        data.append(r)

    for r in amenities:

        r["payment_type"] = "Amenity"

        data.append(r)

    data.sort(
        key=lambda x: x.get("paid_at", ""),
        reverse=True
    )

    return data

@api_router.get("/resident/my-dues")
async def resident_my_dues(
    block: str,
    flat_no: str
):

    flat = await get_flat(block, flat_no)

    if not flat:
        raise HTTPException(404, "Flat not found")

    dues = await compute_dues(flat)

    return dues

@api_router.get("/admin/complaints")
async def admin_complaints():

    rows = await db.complaints.find(
        {},
        {
            "_id": 0
        }
    ).sort(
        "created_at",
        -1
    ).to_list(500)

    return rows

class ComplaintClose(BaseModel):

    id: str

    remarks: str

    pin: str


@api_router.post("/admin/complaint-close")
async def complaint_close(body: ComplaintClose):

    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid Admin PIN")

    await db.complaints.update_one(

        {
            "id": body.id
        },

        {
            "$set": {

                "status": "CLOSED",

                "admin_remarks": body.remarks,

                "closed_at": datetime.now(timezone.utc).isoformat()

            }

        }

    )

    await write_audit(

        "COMPLAINT_CLOSED",

        {

            "complaint_id": body.id

        }

    )

    return {

        "success": True

    }

@api_router.post("/complaints")
async def create_complaint(body: ComplaintRequest):

    complaint = {

        "id": str(uuid.uuid4()),

        "block": body.block,

        "flat_no": body.flat_no,

        "owner_name": body.owner_name,

        "email": body.email,

        "phone": body.phone,

        "complaint_type": body.complaint_type,

        "subject": body.subject,

        "description": body.description,

        "status": "OPEN",

        "created_at": datetime.now(timezone.utc).isoformat(),

    }

    await db.complaints.insert_one(complaint)

    # TODO
    # send acknowledgement email to resident

    # TODO
    # send complaint email to admin

    return {
        "success": True,
    }

@api_router.post("/auth/request-pin-reset")
async def request_pin_reset(body: RequestPinReset):

    email = normalize_email(body.email)

    account = await accounts.find_one(
        {"email": email},
        {"_id": 0},
    )

    if not account:
        raise HTTPException(
            404,
            "Email not registered."
        )

    otp = generate_otp()

    save_otp(email, otp)

    send_otp(email, otp)

    return {
        "success": True,
        "message": "OTP sent successfully."
    }

@api_router.post("/auth/reset-pin")
async def reset_pin(body: ResetPin):

    email = normalize_email(body.email)

    if body.new_pin != body.confirm_pin:
        raise HTTPException(
            400,
            "PINs do not match."
        )

    account = await accounts.find_one(
        {"email": email},
        {"_id": 0},
    )

    if not account:
        raise HTTPException(
            404,
            "Email not registered."
        )

    if not verify_otp(email, body.otp):
        raise HTTPException(
            400,
            "Invalid or expired OTP."
        )

    await accounts.update_one(
        {"id": account["id"]},
        {
            "$set": {
                "pin_hash": hash_pin(body.new_pin),
                "failed_attempts": 0,
                "locked_until": None,
            }
        },
    )

    return {
        "success": True,
        "message": "PIN reset successfully."
    }

@api_router.post("/gate-pass/check")
async def check_gate_pass(body: GatePassRequest):

    flat = await get_flat(body.block, body.flat_no)

    dues = await compute_dues(flat)

    total_due = dues["total_due"]

    if total_due > 0:

        return {
            "eligible": False,
            "due": total_due
        }

    return {

    "eligible":True,

    "amount":250,

    "gateway":"ICICI"

}   
@api_router.post("/gate-pass/pay")
async def pay_gate_pass(body: GatePassRequest):

    flat = await get_flat(
        body.block,
        body.flat_no,
    )

    gate_pass_no = (
        f"GP-{datetime.now().strftime('%Y%m%d')}-"
        f"{uuid.uuid4().hex[:5].upper()}"
    )

    doc = {

        "id": str(uuid.uuid4()),

        "gate_pass_no": gate_pass_no,

        "resident_email": body.resident_email,

        "block": body.block,

        "flat_no": body.flat_no,

        "owner_name": flat.get("owner_name", ""),

        "phone": flat.get("phone", ""),

        "move_out_date": body.move_out_date,

        "vehicle_number": body.vehicle_number,

        "reason": body.reason,

        "conveyance_amount": 250,

        "payment_status": "SUCCESS",

        "payment_reference":
            f"TEST-{uuid.uuid4().hex[:8].upper()}",

        "generated_at":
            datetime.now(timezone.utc).isoformat(),

        "status": "GENERATED",

        "cleanup_status": "PENDING",

        "cleanup_completed_at": None,

    }

    pdf_path = generate_gate_pass(doc)

    doc["pdf_path"] = pdf_path

    await db.gate_passes.insert_one(doc)

    return doc

@api_router.get("/gate-pass/history/{email}")
async def gate_pass_history(email:str):

    data=[]

    async for x in db.gate_passes.find(

        {
            "resident_email":email
        },

        {
            "_id":0
        }

    ):

        data.append(x)

    return data

@api_router.get("/gate-pass/view/{gate_pass_no}")
async def view_gate_pass(gate_pass_no:str):

    gp = await db.gate_passes.find_one(

        {
            "gate_pass_no":gate_pass_no
        },

        {
            "_id":0
        }

    )

    if not gp:

        raise HTTPException(
            404,
            "Gate Pass not found."
        )

    return gp

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def on_start():
    await ensure_seed()
    logger.info("SATRWA API started, receipt series seeded.")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
