"""SATRWA Township API tests - Iteration 2.

Covers: auth, dues (with late-fee), maintenance payment (full & current_month modes),
amenity bookings, history, receipt lookup, receipt PDF, tariff (with late_fee/due_day),
admin (verify, series CRUD, late-fee GET/POST, payments summary, today payments,
Excel export all/today).
"""
import os
import uuid
from datetime import datetime, timezone, date

import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://township-maintenance.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_PIN = "1234"

RUN_TAG = uuid.uuid4().hex[:6]
FLAT_LATE = {"block": "C", "flat_no": f"L{RUN_TAG}"}   # start_month = 2025-06 (many late months)
FLAT_CURRENT = {"block": "B", "flat_no": f"C{RUN_TAG}"}  # start current YYYY-MM


def current_ym() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.year:04d}-{now.month:02d}"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ------------------ HEALTH / TARIFF ------------------
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200 and r.json().get("ok") is True

    def test_tariff_includes_late_fee_and_due_day(self, client):
        r = client.get(f"{API}/tariff")
        assert r.status_code == 200
        d = r.json()
        assert d["maintenance"] == {"2BHK": 2000, "3BHK": 2500}
        assert d["conveyance"] == 250
        assert d["gym_per_person"] == 300
        assert d["pool"]["1"] == 700 and d["pool"]["4"] == 2000
        assert "late_fee" in d and isinstance(d["late_fee"], int)
        assert d["due_day"] == 15


