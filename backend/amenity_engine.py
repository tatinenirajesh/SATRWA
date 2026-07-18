from datetime import datetime

GYM_SLOTS = [
    "05:00-06:00",
    "06:00-07:00",
    "07:00-08:00",
    "08:00-09:00",
    "09:00-10:00",
    "10:00-11:00",

    "17:00-18:00",
    "18:00-19:00",
    "19:00-20:00",
    "20:00-21:00",
]

POOL_SLOTS = [
    "06:00-07:00",
    "07:00-08:00",
    "08:00-09:00",
    "09:00-10:00",
    "10:00-11:00",

    "17:00-18:00",
    "18:00-19:00",
    "19:00-20:00",
    "20:00-21:00",
    "21:00-22:00",
]


def gym_cycle(today=None):

    if today is None:
        today = datetime.today()

    if today.day >= 15:

        start = datetime(today.year, today.month, 15)

        if today.month == 12:

            end = datetime(today.year + 1, 1, 14)

        else:

            end = datetime(today.year, today.month + 1, 14)

    else:

        if today.month == 1:

            start = datetime(today.year - 1, 12, 15)

        else:

            start = datetime(today.year, today.month - 1, 15)

        end = datetime(today.year, today.month, 14)

    return start.date(), end.date()

def pool_cycle(today=None):

    if today is None:
        today = datetime.today()

    if today.day >= 19:

        start = datetime(
            today.year,
            today.month,
            19,
        )

        if today.month == 12:

            end = datetime(
                today.year + 1,
                1,
                18,
            )

        else:

            end = datetime(
                today.year,
                today.month + 1,
                18,
            )

    else:

        if today.month == 1:

            start = datetime(
                today.year - 1,
                12,
                19,
            )

        else:

            start = datetime(
                today.year,
                today.month - 1,
                19,
            )

        end = datetime(
            today.year,
            today.month,
            18,
        )

    return start.date(), end.date()
