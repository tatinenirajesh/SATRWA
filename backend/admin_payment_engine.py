from datetime import datetime, timezone

from payment_engine import (
    PAYMENT_PENDING,
    PAYMENT_VERIFIED,
)

from receipt_engine import next_receipt


async def verify_payment(

    db,

    payment_id: str,

    verified_by: str,

):

    payment = await db.payments.find_one(
        {
            "payment_id": payment_id,
        }
    )

    if not payment:

        raise Exception("Payment not found.")

    if payment["status"] == PAYMENT_VERIFIED:

        raise Exception("Already verified.")

    receipt = await next_receipt(

        db,

        payment["receipt_book"],

    )

    await db.payments.update_one(

        {
            "payment_id": payment_id,
        },

        {

            "$set": {

                "status": PAYMENT_VERIFIED,

                "receipt_no": receipt,

                "verified_by": verified_by,

                "verified_at": datetime.now(
                    timezone.utc
                ).isoformat(),

            }

        },

    )

    return receipt