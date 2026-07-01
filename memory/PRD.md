# SATRWA — Sri Anjaneya Township App (PRD)

## Overview
Housing society mobile app for maintenance payments and clubhouse amenity bookings, with dues tracking and receipt series management. Themed in premium black & gold matching the SATRWA crest.

## Core Features (MVP)
1. **Passwordless Flat Login** — Select Block (A/B/C/D/F) + Flat No. First-time users register with BHK type, name, phone, and dues start month.
2. **Landing (Home)** — Dues summary card + two hero actions: Maintenance / Clubhouse.
3. **Maintenance Payment** — Shows total dues (auto-computed from start_month vs current month, minus paid months). Modes: Pay Full or Pay One Month (auto-adjusted to oldest pending month). Optional Conveyance Charge (₹250) toggle.
4. **Clubhouse Booking** — Dues gate (blocked if pending maintenance). Gym (₹300/person × N members) and Swimming Pool tiered tariff (1p=₹700, 2p=₹1000, 3p=₹1500, 4p=₹2000).
5. **Mock UPI Payment** — QR + UPI ID screen; enter user's UPI ID and confirm. Payment recorded to backend.
6. **Digital Receipt** — Premium certificate style with receipt no (auto-generated from active series), date, breakdown, PAID stamp.
7. **Payment History** — Combined maintenance + amenity list, tap-through to receipt.
8. **Committee Admin (PIN)** — Manage receipt series (add new for FY end, activate, view all). View all payments. Export all records to Excel (2 sheets: Maintenance, Amenities).

## Tariff
- 2BHK: ₹2000/month · 3BHK: ₹2500/month
- Conveyance (move-in/out): ₹250
- Gym: ₹300/person
- Pool: 1p=₹700, 2p=₹1000, 3p=₹1500, 4p=₹2000

## Receipt Series
- Default seed: `OP001–OP100`, active on startup.
- Admin can add new series (custom prefix + range) for FY-end. Adding a new series auto-deactivates previous. Admin can also activate any old series.

## UPI Payment (Real, ₹0 fees)
- **VPA**: `satrwa@icici` · **Payee**: `Sri Anjaneya Township RWA`
- One-tap deep-links to GPay/PhonePe/Paytm/any UPI app, pre-filled with amount + note (`Maint A-101` / `Gym B-202` etc.)
- Dynamic UPI QR generated per transaction with amount + note baked in
- No gateway fees; money goes directly to society's ICICI account
- Verification workflow: user taps "I have paid" and optionally enters 12-digit UPI Ref No (RRN) → receipt saved as **PENDING**. Committee marks **VERIFIED** in Admin → Today tab.

## Data / Backend
- Stack: FastAPI + MongoDB
- Collections: `flats`, `maintenance_payments`, `amenity_bookings`, `receipt_series`
- Excel export via pandas/openpyxl at `/api/admin/export?pin=...`

## Design Theme
- Black (`#0A0A0A`) surfaces, gold (`#D4AF37`) accents.
- Serif (Georgia) for brand/numerics, sans (System) for body.
- Ornate SATRWA crest badge on login.

## Not Included (Future)
- Real UPI gateway (Razorpay) — currently MOCKED.
- Push notifications.
- Multi-user auth / per-resident login.
