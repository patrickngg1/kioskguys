# api/utils/calendar_utils.py
from urllib.parse import urlencode, quote
from datetime import datetime, timedelta
import uuid

def _dt_to_utc_z(dt: datetime):
    # Convert naive dt to UTC Z string. Your DB times look naive UTC already.
    return dt.strftime("%Y%m%dT%H%M%SZ")

def build_calendar_links(reservation):
    """
    Returns dict with:
      - google_url
      - outlook_url (Outlook Web)
      - ics_bytes
      - ics_filename
    """
    room = reservation.room.name
    title = f"UTA Smart Kiosk – {room} Reservation"
    location = f"UTA {room}"
    description = (
        f"Conference room reserved via UTA Smart Kiosk.\n\n"
        f"Room: {room}\n"
        f"Date: {reservation.date}\n"
        f"Time: {reservation.start_time} – {reservation.end_time}\n"
    )

    # Build start/end datetimes from reservation
    # reservation.date is YYYY-MM-DD, start_time/end_time are "HH:MM:SS" or "HH:MM"
    date_str = str(reservation.date)
    start_str = str(reservation.start_time)[:5]
    end_str = str(reservation.end_time)[:5]

    start_dt = datetime.fromisoformat(f"{date_str}T{start_str}:00")
    end_dt = datetime.fromisoformat(f"{date_str}T{end_str}:00")

    # GOOGLE CALENDAR LINK
    g_params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{_dt_to_utc_z(start_dt)}/{_dt_to_utc_z(end_dt)}",
        "details": description,
        "location": location,
    }
    google_url = "https://calendar.google.com/calendar/render?" + urlencode(g_params)

    # OUTLOOK WEB LINK (outlook.office.com/calendar/0/deeplink/compose)
    o_params = {
        "path": "/calendar/action/compose",
        "rru": "addevent",
        "subject": title,
        "startdt": start_dt.isoformat(),
        "enddt": end_dt.isoformat(),
        "body": description,
        "location": location,
    }
    outlook_url = "https://outlook.office.com/calendar/0/deeplink/compose?" + urlencode(o_params)

    # ICS FILE (for Apple Calendar + fallback download)
    uid = str(uuid.uuid4())
    ics = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//UTA Smart Kiosk//Room Reservation//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{_dt_to_utc_z(datetime.utcnow())}
DTSTART:{_dt_to_utc_z(start_dt)}
DTEND:{_dt_to_utc_z(end_dt)}
SUMMARY:{title}
LOCATION:{location}
DESCRIPTION:{description.replace("\n", "\\n")}
END:VEVENT
END:VCALENDAR
"""
    ics_bytes = ics.encode("utf-8")
    ics_filename = f"UTA_SmartKiosk_{room}_{date_str}.ics"

    return {
        "google_url": google_url,
        "outlook_url": outlook_url,
        "ics_bytes": ics_bytes,
        "ics_filename": ics_filename,
    }


def create_ics_content(room_name, start_dt, end_dt, reservation_id, user_email):
    """
    Generates a valid ICS file for Apple/Outlook calendar attachments.
    """
    uid = f"{reservation_id}-{uuid.uuid4()}@utasmartkiosk"
    
    dt_format = "%Y%m%dT%H%M%SZ"

    dt_start = start_dt.strftime(dt_format)
    dt_end = end_dt.strftime(dt_format)
    dt_stamp = datetime.utcnow().strftime(dt_format)

    ics = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//UTA Smart Kiosk//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{dt_stamp}
DTSTART:{dt_start}
DTEND:{dt_end}
SUMMARY:Room Reservation – {room_name}
DESCRIPTION:Your reservation for {room_name} is confirmed.
ORGANIZER;CN=UTA Smart Kiosk:mailto:{user_email}
END:VEVENT
END:VCALENDAR
""".strip()

    return ics.encode("utf-8")
