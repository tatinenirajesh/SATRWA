from datetime import datetime, timezone
import uuid


async def create_booking(
    db,
    *,
    module,
    payment,
    booking_date,
    receipt_no,
    function_hall=False,
    dining_hall=False,
    room=None,
    checkin_date=None,
    checkout_date=None,
    checkin_time=None,
    checkout_time=None,
):

    booking = {

        "booking_id": str(uuid.uuid4()),

        "module": module,

        "payment_id": payment["payment_id"],

        "receipt_no": receipt_no,

        "block": payment["block"],

        "flat_no": payment["flat_no"],

        "payer_name": payment["payer_name"],

        "booking_date": booking_date,

        "function_hall": function_hall,

        "dining_hall": dining_hall,

        "room": room,

        "checkin_date": checkin_date,

        "checkout_date": checkout_date,

        "checkin_time": checkin_time,

        "checkout_time": checkout_time,

        "booking_amount": payment["amount"],

        "booking_status": "BOOKED",

        "timeline":[
            {
                "status":"BOOKED",
                "at":datetime.now(
                    timezone.utc
                ).isoformat(),
            }
        ],

        "created_at":
            datetime.now(
                timezone.utc
            ).isoformat(),

    }

    result = await db.bookings.insert_one(
        booking
    )

    booking["_id"] = str(result.inserted_id)

    return booking