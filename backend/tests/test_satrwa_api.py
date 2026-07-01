"""SATRWA Township API tests.

Covers: auth, dues, maintenance payment, amenity bookings (gym/pool),
history, receipt lookup, tariff, admin (verify, series CRUD, export).
"""
import os
import uuid
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://township-maintenance.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_PIN = "1234"

# Use random flat numbers per run so re-running doesn't collide with previous data.
RUN_TAG = uuid.uuid4().hex[:6]
FLAT_WITH_DUES = {"block": "A", "flat_no": f"T{RUN_TAG}A"}   # start_month = 2025-01 (many dues)
FLAT_NO_DUES_AFTER_PAY = {"block": "B", "flat_no": f"T{RUN_TAG}B"}  # start current month


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
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_tariff(self, client):
        r = client.get(f"{API}/tariff")
        assert r.status_code == 200
        d = r.json()
        assert d["maintenance"] == {"2BHK": 2000, "3BHK": 2500}
        assert d["conveyance"] == 250
        assert d["gym_per_person"] == 300
        # keys become strings when JSON-encoded
        assert d["pool"]["1"] == 700 and d["pool"]["4"] == 2000


# ------------------ AUTH: LOGIN / REGISTER ------------------
class TestAuth:
    def test_login_nonexistent_returns_exists_false(self, client):
        r = client.post(f"{API}/auth/login", json={"block": "A", "flat_no": f"NX{RUN_TAG}"})
        assert r.status_code == 200
        assert r.json() == {"exists": False}

    def test_register_invalid_block(self, client):
        r = client.post(f"{API}/auth/register", json={
            "block": "Z", "flat_no": "999", "bhk_type": "2BHK",
            "owner_name": "X", "phone": "1", "start_month": "2025-01",
        })
        assert r.status_code == 400

    def test_register_flat_with_dues(self, client):
        r = client.post(f"{API}/auth/register", json={
            "block": FLAT_WITH_DUES["block"], "flat_no": FLAT_WITH_DUES["flat_no"],
            "bhk_type": "2BHK", "owner_name": "TEST Dues Owner",
            "phone": "9000000001", "start_month": "2025-01",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["exists"] is True
        assert data["flat"]["block"] == "A"
        assert data["dues"]["rate"] == 2000
        assert data["dues"]["pending_count"] >= 12  # from 2025-01 to at least 2026-01

    def test_register_duplicate_rejected(self, client):
        r = client.post(f"{API}/auth/register", json={
            "block": FLAT_WITH_DUES["block"], "flat_no": FLAT_WITH_DUES["flat_no"],
            "bhk_type": "2BHK", "start_month": "2025-01",
        })
        assert r.status_code == 400

    def test_login_existing(self, client):
        r = client.post(f"{API}/auth/login", json=FLAT_WITH_DUES)
        assert r.status_code == 200
        assert r.json()["exists"] is True

    def test_register_flat_no_dues(self, client):
        r = client.post(f"{API}/auth/register", json={
            "block": FLAT_NO_DUES_AFTER_PAY["block"], "flat_no": FLAT_NO_DUES_AFTER_PAY["flat_no"],
            "bhk_type": "3BHK", "owner_name": "TEST NoDues",
            "phone": "9000000002", "start_month": current_ym(),
        })
        assert r.status_code == 200
        assert r.json()["dues"]["pending_count"] == 1
        assert r.json()["dues"]["rate"] == 2500


# ------------------ DUES ------------------
class TestDues:
    def test_dues_flat_not_found(self, client):
        r = client.get(f"{API}/dues/A/NONEXISTENT_{RUN_TAG}")
        assert r.status_code == 404

    def test_dues_amount(self, client):
        r = client.get(f"{API}/dues/{FLAT_WITH_DUES['block']}/{FLAT_WITH_DUES['flat_no']}")
        assert r.status_code == 200
        d = r.json()["dues"]
        assert d["total_due"] == d["pending_count"] * 2000


# ------------------ MAINTENANCE PAY ------------------
class TestMaintenancePay:
    def test_pay_one_month_oldest(self, client):
        # Before
        d0 = client.get(f"{API}/dues/{FLAT_WITH_DUES['block']}/{FLAT_WITH_DUES['flat_no']}").json()["dues"]
        oldest = d0["pending_months"][0]
        count0 = d0["pending_count"]

        r = client.post(f"{API}/maintenance/pay", json={
            **FLAT_WITH_DUES, "mode": "one_month",
            "include_conveyance": False, "upi_id": "test@upi",
        })
        assert r.status_code == 200
        rec = r.json()["receipt"]
        assert rec["type"] == "maintenance"
        assert rec["mode"] == "one_month"
        assert rec["months_covered"] == [oldest]
        assert rec["total_amount"] == 2000
        assert rec["receipt_no"].startswith("OP")

        # Verify persisted via receipt lookup
        g = client.get(f"{API}/receipt/{rec['receipt_no']}")
        assert g.status_code == 200 and g.json()["receipt_no"] == rec["receipt_no"]

        # Dues decreased by 1
        d1 = r.json()["dues"]
        assert d1["pending_count"] == count0 - 1
        assert oldest in d1["paid_months"]

    def test_pay_full_with_conveyance(self, client):
        d0 = client.get(f"{API}/dues/{FLAT_WITH_DUES['block']}/{FLAT_WITH_DUES['flat_no']}").json()["dues"]
        pending_count = d0["pending_count"]
        expected = pending_count * 2000 + 250

        r = client.post(f"{API}/maintenance/pay", json={
            **FLAT_WITH_DUES, "mode": "full",
            "include_conveyance": True, "upi_id": "test@upi",
        })
        assert r.status_code == 200
        rec = r.json()["receipt"]
        assert rec["months_count"] == pending_count
        assert rec["conveyance_amount"] == 250
        assert rec["total_amount"] == expected

        # No dues after
        d1 = r.json()["dues"]
        assert d1["pending_count"] == 0
        assert d1["total_due"] == 0

    def test_pay_no_dues_no_conveyance_fails(self, client):
        r = client.post(f"{API}/maintenance/pay", json={
            **FLAT_WITH_DUES, "mode": "full", "include_conveyance": False,
        })
        assert r.status_code == 400


# ------------------ AMENITY (dues gate + booking) ------------------
class TestAmenity:
    def test_gym_blocked_when_dues(self, client):
        # FLAT_NO_DUES_AFTER_PAY currently has 1 pending month
        r = client.post(f"{API}/amenity/gym", json={
            **FLAT_NO_DUES_AFTER_PAY, "members": 2, "booking_date": "2026-02-10",
        })
        assert r.status_code == 402

    def test_pool_blocked_when_dues(self, client):
        r = client.post(f"{API}/amenity/pool", json={
            **FLAT_NO_DUES_AFTER_PAY, "persons": 2, "booking_date": "2026-02-10",
        })
        assert r.status_code == 402

    def test_clear_dues_then_book_gym(self, client):
        # Clear the single pending month
        r = client.post(f"{API}/maintenance/pay", json={
            **FLAT_NO_DUES_AFTER_PAY, "mode": "full", "include_conveyance": False,
        })
        assert r.status_code == 200
        assert r.json()["dues"]["pending_count"] == 0

        # Book gym for 3 members = 900
        g = client.post(f"{API}/amenity/gym", json={
            **FLAT_NO_DUES_AFTER_PAY, "members": 3, "booking_date": "2026-02-11",
        })
        assert g.status_code == 200
        rec = g.json()["receipt"]
        assert rec["type"] == "gym"
        assert rec["total_amount"] == 900
        assert rec["receipt_no"].startswith("OP")

    def test_book_pool_tiered(self, client):
        for persons, expected in [(1, 700), (2, 1000), (3, 1500), (4, 2000)]:
            r = client.post(f"{API}/amenity/pool", json={
                **FLAT_NO_DUES_AFTER_PAY, "persons": persons, "booking_date": "2026-02-12",
            })
            assert r.status_code == 200, f"persons={persons} status={r.status_code}"
            assert r.json()["receipt"]["total_amount"] == expected

    def test_pool_invalid_persons(self, client):
        r = client.post(f"{API}/amenity/pool", json={
            **FLAT_NO_DUES_AFTER_PAY, "persons": 5, "booking_date": "2026-02-12",
        })
        assert r.status_code == 400


# ------------------ HISTORY / RECEIPT ------------------
class TestHistoryReceipt:
    def test_history(self, client):
        r = client.get(f"{API}/history/{FLAT_WITH_DUES['block']}/{FLAT_WITH_DUES['flat_no']}")
        assert r.status_code == 200
        d = r.json()
        assert len(d["maintenance"]) >= 2  # one_month + full

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
        assert r.status_code == 200 and r.json()["ok"] is False

    def test_list_series_has_active(self, client):
        r = client.get(f"{API}/admin/series")
        assert r.status_code == 200
        series = r.json()["series"]
        assert any(s.get("active") for s in series)

    def test_create_series_requires_pin(self, client):
        r = client.post(f"{API}/admin/series", json={
            "prefix": "TT", "start": 1, "end": 5, "pin": "wrong",
        })
        assert r.status_code == 401

    def test_create_and_activate_series(self, client):
        # Create new series -> becomes active
        prefix = f"T{RUN_TAG[:2].upper()}"
        r = client.post(f"{API}/admin/series", json={
            "prefix": prefix, "start": 1, "end": 5, "pin": ADMIN_PIN,
        })
        assert r.status_code == 200
        new_series = r.json()["series"]
        assert new_series["active"] is True
        assert new_series["current"] == 1

        # Verify listing shows only new one active
        listing = client.get(f"{API}/admin/series").json()["series"]
        active = [s for s in listing if s.get("active")]
        assert len(active) == 1 and active[0]["id"] == new_series["id"]

        # Reactivate the original OP series so subsequent tests / app still use OP
        op_series = next((s for s in listing if s["prefix"] == "OP"), None)
        assert op_series is not None
        r2 = client.post(f"{API}/admin/series/activate", json={
            "series_id": op_series["id"], "pin": ADMIN_PIN,
        })
        assert r2.status_code == 200

    def test_export_xlsx(self, client):
        r = client.get(f"{API}/admin/export", params={"pin": ADMIN_PIN})
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("content-type", "")
        assert len(r.content) > 100

    def test_export_bad_pin(self, client):
        r = client.get(f"{API}/admin/export", params={"pin": "wrong"})
        assert r.status_code == 401
