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

# ---------------- MODELS ----------------
class FlatRegister(BaseModel):
    block: str
    flat_no: str
    bhk_type: Literal["2BHK", "3BHK"]
    owner_name: Optional[str] = ""
    phone: Optional[str] = ""
    start_month: str

class FlatLogin(BaseModel):
    block: str
    flat_no: str

class PayMaintenance(BaseModel):
    block: str
    flat_no: str
    mode: Literal["full", "current_month"]
    include_conveyance: bool = False
    upi_id: Optional[str] = "user@upi"

class BookGym(BaseModel):
    block: str
    flat_no: str
    members: int
    booking_date: str
    upi_id: Optional[str] = "user@upi"

class BookPool(BaseModel):
    block: str
    flat_no: str
    persons: int
    booking_date: str
    upi_id: Optional[str] = "user@upi"

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

async def get_late_fee() -> int:
    doc = await db.admin_settings.find_one({"key": "late_fee"}, {"_id": 0})
    if not doc:
        return LATE_FEE_DEFAULT
    return int(doc.get("value", LATE_FEE_DEFAULT))

async def compute_dues(flat: dict) -> dict:
    start = flat["start_month"]
    now_ym = current_ym()
    all_months = month_range(start, now_ym)
    paid_docs = await db.maintenance_payments.find(
        {"block": flat["block"], "flat_no": flat["flat_no"]}, {"_id": 0}
    ).to_list(1000)
    paid_months = set()
    for p in paid_docs:
        for m in p.get("months_covered", []):
            paid_months.add(m)
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
        "total_due": maint_total + late_fee_total,
        "current_month": now_ym,
        "current_month_pending": now_ym in pending,
        "current_month_late": now_ym in late_months,
        "due_day": DUE_DAY,
        "all_months": all_months,
        "paid_months": sorted(list(paid_months)),
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
        raise HTTPException(400, "Flat already registered. Please login.")
    flat = {
        "id": str(uuid.uuid4()),
        "block": body.block.upper(),
        "flat_no": str(body.flat_no),
        "bhk_type": body.bhk_type,
        "owner_name": body.owner_name or "",
        "phone": body.phone or "",
        "start_month": body.start_month,
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
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    dues = await compute_dues(flat)
    pending = dues["pending_months"]
    if not pending and not body.include_conveyance:
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
    total = maint_amount + conveyance + late_fee_amount

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
        "total_amount": total,
        "upi_id": body.upi_id,
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
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    dues = await compute_dues(flat)
    if dues["pending_count"] > 0:
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
        "upi_id": body.upi_id,
        "status": "success",
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "paid_date": today_str(),
    }
    await db.amenity_bookings.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"receipt": doc}

@api_router.post("/amenity/pool")
async def book_pool(body: BookPool):
    flat = await get_flat(body.block, body.flat_no)
    if not flat:
        raise HTTPException(404, "Flat not registered")
    dues = await compute_dues(flat)
    if dues["pending_count"] > 0:
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
        "upi_id": body.upi_id,
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

    row("UPI ID", rec.get("upi_id", "-"))

    # Total
    y -= 4*mm
    c.setLineWidth(0.5); c.setStrokeColor(gold)
    c.line(18*mm, y, W - 18*mm, y)
    y -= 10*mm
    c.setFillColor(dark); c.setFont("Helvetica-Bold", 14)
    c.drawString(18*mm, y, "TOTAL PAID")
    c.setFillColor(gold); c.setFont("Helvetica-Bold", 20)
    c.drawRightString(W - 18*mm, y, f"Rs. {rec['total_amount']:,}")

    # PAID stamp
    c.saveState()
    c.translate(W - 45*mm, 40*mm); c.rotate(-15)
    c.setStrokeColor(colors.HexColor("#1E7A3E")); c.setFillColor(colors.HexColor("#1E7A3E"))
    c.setLineWidth(2)
    c.rect(-15*mm, -6*mm, 30*mm, 12*mm)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(0, -3*mm, "PAID")
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
    if body.late_fee < 0:
        raise HTTPException(400, "Invalid late fee")
    await db.admin_settings.update_one(
        {"key": "late_fee"},
        {"$set": {"value": body.late_fee, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"late_fee": body.late_fee}

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