# ------------------ AUTH ------------------
class TestAuth:
    def test_login_nonexistent(self, client):
        r = client.post(f"{API}/auth/login", json={"block": "A", "flat_no": f"NX{RUN_TAG}"})
        assert r.status_code == 200 and r.json() == {"exists": False}

    def test_register_invalid_block(self, client):
        r = client.post(f"{API}/auth/register", json={
            "block": "Z", "flat_no": "999", "bhk_type": "2BHK", "start_month": "2025-01",
        })
        assert r.status_code == 400

    def test_register_flat_with_late_dues(self, client):
        r = client.post(f"{API}/auth/register", json={
            "block": FLAT_LATE["block"], "flat_no": FLAT_LATE["flat_no"],
            "bhk_type": "2BHK", "owner_name": "TEST LateOwner",
            "phone": "9000000001", "start_month": "2025-06",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["exists"] is True
        assert d["flat"]["block"] == "C"
        dues = d["dues"]
        assert dues["rate"] == 2000
        # from 2025-06 to current month
        assert dues["pending_count"] >= 8
        assert dues["late_count"] >= 1
        assert dues["late_fee_per_month"] >= 0
        assert dues["late_fee_total"] == dues["late_count"] * dues["late_fee_per_month"]
        assert dues["maintenance_total"] == dues["pending_count"] * 2000
        assert dues["total_due"] == dues["maintenance_total"] + dues["late_fee_total"]
        assert dues["due_day"] == 15
        assert "current_month" in dues and "current_month_pending" in dues and "current_month_late" in dues

    def test_register_duplicate_rejected(self, client):
        r = client.post(f"{API}/auth/register", json={
            "block": FLAT_LATE["block"], "flat_no": FLAT_LATE["flat_no"],
            "bhk_type": "2BHK", "start_month": "2025-06",
        })
        assert r.status_code == 400

    def test_register_flat_current_month(self, client):
        r = client.post(f"{API}/auth/register", json={
            "block": FLAT_CURRENT["block"], "flat_no": FLAT_CURRENT["flat_no"],
            "bhk_type": "3BHK", "owner_name": "TEST NoDues",
            "phone": "9000000002", "start_month": current_ym(),
        })
        assert r.status_code == 200
        dues = r.json()["dues"]
        assert dues["pending_count"] == 1
        assert dues["rate"] == 2500
        assert dues["current_month_pending"] is True
        # late only if today.day > 15
        today = date.today()
        expected_late = today.day > 15
        assert dues["current_month_late"] is expected_late

    def test_login_existing(self, client):
        r = client.post(f"{API}/auth/login", json=FLAT_LATE)
        assert r.status_code == 200 and r.json()["exists"] is True


# ------------------ DUES ------------------
class TestDues:
    def test_dues_flat_not_found(self, client):
        r = client.get(f"{API}/dues/A/NONEXISTENT_{RUN_TAG}")
        assert r.status_code == 404

    def test_dues_has_all_new_fields(self, client):
        r = client.get(f"{API}/dues/{FLAT_LATE['block']}/{FLAT_LATE['flat_no']}")
        assert r.status_code == 200
        d = r.json()["dues"]
        for k in ["late_months", "late_count", "late_fee_per_month", "late_fee_total",
                  "maintenance_total", "current_month", "current_month_pending",
                  "current_month_late", "due_day", "total_due", "pending_months"]:
            assert k in d, f"missing field {k}"


# ------------------ MAINTENANCE PAY ------------------
class TestMaintenancePay:
    def test_pay_current_month_only(self, client):
        # FLAT_CURRENT has 1 pending (current) month
        d0 = client.get(f"{API}/dues/{FLAT_CURRENT['block']}/{FLAT_CURRENT['flat_no']}").json()["dues"]
        assert d0["current_month_pending"] is True
        expected_late = d0["late_fee_per_month"] if d0["current_month_late"] else 0

        r = client.post(f"{API}/maintenance/pay", json={
            **FLAT_CURRENT, "mode": "current_month",
            "include_conveyance": False, "upi_id": "test@upi",
        })
        assert r.status_code == 200
        rec = r.json()["receipt"]
        assert rec["mode"] == "current_month"
        assert rec["months_covered"] == [d0["current_month"]]
        assert rec["late_fee_amount"] == expected_late
        assert rec["total_amount"] == 2500 + expected_late
        assert rec["receipt_no"].startswith("OP") or len(rec["receipt_no"]) > 2

        # dues cleared for current month
        d1 = r.json()["dues"]
        assert d1["current_month_pending"] is False
        assert d1["pending_count"] == 0

    def test_pay_current_month_when_not_pending_returns_400(self, client):
        # Already paid above - retry should 400
        r = client.post(f"{API}/maintenance/pay", json={
            **FLAT_CURRENT, "mode": "current_month", "include_conveyance": False,
        })
        assert r.status_code == 400

    def test_pay_full_with_late_fee(self, client):
        d0 = client.get(f"{API}/dues/{FLAT_LATE['block']}/{FLAT_LATE['flat_no']}").json()["dues"]
        pending_count = d0["pending_count"]
        late_count = d0["late_count"]
        late_pm = d0["late_fee_per_month"]
        expected_total = pending_count * 2000 + 250 + late_count * late_pm

        r = client.post(f"{API}/maintenance/pay", json={
            **FLAT_LATE, "mode": "full",
            "include_conveyance": True, "upi_id": "test@upi",
        })
        assert r.status_code == 200
        rec = r.json()["receipt"]
        assert rec["months_count"] == pending_count
        assert rec["conveyance_amount"] == 250
        assert rec["late_fee_amount"] == late_count * late_pm
        assert len(rec["late_months_paid"]) == late_count
        assert rec["total_amount"] == expected_total

        d1 = r.json()["dues"]
        assert d1["pending_count"] == 0 and d1["total_due"] == 0

    def test_pay_no_dues_no_conveyance_fails(self, client):
        r = client.post(f"{API}/maintenance/pay", json={
            **FLAT_LATE, "mode": "full", "include_conveyance": False,
        })
        assert r.status_code == 400


# ------------------ AMENITY ------------------
class TestAmenity:
    def test_gym_after_dues_cleared(self, client):
        r = client.post(f"{API}/amenity/gym", json={
            **FLAT_CURRENT, "members": 3, "booking_date": "2026-02-11",
        })
        assert r.status_code == 200
        assert r.json()["receipt"]["total_amount"] == 900

    def test_pool_tiered(self, client):
        for persons, expected in [(1, 700), (2, 1000), (3, 1500), (4, 2000)]:
            r = client.post(f"{API}/amenity/pool", json={
                **FLAT_CURRENT, "persons": persons, "booking_date": "2026-02-12",
            })
            assert r.status_code == 200
            assert r.json()["receipt"]["total_amount"] == expected

    def test_pool_invalid(self, client):
        r = client.post(f"{API}/amenity/pool", json={
            **FLAT_CURRENT, "persons": 5, "booking_date": "2026-02-12",
        })
        assert r.status_code == 400


# ------------------ RECEIPT + PDF ------------------
class TestReceiptPDF:
    def test_receipt_pdf_valid(self, client):
        # Grab any receipt from history
        h = client.get(f"{API}/history/{FLAT_LATE['block']}/{FLAT_LATE['flat_no']}").json()
        assert len(h["maintenance"]) >= 1
        rno = h["maintenance"][0]["receipt_no"]

        r = client.get(f"{API}/receipt/{rno}/pdf")
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")
        assert r.content.startswith(b"%PDF-1.4") or r.content.startswith(b"%PDF-")
        assert len(r.content) > 500

    def test_receipt_pdf_not_found(self, client):
        r = client.get(f"{API}/receipt/OP999999/pdf")
        assert r.status_code == 404

    def test_receipt_not_found(self, client):
        r = client.get(f"{API}/receipt/OP999999")
        assert r.status_code == 404


# ------------------ ADMIN ------------------
class TestAdmin:
    def test_verify_ok(self, client):
        r = client.post(f"{API}/admin/verify", json={"pin": ADMIN_PIN})
        assert r.status_code == 200 and r.json()["ok"] is True

    def test_verify_bad(self, client):
        r = client.post(f"{API}/admin/verify", json={"pin": "0000"})
        assert r.json()["ok"] is False

    def test_late_fee_get(self, client):
        r = client.get(f"{API}/admin/late-fee")
        assert r.status_code == 200
        assert "late_fee" in r.json() and isinstance(r.json()["late_fee"], int)

    def test_late_fee_set_wrong_pin(self, client):
        r = client.post(f"{API}/admin/late-fee", json={"late_fee": 100, "pin": "wrong"})
        assert r.status_code == 401

    def test_late_fee_set_negative(self, client):
        r = client.post(f"{API}/admin/late-fee", json={"late_fee": -1, "pin": ADMIN_PIN})
        assert r.status_code == 400

    def test_late_fee_set_and_get_roundtrip(self, client):
        r = client.post(f"{API}/admin/late-fee", json={"late_fee": 75, "pin": ADMIN_PIN})
        assert r.status_code == 200 and r.json()["late_fee"] == 75
        g = client.get(f"{API}/admin/late-fee").json()
        assert g["late_fee"] == 75
        # restore default
        client.post(f"{API}/admin/late-fee", json={"late_fee": 50, "pin": ADMIN_PIN})

    def test_payments_summary(self, client):
        r = client.get(f"{API}/admin/payments")
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d
        s = d["summary"]
        for k in ["grand_total", "maintenance_total", "bookings_total",
                  "maintenance_count", "bookings_count"]:
            assert k in s
        assert s["grand_total"] == s["maintenance_total"] + s["bookings_total"]
        assert s["maintenance_count"] == len(d["maintenance"])
        assert s["bookings_count"] == len(d["bookings"])

    def test_payments_today(self, client):
        r = client.get(f"{API}/admin/payments/today")
        assert r.status_code == 200
        d = r.json()
        today = date.today().isoformat()
        for p in d["maintenance"] + d["bookings"]:
            assert p.get("paid_date") == today

    def test_payments_date_filter(self, client):
        r = client.get(f"{API}/admin/payments", params={"date_filter": "1999-01-01"})
        assert r.status_code == 200
        d = r.json()
        assert d["maintenance"] == [] and d["bookings"] == []
        assert d["summary"]["grand_total"] == 0

    def test_export_all_xlsx(self, client):
        r = client.get(f"{API}/admin/export", params={"pin": ADMIN_PIN})
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("content-type", "")
        assert len(r.content) > 100

    def test_export_today_xlsx(self, client):
        r = client.get(f"{API}/admin/export/today", params={"pin": ADMIN_PIN})
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("content-type", "")
        assert len(r.content) > 100

    def test_export_bad_pin(self, client):
        r = client.get(f"{API}/admin/export", params={"pin": "wrong"})
        assert r.status_code == 401

    def test_export_today_bad_pin(self, client):
        r = client.get(f"{API}/admin/export/today", params={"pin": "wrong"})
        assert r.status_code == 401
