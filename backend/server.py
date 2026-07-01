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
from datetime import datetime, timezone

import pandas as pd

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

# ---------------- MODELS ----------------
class FlatRegister(BaseModel):
    block: str  # A,B,C,D,F
    flat_no: str
    bhk_type: Literal["2BHK", "3BHK"]
    owner_name: Optional[str] = ""
    phone: Optional[str] = ""
    start_month: str  # "YYYY-MM"

class FlatLogin(BaseModel):
    block: str
    flat_no: str

class PayMaintenance(BaseModel):
    block: str
    flat_no: str
    mode: Literal["full", "one_month"]
    include_conveyance: bool = False
    upi_id: Optional[str] = "user@upi"

class BookGym(BaseModel):
    block: str
    flat_no: str
    members: int
    booking_date: str  # YYYY-MM-DD
    upi_id: Optional[str] = "user@upi"

class BookPool(BaseModel):
    block: str
    flat_no: str
    persons: int  # 1..4
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

# ---------------- HELPERS ----------------
def month_range(start_ym: str, end_ym: str) -> List[str]:
    """Inclusive month strings YYYY-MM from start to end."""
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

async def get_flat(block: str, flat_no: str) -> Optional[dict]:
    return await db.flats.find_one({"block": block.upper(), "flat_no": str(flat_no)}, {"_id": 0})

async def compute_dues(flat: dict) -> dict:
    start = flat["start_month"]
    now = current_ym()
    all_months = month_range(start, now)
    paid_docs = await db.maintenance_payments.find(
        {"block": flat["block"], "flat_no": flat["flat_no"]}, {"_id": 0}
    ).to_list(1000)
    paid_months = set()
    for p in paid_docs:
        for m in p.get("months_covered", []):
            paid_months.add(m)
    pending = [m for m in all_months if m not in paid_months]
    rate = MAINT_RATES[flat["bhk_type"]]
    return {
        "bhk_type": flat["bhk_type"],
        "rate": rate,
        "pending_months": pending,
        "pending_count": len(pending),
        "total_due": len(pending) * rate,
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
    # Seed default OP series 1..100 if none exists
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
    else:
        months_to_pay = pending[:1]

    rate = dues["rate"]
    maint_amount = len(months_to_pay) * rate
    conveyance = CONVEYANCE if body.include_conveyance else 0
    total = maint_amount + conveyance

    receipt_no = await next_receipt_number()
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "receipt_no": receipt_no,
        "type": "maintenance",
        "block": flat["block"],
        "flat_no": flat["flat_no"],
        "owner_name": flat.get("owner_name", ""),
        "bhk_type": flat["bhk_type"],
        "mode": body.mode,
        "months_covered": months_to_pay,
        "months_count": len(months_to_pay),
        "rate": rate,
        "maintenance_amount": maint_amount,
        "conveyance_amount": conveyance,
        "total_amount": total,
        "upi_id": body.upi_id,
        "status": "success",
        "paid_at": now_iso,
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
        "bhk_type": flat["bhk_type"],
        "members": body.members,
        "rate_per_person": GYM_PER_PERSON,
        "total_amount": total,
        "booking_date": body.booking_date,
        "upi_id": body.upi_id,
        "status": "success",
        "paid_at": datetime.now(timezone.utc).isoformat(),
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
        "bhk_type": flat["bhk_type"],
        "persons": body.persons,
        "total_amount": total,
        "booking_date": body.booking_date,
        "upi_id": body.upi_id,
        "status": "success",
        "paid_at": datetime.now(timezone.utc).isoformat(),
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
    # Deactivate all others
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

@api_router.get("/admin/payments")
async def all_payments():
    m = await db.maintenance_payments.find({}, {"_id": 0}).sort("paid_at", -1).to_list(2000)
    b = await db.amenity_bookings.find({}, {"_id": 0}).sort("paid_at", -1).to_list(2000)
    return {"maintenance": m, "bookings": b}

@api_router.get("/admin/export")
async def export_excel(pin: str):
    if pin != ADMIN_PIN:
        raise HTTPException(401, "Invalid PIN")
    m = await db.maintenance_payments.find({}, {"_id": 0}).sort("paid_at", 1).to_list(5000)
    b = await db.amenity_bookings.find({}, {"_id": 0}).sort("paid_at", 1).to_list(5000)

    def flatten(doc):
        doc = dict(doc)
        if "months_covered" in doc and isinstance(doc["months_covered"], list):
            doc["months_covered"] = ", ".join(doc["months_covered"])
        return doc

    df_m = pd.DataFrame([flatten(x) for x in m]) if m else pd.DataFrame()
    df_b = pd.DataFrame([flatten(x) for x in b]) if b else pd.DataFrame()
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        (df_m if not df_m.empty else pd.DataFrame([{"info": "No maintenance payments"}])).to_excel(writer, sheet_name="Maintenance", index=False)
        (df_b if not df_b.empty else pd.DataFrame([{"info": "No amenity bookings"}])).to_excel(writer, sheet_name="Amenities", index=False)
    buf.seek(0)
    fname = f"satrwa_records_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={fname}"},
    )

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
