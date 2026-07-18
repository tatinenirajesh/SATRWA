from pymongo import ReturnDocument


async def next_receipt(

    db,

    book,

):

    doc = await db.receipt_books.find_one_and_update(

        {

            "book": book,

        },

        {

            "$inc": {

                "current": 1,

            }

        },

        return_document=ReturnDocument.AFTER,

    )

    if not doc:

        raise Exception(

            f"Receipt book {book} not found."

        )

    return f"{doc['prefix']}-{doc['current']:06d}"