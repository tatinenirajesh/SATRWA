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

import pandas as pd
from reportlab.lib.pagesizes import A5
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
import qrcode
from urllib.parse import quote

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

# ---------------- MODELS ----------------
class FlatRegister(BaseModel):
    block: str
    flat_no: str
    bhk_type: Literal["2BHK", "3BHK"]
    owner_name: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    start_month: str

class FlatLogin(BaseModel):
    block: str
    flat_no: str

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

class GatePassRequest(BaseModel):
    block: str
    flat_no: str
    conveyance_receipt_no: str
    requested_by: Literal["individual", "corporate"] = "individual"
    corporate_payer_id: Optional[str] = None

class GatePassAction(BaseModel):
    pass_id: str
    pin: str
    reason: Optional[str] = ""

class RecoveryRequest(BaseModel):
    account_type: Literal["individual", "corporate"]
    email: str
    block: Optional[str] = None
    flat_no: Optional[str] = None
    name: Optional[str] = None

# ---------------- HELPERS ----------------
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

async def compute_dues(flat: dict) -> dict:
    start = flat["start_month"]
    now_ym = current_ym()
    all_months = month_range(start, now_ym)
    paid_docs = await db.maintenance_payments.find(
        {"block": flat["block"], "flat_no": flat["flat_no"]}, {"_id": 0}
    ).to_list(1000)
    paid_months = set()
    opening_due_paid = 0.0
    for p in paid_docs:
        for m in p.get("months_covered", []):
            paid_months.add(m)
        opening_due_paid += p.get("opening_due_amount", 0) or 0
    pending = [m for m in all_months if m not in paid_months]
    rate = MAINT_RATES[flat["bhk_type"]]
    late_fee = await get_late_fee()
    today = date.today()
    # A month is "late" if it's before current month OR (current month AND today.day > DUE_DAY)
    late_months = []
    for m in pending:
        if m < now_ym:
            late_months.append(m)
        elif m == now_ym and today.day > DUE_DAY:
            late_months.append(m)
    late_fee_total = len(late_months) * late_fee
    maint_total = len(pending) * rate

    # Opening due (manually entered historical/pre-app due by admin)
    opening_due_set = flat.get("opening_due", 0) or 0
    opening_due_remaining = max(0.0, opening_due_set - opening_due_paid)

    total_due = maint_total + late_fee_total + opening_due_remaining
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
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        return {"exists": False}
    dues = await compute_dues(flat)
    return {"exists": True, "flat": flat, "dues": dues}

