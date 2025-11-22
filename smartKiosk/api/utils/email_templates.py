# api/utils/email_templates.py

def base_html_wrapper(content: str, logo_url: str):
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Smart Kiosk Notification</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>

<body style="margin:0; padding:0; background:#0b1220; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width:640px; margin:34px auto; padding:0 14px;">
    <div style="
        background:rgba(12,18,33,0.94);
        border-radius:24px;
        padding:34px 30px;
        box-shadow:0 18px 60px rgba(0,0,0,0.55);
        border:1px solid rgba(255,255,255,0.05);
        backdrop-filter:blur(18px) saturate(180%);
      ">

      <!-- Header / Branding -->
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:22px;">
        <img src="{logo_url}" width="46" height="46"
             style="border-radius:12px; display:block;" alt="UTA Logo"/>
        <div>
          <div style="font-size:17px; font-weight:800; color:#ffffff; letter-spacing:0.3px;">
            UTA Smart Kiosk
          </div>
          <div style="font-size:12px; color:#9aa4b2;">
            Premium Campus Services
          </div>
        </div>
      </div>

      {content}

    </div>
  </div>
</body>
</html>
"""


def render_reservation_email(user, reservation, calendar_links, logo_url):
    room = reservation.room.name
    date = reservation.date
    start = str(reservation.start_time)[:5]
    end = str(reservation.end_time)[:5]

    display_name = user.first_name or user.email

    google_url = calendar_links["google_url"]
    outlook_url = calendar_links["outlook_url"]

    content = f"""
      <h1 style="margin:8px 0 12px; color:#ffffff; font-size:28px; font-weight:800;">
        ✅ Reservation Confirmed
      </h1>

      <p style="font-size:16px; color:#d7dde6; line-height:1.6;">
        Hello <strong>{display_name}</strong>, your conference room reservation is locked in.
      </p>

      <div style="
          background:rgba(56,115,255,0.10);
          border:1px solid rgba(56,115,255,0.25);
          border-radius:16px;
          padding:18px 20px;
          margin:20px 0;
      ">
        <div style="font-size:15px; color:#e5eaf2; line-height:1.7;">
          <strong>Room:</strong> {room}<br/>
          <strong>Date:</strong> {date}<br/>
          <strong>Time:</strong> {start} – {end}<br/>
        </div>
      </div>

      <!-- Primary CTA -->
      <div style="text-align:center; margin:18px 0 8px;">
        <div style="
          display:inline-block;
          padding:14px 26px;
          background:linear-gradient(135deg,#4a78ff,#1b3c96);
          color:#fff;
          font-size:15px;
          font-weight:700;
          border-radius:14px;
          box-shadow:0 10px 30px rgba(0,72,255,0.35);
        ">
          📅 Add to Calendar
        </div>
      </div>

      <!-- Dropdown Options (email-safe layout) -->
      <div style="text-align:center; margin-bottom:22px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="padding:6px;">
              <a href="{outlook_url}"
                 style="
                   display:inline-block;
                   padding:10px 16px;
                   background:rgba(255,255,255,0.06);
                   color:#ffffff;
                   text-decoration:none;
                   font-size:13px;
                   font-weight:600;
                   border-radius:10px;
                   border:1px solid rgba(255,255,255,0.08);
                 ">
                Outlook
              </a>
            </td>
            <td style="padding:6px;">
              <a href="{google_url}"
                 style="
                   display:inline-block;
                   padding:10px 16px;
                   background:rgba(255,255,255,0.06);
                   color:#ffffff;
                   text-decoration:none;
                   font-size:13px;
                   font-weight:600;
                   border-radius:10px;
                   border:1px solid rgba(255,255,255,0.08);
                 ">
                Google
              </a>
            </td>
            <td style="padding:6px;">
              <span
                 style="
                   display:inline-block;
                   padding:10px 16px;
                   background:rgba(255,255,255,0.06);
                   color:#ffffff;
                   font-size:13px;
                   font-weight:600;
                   border-radius:10px;
                   border:1px solid rgba(255,255,255,0.08);
                 ">
                Apple / ICS Attached
              </span>
            </td>
          </tr>
        </table>

        <p style="margin-top:10px; font-size:12px; color:#9aa4b2;">
          Apple Calendar users: open the attached .ics file.
        </p>
      </div>

      <p style="margin-top:20px; font-size:13px; color:#9aa4b2;">
        Thank you for using UTA Smart Kiosk.
      </p>
    """

    return base_html_wrapper(content, logo_url)


def render_cancellation_email(reservation, reason, logo_url):
    room = reservation.room.name
    date = reservation.date
    start = reservation.start_time
    end = reservation.end_time

    content = f"""
      <h1 style="margin:8px 0 14px; color:#ff6b6b; font-size:26px; font-weight:800;">
        ❌ Reservation Cancelled
      </h1>

      <p style="font-size:16px; color:#d7dde6;">
        Your reservation has been cancelled.
      </p>

      <div style="
        background:rgba(255,107,107,0.08);
        border:1px solid rgba(255,107,107,0.25);
        border-radius:14px;
        padding:18px 20px;
        margin:20px 0;
        color:#e5eaf2;
      ">
        <strong>Room:</strong> {room}<br/>
        <strong>Date:</strong> {date}<br/>
        <strong>Original Time:</strong> {start} – {end}<br/>
        <strong>Reason:</strong> {reason}
      </div>

      <p style="font-size:13px; color:#9aa4b2;">
        Please make a new reservation anytime.
      </p>
    """

    return base_html_wrapper(content, logo_url)
