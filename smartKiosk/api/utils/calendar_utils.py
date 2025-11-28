# api/utils/calendar_utils.py
from __future__ import annotations

import base64
from datetime import datetime
from urllib.parse import quote_plus
from django.utils import timezone


# ------------------------------------------------------------
# BUILD CALENDAR LINKS (Google, Outlook)
# ------------------------------------------------------------
def build_calendar_links(room_name, start_dt=None, end_dt=None, details_url=None):
    """
    Preferred signature (used in your latest views.py):
        build_calendar_links(room_name, start_dt, end_dt, details_url)

    Backward-compat:
        build_calendar_links(reservation_obj)
    """
    # Backward compat: build_calendar_links(reservation)
    if start_dt is None and hasattr(room_name, "room"):
        reservation = room_name
        room_name = reservation.room.name
        date_str = str(reservation.date)
        start_str = str(reservation.start_time)[:5]
        end_str = str(reservation.end_time)[:5]
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(
            datetime.fromisoformat(f"{date_str}T{start_str}:00"), tz
        )
        end_dt = timezone.make_aware(
            datetime.fromisoformat(f"{date_str}T{end_str}:00"), tz
        )
        details_url = details_url or ""

    if details_url is None:
        details_url = ""

    # Use local wall-clock strings for Google with explicit CTZ
    start_local = start_dt.strftime("%Y%m%dT%H%M%S")
    end_local = end_dt.strftime("%Y%m%dT%H%M%S")

    title = f"Room Reservation — {room_name}"
    desc = f"Reserved via UTA Smart Kiosk. Details: {details_url}"

    # Google Calendar wants local times + ctz
    google_url = (
        "https://calendar.google.com/calendar/render?action=TEMPLATE"
        f"&text={quote_plus(title)}"
        f"&dates={start_local}/{end_local}"
        "&ctz=America/Chicago"
        f"&details={quote_plus(desc)}"
        f"&location={quote_plus(room_name)}"
    )

    # Outlook deep link (ISO is safest here)
    outlook_url = (
        "https://outlook.live.com/calendar/0/deeplink/compose?"
        f"subject={quote_plus(title)}"
        f"&startdt={quote_plus(start_dt.isoformat())}"
        f"&enddt={quote_plus(end_dt.isoformat())}"
        f"&body={quote_plus(desc)}"
        f"&location={quote_plus(room_name)}"
    )

    return {
        "google": google_url,
        "outlook": outlook_url,
    }


# ------------------------------------------------------------
# CREATE ICS FILE CONTENT (TZID version, not UTC-only)
# ------------------------------------------------------------
def create_ics_content(room_name, start_dt, end_dt, reservation_id, user_email):
    """
    Generates an ICS event with explicit TZID for America/Chicago.
    Returns bytes (ready to attach).
    """
    tz_name = "America/Chicago"
    dt_format = "%Y%m%dT%H%M%S"

    dt_start = start_dt.strftime(dt_format)
    dt_end = end_dt.strftime(dt_format)
    dt_stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")  # RFC5545 requires UTC stamp

    ics = f"""BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
PRODID:-//UTA Smart Kiosk//EN
BEGIN:VEVENT
UID:{reservation_id}@utasmartkiosk
DTSTAMP:{dt_stamp}
DTSTART;TZID={tz_name}:{dt_start}
DTEND;TZID={tz_name}:{dt_end}
SUMMARY:Conference Room Reservation ({room_name})
DESCRIPTION:Your reservation for {room_name} is confirmed.
ORGANIZER:mailto:{user_email}
END:VEVENT
END:VCALENDAR
"""
    return ics.encode("utf-8")


# ------------------------------------------------------------
# Encode ICS for SendGrid attachment
# ------------------------------------------------------------
def build_ics_payload(ics_bytes: bytes):
    return {
        "content": base64.b64encode(ics_bytes).decode("utf-8"),
        "type": "text/calendar",  # SendGrid forbids "; charset=..."
        "filename": "reservation.ics",
        "disposition": "attachment",
    }