@api_router.post("/auth/register")
async def register(body: FlatRegister):
    if body.block.upper() not in ["A", "B", "C", "D", "F"]:
        raise HTTPException(400, "Invalid block. Use A, B, C, D or F.")
    existing = await get_flat(body.block, body.flat_no)
    if existing:
        if existing.get("auto_created"):
            # This flat was pre-created by a corporate payer (e.g. school covering staff quarters).
            # A real resident is now completing their own profile on top of it.
            await db.flats.update_one(
                {"block": existing["block"], "flat_no": existing["flat_no"]},
                {"$set": {
                    "owner_name": body.owner_name or existing.get("owner_name", ""),
                    "phone": body.phone or existing.get("phone", ""),
                    "email": normalize_email(body.email) or existing.get("email", ""),
                    "auto_created": False,
                }},
            )
            updated = await get_flat(body.block, body.flat_no)
            dues = await compute_dues(updated)
            return {"exists": True, "flat": updated, "dues": dues}
        raise HTTPException(400, "Flat already registered. Please login.")
    flat = {
        "id": str(uuid.uuid4()),
        "block": body.block.upper(),
        "flat_no": str(body.flat_no),
        "bhk_type": body.bhk_type,
        "owner_name": body.owner_name or "",
        "phone": body.phone or "",
        "email": normalize_email(body.email),
        "start_month": body.start_month,
        "corporate_covered": False,
        "corporate_payer_id": None,
        "corporate_payer_name": None,
        "auto_created": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.flats.insert_one(flat.copy())
    dues = await compute_dues(flat)
    return {"exists": True, "flat": flat, "dues": dues}

@api_router.get("/dues/{block}/{flat_no}")
async def get_dues(block: str, flat_no: str):
    flat = await get_flat(block, flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    dues = await compute_dues(flat)
    return {"flat": flat, "dues": dues}

@api_router.post("/maintenance/pay")
async def pay_maintenance(body: PayMaintenance):
    require_txn_ref(body.upi_ref_no)
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    dues = await compute_dues(flat)
    pending = dues["pending_months"]
    opening_due_remaining = dues["opening_due_remaining"]
    if not pending and not body.include_conveyance and not (body.include_opening_due and opening_due_remaining > 0):
        raise HTTPException(400, "No dues to pay.")

    if body.mode == "full":
        months_to_pay = pending
    else:  # current_month
        now_ym = current_ym()
        if now_ym not in pending:
            raise HTTPException(400, "Current month is already paid or not yet billed.")
        months_to_pay = [now_ym]

    late_fee_pm = dues["late_fee_per_month"]
    late_months_paid = [m for m in months_to_pay if m in dues["late_months"]]
    late_fee_amount = len(late_months_paid) * late_fee_pm

    rate = dues["rate"]
    maint_amount = len(months_to_pay) * rate
    conveyance = CONVEYANCE if body.include_conveyance else 0
    # Opening due can only be cleared alongside a "full" payment (must clear everything together)
    opening_due_amount = opening_due_remaining if (body.include_opening_due and body.mode == "full") else 0
    total = maint_amount + conveyance + late_fee_amount + opening_due_amount

    receipt_no = await next_receipt_number()
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_no": receipt_no,
        "type": "maintenance",
        "block": flat["block"],
        "flat_no": flat["flat_no"],
        "owner_name": flat.get("owner_name", ""),
        "phone": flat.get("phone", ""),
        "bhk_type": flat["bhk_type"],
        "mode": body.mode,
        "months_covered": months_to_pay,
        "months_count": len(months_to_pay),
        "rate": rate,
        "maintenance_amount": maint_amount,
        "conveyance_amount": conveyance,
        "late_fee_amount": late_fee_amount,
        "late_months_paid": late_months_paid,
        "opening_due_amount": opening_due_amount,
        "total_amount": total,
        "upi_id": body.upi_id or "",
        "upi_ref_no": (body.upi_ref_no or "").strip(),
        "verified": False,
        "status": "success",
        "paid_at": now_iso,
        "paid_date": today_str(),
    }
    await db.maintenance_payments.insert_one(doc.copy())
    doc.pop("_id", None)
    fresh_dues = await compute_dues(flat)
    return {"receipt": doc, "dues": fresh_dues}

@api_router.post("/amenity/gym")
async def book_gym(body: BookGym):
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
    if body.members <= 0:
        raise HTTPException(400, "Members must be at least 1.")
    total = body.members * GYM_PER_PERSON
    receipt_no = await next_receipt_number()
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_no": receipt_no,
        "type": "gym",
        "block": flat["block"],
        "flat_no": flat["flat_no"],
        "owner_name": flat.get("owner_name", ""),
        "phone": flat.get("phone", ""),
        "bhk_type": flat["bhk_type"],
        "members": body.members,
        "rate_per_person": GYM_PER_PERSON,
        "total_amount": total,
        "booking_date": body.booking_date,
        "upi_id": body.upi_id or "",
        "upi_ref_no": (body.upi_ref_no or "").strip(),
        "verified": False,
        "status": "success",
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "paid_date": today_str(),
    }
    await db.amenity_bookings.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"receipt": doc}

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
    receipt_no = await next_receipt_number()
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_no": receipt_no,
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
        "status": "success",
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "paid_date": today_str(),
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
    receipt_no = await next_receipt_number()
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_no": receipt_no,
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
        "status": "success",
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
        receipt_no = await next_receipt_number()

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
            "receipt_no": receipt_no,
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
            "status": "success",
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "paid_date": today_str(),
        }
        await db.maintenance_payments.insert_one(doc.copy())
        doc.pop("_id", None)
        receipts.append(doc)

    return {"group_id": group_id, "receipts": receipts, "total_paid": sum(r["total_amount"] for r in receipts)}

