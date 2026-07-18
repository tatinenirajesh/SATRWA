from datetime import datetime, timezone
import uuid

PAYMENT_CREATED = "PAYMENT_CREATED"
PAYMENT_PENDING = "PAYMENT_PENDING_VERIFICATION"
PAYMENT_VERIFIED = "PAYMENT_VERIFIED"
PAYMENT_REJECTED = "PAYMENT_REJECTED"


async def create_payment(
    db,
    *,
    module,
    entity_type,
    entity_id,
    payer_name,
    block,
    flat_no,
    amount,
    payment_mode,
    receipt_book,
    remarks="",
    reference_id=None,
):

    payment = {

        "payment_id": str(uuid.uuid4()),

        "reference_id": reference_id,

        "module": module,

        "entity_type": entity_type,

        "entity_id": entity_id,

        "payer_name": payer_name,

        "block": block,

        "flat_no": flat_no,

        "amount": amount,

        "payment_mode": payment_mode,

        "receipt_book": receipt_book,

        "receipt_no": None,

        "status": PAYMENT_CREATED,

        "upi_id": "",

        "upi_ref_no": "",

        "verified_by": None,

        "verified_at": None,

        "remarks": remarks,

        "created_at": datetime.now(
            timezone.utc
        ).isoformat(),

    }

    await db.payments.insert_one(payment)

    return payment

async def submit_payment(

    db,

    payment_id,

    upi_id,

    upi_ref_no,

):

    await db.payments.update_one(

        {

            "payment_id": payment_id,

        },

        {

            "$set":{

                "status":"PAYMENT_PENDING_VERIFICATION",

                "upi_id":upi_id,

                "upi_ref_no":upi_ref_no,

            }

        }

    )