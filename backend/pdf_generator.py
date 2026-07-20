from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
)
import os


def generate_gate_pass(data):

    folder = "uploads/gatepasses"

    os.makedirs(folder, exist_ok=True)

    filename = f"{data['gate_pass_no']}.pdf"

    filepath = os.path.join(folder, filename)

    doc = SimpleDocTemplate(filepath)

    styles = getSampleStyleSheet()

    title = styles["Heading1"]
    title.alignment = TA_CENTER

    story = []

    story.append(
        Paragraph(
            "SATRWA COMMUNITY",
            title,
        )
    )

    story.append(
        Paragraph(
            "<b>MOVE OUT GATE PASS</b>",
            styles["Heading2"],
        )
    )

    story.append(Spacer(1, 0.30 * inch))

    story.append(
        Paragraph(
            f"<b>Gate Pass No :</b> {data['gate_pass_no']}",
            styles["BodyText"],
        )
    )

    story.append(
        Paragraph(
            f"<b>Block :</b> {data['block']}",
            styles["BodyText"],
        )
    )

    story.append(
        Paragraph(
            f"<b>Flat :</b> {data['flat_no']}",
            styles["BodyText"],
        )
    )

    story.append(
        Paragraph(
            f"<b>Resident :</b> {data['owner_name']}",
            styles["BodyText"],
        )
    )

    story.append(
        Paragraph(
            f"<b>Move Out Date :</b> {data['move_out_date']}",
            styles["BodyText"],
        )
    )

    story.append(
        Paragraph(
            f"<b>Vehicle Number :</b> {data['vehicle_number']}",
            styles["BodyText"],
        )
    )

    story.append(
        Paragraph(
            f"<b>Reason :</b> {data['reason']}",
            styles["BodyText"],
        )
    )

    story.append(
        Paragraph(
            f"<b>Conveyance Charges :</b> ₹250",
            styles["BodyText"],
        )
    )

    story.append(Spacer(1, 0.40 * inch))

    story.append(
        Paragraph(
            "Security is requested to allow the above vehicle after verification.",
            styles["Italic"],
        )
    )

    story.append(Spacer(1, 0.70 * inch))

    story.append(
        Paragraph(
            "__________________________",
            styles["BodyText"],
        )
    )

    story.append(
        Paragraph(
            "Committee Authorization",
            styles["BodyText"],
        )
    )

    doc.build(story)

    return filepath