# -------- GATE PASS (move-out flow) --------
@api_router.post("/gatepass/request")
async def request_gate_pass(body: GatePassRequest):
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    dues = await compute_dues(flat)
    if dues["has_any_due"]:
        raise HTTPException(400, "Clear all outstanding dues before requesting a gate pass.")
    receipt = await db.maintenance_payments.find_one(
        {"receipt_no": body.conveyance_receipt_no, "block": flat["block"], "flat_no": flat["flat_no"]}, {"_id": 0}
    )
    if not receipt or (receipt.get("conveyance_amount", 0) or 0) <= 0:
        raise HTTPException(400, "Provide a valid conveyance payment receipt for this flat before requesting a pass.")
    existing_pending = await db.gate_passes.find_one(
        {"block": flat["block"], "flat_no": flat["flat_no"], "status": "pending"}, {"_id": 0}
    )
    if existing_pending:
        raise HTTPException(400, "A gate pass request is already pending for this flat.")
    doc = {
        "id": str(uuid.uuid4()),
        "block": flat["block"],
        "flat_no": flat["flat_no"],
        "owner_name": flat.get("owner_name", ""),
        "conveyance_receipt_no": body.conveyance_receipt_no,
        "requested_by": body.requested_by,
        "corporate_payer_id": body.corporate_payer_id,
        "status": "pending",
        "pass_number": None,
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "rejected_reason": None,
    }
    await db.gate_passes.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"gate_pass": doc}

@api_router.get("/gatepass/status/{block}/{flat_no}")
async def gate_pass_status(block: str, flat_no: str):
    docs = await db.gate_passes.find(
        {"block": block.upper(), "flat_no": str(flat_no)}, {"_id": 0}
    ).sort("requested_at", -1).to_list(1)
    return {"gate_pass": docs[0] if docs else None}

@api_router.get("/admin/gatepasses")
async def list_gate_passes():
    docs = await db.gate_passes.find({}, {"_id": 0}).sort("requested_at", -1).to_list(500)
    return {"gate_passes": docs}

@api_router.post("/admin/gatepass/approve")
async def approve_gate_pass(body: GatePassAction):
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    gp = await db.gate_passes.find_one({"id": body.pass_id}, {"_id": 0})
    if not gp:
        raise HTTPException(404, "Gate pass request not found")
    pass_number = f"GP-{datetime.now(timezone.utc).strftime('%y%m%d')}-{gp['block']}{gp['flat_no']}"
    await db.gate_passes.update_one(
        {"id": body.pass_id},
        {"$set": {"status": "approved", "pass_number": pass_number, "approved_at": datetime.now(timezone.utc).isoformat()}},
    )
    updated = await db.gate_passes.find_one({"id": body.pass_id}, {"_id": 0})
    return {"gate_pass": updated}

@api_router.post("/admin/gatepass/reject")
async def reject_gate_pass(body: GatePassAction):
    if body.pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    gp = await db.gate_passes.find_one({"id": body.pass_id}, {"_id": 0})
    if not gp:
        raise HTTPException(404, "Gate pass request not found")
    await db.gate_passes.update_one(
        {"id": body.pass_id},
        {"$set": {"status": "rejected", "rejected_reason": body.reason or "Not specified"}},
    )
    updated = await db.gate_passes.find_one({"id": body.pass_id}, {"_id": 0})
    return {"gate_pass": updated}

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
async def all_payments(date_filter: Optional[str] = None):
    q = {}
    if date_filter:
        q = {"paid_date": date_filter}
    m = await db.maintenance_payments.find(q, {"_id": 0}).sort("paid_at", -1).to_list(2000)
    b = await db.amenity_bookings.find(q, {"_id": 0}).sort("paid_at", -1).to_list(2000)
    total_m = sum(x.get("total_amount", 0) for x in m)
    total_b = sum(x.get("total_amount", 0) for x in b)
    return {
        "maintenance": m,
        "bookings": b,
        "summary": {
            "maintenance_count": len(m),
            "maintenance_total": total_m,
            "bookings_count": len(b),
            "bookings_total": total_b,
            "grand_total": total_m + total_b,
        },
    }

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
