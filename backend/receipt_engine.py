from datetime import datetime

RECEIPT_PREFIX = {
    "MAINTENANCE": "MR",
    "COMMUNITY_HALL": "CH",
    "GUEST_HOUSE": "GH",
    "AMENITY": "AM",
    "CORPUS": "CF",
    "DONATION": "DN",
}

async def next_receipt(db, module):

    today = datetime.now()

    year = today.strftime("%Y")
    month = today.strftime("%m")

    prefix = RECEIPT_PREFIX.get(module, "RC")

    key = f"{prefix}-{year}-{month}"

    series = await db.receipt_series.find_one(
        {"key": key}
    )

    if not series:

        await db.receipt_series.insert_one({
            "key": key,
            "last_no": 1,
        })

        number = 1

    else:

        number = series["last_no"] + 1

        await db.receipt_series.update_one(
            {"key": key},
            {
                "$set": {
                    "last_no": number
                }
            }
        )

    return f"{prefix}-{year}{month}-{number:05d}"