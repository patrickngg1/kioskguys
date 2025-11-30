import html as html_lib
import datetime

# --------------------------------------------------
# RENDER RESERVATION CONFIRMATION (PREMIUM VERSION)
# --------------------------------------------------
def render_reservation_email(user, reservation, calendar_links, logo_url):
    user_first = user.first_name or user.username

    room_name = reservation.room.name
    date_str = reservation.date.strftime("%Y-%m-%d")
    time_str = f"{reservation.start_time.strftime('%I:%M %p')} – {reservation.end_time.strftime('%I:%M %p')}"

    google_link = calendar_links.get("google", "#")
    outlook_link = calendar_links.get("outlook", "#")
    ics_text = "Apple Calendar users: open the attached .ics file."

    html = f"""\
<html>
  <body style="margin:0; padding:0; background-color:#020617;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#020617; padding:40px 0;">
      <tr>
        <td align="center">

          <!-- Outer card -->
          <table width="640" cellpadding="0" cellspacing="0" border="0"
                 style="max-width:640px; background:radial-gradient(circle at 20% 0%,rgba(3,7,18,0.95) 0%,rgba(2,6,23,1) 35%,#020617 100%);
                        border-radius:26px; border:1px solid rgba(148,163,184,0.22);
                        box-shadow:0 28px 70px rgba(0,0,0,0.75); padding:32px;">
            
            <!-- Header row -->
            <tr>
              <td style="padding-bottom:20px;">
                <table width="100%">
                  <tr>
                    <td align="left">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right:12px;">
                            <img src="{logo_url}" width="46" height="46"
                                 style="display:block; border-radius:12px; border:1px solid rgba(148,163,184,0.25);" />
                          </td>
                          <td>
                            <div style="font-family:system-ui,'Segoe UI',sans-serif; 
                                        font-size:17px; font-weight:700; color:#e5e7eb;">
                              UTA Smart Kiosk
                            </div>
                            <div style="font-family:system-ui,'Segoe UI',sans-serif; 
                                        font-size:12px; color:rgba(148,163,184,0.85);">
                              ERSA building
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>

                    <td align="right"
                        style="font-family:system-ui,'Segoe UI',sans-serif; font-size:12px;
                               color:rgba(148,163,184,0.65);">
                      Reservation ID: #{reservation.id}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title block -->
            <tr>
              <td>
                <div style="font-family:system-ui,'Segoe UI',sans-serif; font-size:28px;
                            font-weight:800; color:#f9fafb; letter-spacing:0.02em;">
                  <span style="font-size:28px; vertical-align:middle; 
                               margin-right:10px; 
                               text-shadow:0 0 10px rgba(238,118,36,0.35);">✅</span>
                  Reservation Confirmed
                </div>

                <!-- Subtle orange accent line -->
                <div style="width:70px; height:3px; background:#EE7624; border-radius:3px;
                            margin-top:8px; margin-bottom:12px;"></div>

                <div style="font-family:system-ui,'Segoe UI',sans-serif; font-size:14px;
                            color:rgba(209,213,219,0.96); line-height:1.55;">
                  Hello <b>{user_first}</b>, your conference room reservation is locked in.
                </div>
              </td>
            </tr>

            <!-- Details glass card -->
            <tr>
              <td style="padding-top:20px;">
                <table width="100%" cellpadding="0" cellspacing="0" 
                       style="background:rgba(15,23,42,0.82);
                              border-radius:18px; border:1px solid rgba(148,163,184,0.3);
                              box-shadow:inset 0 0 35px rgba(3,7,18,0.35), 
                                         0 18px 55px rgba(0,0,0,0.4);">
                  <tr>
                    <td style="padding:22px;">
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:13px; color:rgba(156,163,175,0.9);">
                        Room:
                      </div>
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:18px; font-weight:700; color:#e5e7eb; padding-bottom:12px;">
                        {room_name}
                      </div>

                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:13px; color:rgba(156,163,175,0.9);">
                        Date:
                      </div>
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:16px; font-weight:600; color:#e5e7eb; padding-bottom:12px;">
                        {date_str}
                      </div>

                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:13px; color:rgba(156,163,175,0.9);">
                        Time:
                      </div>
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:16px; font-weight:600; color:#e5e7eb;">
                        {time_str}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main CTA -->
            <tr>
              <td align="center" style="padding-top:32px;">
                <a href="{google_link}"
                   style="display:inline-block; padding:14px 36px;
                          border-radius:999px;
                          background:linear-gradient(140deg,#3b82f6,#6366f1);
                          box-shadow:0 0 40px rgba(63,131,248,0.65), 
                                     0 8px 35px rgba(0,0,0,0.45);
                          font-family:system-ui,'Segoe UI',sans-serif;
                          font-size:15px; font-weight:700; color:#f9fafb;
                          text-decoration:none; letter-spacing:0.04em;">
                  Add to Calendar
                </a>
              </td>
            </tr>

            <!-- Calendar options row -->
            <tr>
              <td align="center" style="padding-top:22px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>

                    <!-- Outlook -->
                    <td style="padding:0 6px;">
                      <a href="{outlook_link}"
                         style="display:inline-block; padding:9px 15px;
                                border-radius:999px; border:1px solid rgba(238,118,36,0.55);
                                background:rgba(15,23,42,0.9);
                                font-family:system-ui,'Segoe UI',sans-serif;
                                font-size:12px; font-weight:600;
                                color:#e5e7eb; text-decoration:none;">
                        Outlook
                      </a>
                    </td>

                    <!-- Google -->
                    <td style="padding:0 6px;">
                      <a href="{google_link}"
                         style="display:inline-block; padding:9px 15px;
                                border-radius:999px; border:1px solid rgba(59,130,246,0.75);
                                background:rgba(15,23,42,0.98);
                                font-family:system-ui,'Segoe UI',sans-serif;
                                font-size:12px; font-weight:600;
                                color:#dbeafe; text-decoration:none;">
                        Google
                      </a>
                    </td>

                    <!-- Apple ICS -->
                    <td style="padding:0 6px;">
                      <span style="display:inline-block; padding:9px 15px;
                                   border-radius:999px; border:1px solid rgba(148,163,184,0.65);
                                   background:rgba(15,23,42,0.85);
                                   font-family:system-ui,'Segoe UI',sans-serif;
                                   font-size:12px; font-weight:600;
                                   color:#e5e7eb;">
                        Apple / ICS Attached
                      </span>
                    </td>

                  </tr>
                </table>
              </td>
            </tr>

            <!-- ICS note -->
            <tr>
              <td align="center" style="padding-top:16px;
                                       font-family:system-ui,'Segoe UI',sans-serif;
                                       font-size:11px; color:rgba(148,163,184,0.9);">
                {ics_text}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top:26px;
                                       font-family:system-ui,'Segoe UI',sans-serif;
                                       font-size:11px; color:rgba(107,114,128,0.95);">
                Thank you for using UTA Smart Kiosk.
              </td>
            </tr>
            <tr>
              <td align="center"
                  style="font-family:system-ui,'Segoe UI',sans-serif; font-size:10px;
                         color:rgba(75,85,99,0.95); padding-bottom:6px;">
                This email was sent automatically by the kiosk reservation system. Please do not reply.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
    return html



def render_cancellation_email(reservation, reason, logo_url, cancelled_by):
    """
    Premium cancellation email matching UTA Smart Kiosk theme.
    Uses UTA blue + orange, cinematic glass panel, and full layout.
    """

    user = reservation.user
    user_first = user.first_name or user.username or "User"

    room_name = reservation.room.name
    date_str = reservation.date.strftime("%Y-%m-%d")
    time_str = f"{reservation.start_time.strftime('%I:%M %p')} – {reservation.end_time.strftime('%I:%M %p')}"

    html = f"""\
<html>
  <body style="margin:0; padding:0; background-color:#020617;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#020617; padding:40px 0;">
      <tr>
        <td align="center">

          <!-- Outer card -->
          <table width="640" cellpadding="0" cellspacing="0" border="0"
            style="max-width:640px; background:radial-gradient(circle at 20% 0%,rgba(3,7,18,0.95) 0%,rgba(2,6,23,1) 35%,#020617 100%);
                   border-radius:26px; border:1px solid rgba(148,163,184,0.22);
                   box-shadow:0 28px 70px rgba(0,0,0,0.75); padding:32px;">

            <!-- Header -->
            <tr><td style="padding-bottom:20px;">
              <table width="100%"><tr>

                <!-- Logo block -->
                <td align="left">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="padding-right:12px;">
                      <img src="{logo_url}" width="46" height="46"
                           style="display:block; border-radius:12px;
                           border:1px solid rgba(148,163,184,0.25);" />
                    </td>
                    <td>
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:17px; font-weight:700; color:#e5e7eb;">
                        UTA Smart Kiosk
                      </div>
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:12px; color:rgba(148,163,184,0.85);">
                        ERSA building
                      </div>
                    </td>
                  </tr></table>
                </td>

                <!-- Reservation ID -->
                <td align="right"
                    style="font-family:system-ui,'Segoe UI',sans-serif; font-size:12px;
                           color:rgba(148,163,184,0.65);">
                  Cancellation Notice — #{reservation.id}
                </td>

              </tr></table>
            </td></tr>

            <!-- Title -->
            <tr><td>
              <div style="font-family:system-ui,'Segoe UI',sans-serif; font-size:26px;
                          font-weight:800; color:#f9fafb; letter-spacing:0.02em;">
                <span style="font-size:26px; vertical-align:middle; margin-right:10px;
                             text-shadow:0 0 14px rgba(238,118,36,0.55);">⚠️</span>
                Reservation Cancelled
              </div>

              <!-- UTA Orange line -->
              <div style="width:140px; height:3px; background:#EE7624; border-radius:3px;
                          margin-top:8px; margin-bottom:12px;">
              </div>

              <div style="font-family:system-ui,'Segoe UI',sans-serif; font-size:14px;
                          color:rgba(209,213,219,0.96); line-height:1.55;">
                Your reservation has been cancelled.
              </div>

              <div style="font-family:system-ui,'Segoe UI',sans-serif; font-size:13px;
                          color:rgba(209,213,219,0.7); padding-top:4px;">
                Cancelled by: <b>{cancelled_by}</b>
              </div>
            </td></tr>

            <!-- Details card -->
            <tr><td style="padding-top:22px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:rgba(15,23,42,0.86);
                       border-radius:18px; border:1px solid rgba(148,163,184,0.3);
                       box-shadow:inset 0 0 35px rgba(3,7,18,0.35),
                                  0 18px 55px rgba(0,0,0,0.4);">
                <tr><td style="padding:18px 22px;">

                  <div style="font-family:system-ui,'Segoe UI',sans-serif;
                              font-size:13px; color:rgba(156,163,175,0.9);">
                    Room:
                  </div>
                  <div style="font-family:system-ui,'Segoe UI',sans-serif;
                              font-size:16px; font-weight:600; color:#e5e7eb; padding-bottom:10px;">
                    {room_name}
                  </div>

                  <div style="font-family:system-ui,'Segoe UI',sans-serif;
                              font-size:13px; color:rgba(156,163,175,0.9);">
                    Date:
                  </div>
                  <div style="font-family:system-ui,'Segoe UI',sans-serif;
                              font-size:15px; color:#e5e7eb; padding-bottom:10px;">
                    {date_str}
                  </div>

                  <div style="font-family:system-ui,'Segoe UI',sans-serif;
                              font-size:13px; color:rgba(156,163,175,0.9);">
                    Time:
                  </div>
                  <div style="font-family:system-ui,'Segoe UI',sans-serif;
                              font-size:15px; color:#e5e7eb; padding-bottom:10px;">
                    {time_str}
                  </div>

                  <div style="font-family:system-ui,'Segoe UI',sans-serif;
                              font-size:13px; color:rgba(156,163,175,0.9);">
                    Reason:
                  </div>
                  <div style="font-family:system-ui,'Segoe UI',sans-serif;
                              font-size:14px; color:#e5e7eb;">
                    {reason or "No reason provided."}
                  </div>

                </td></tr>
              </table>
            </td></tr>

            <!-- Footer -->
            <tr><td align="center" style="padding-top:24px;
                                         font-family:system-ui,'Segoe UI',sans-serif;
                                         font-size:11px; color:rgba(148,163,184,0.9);">
              This email confirms that the reservation is no longer active.
            </td></tr>

            <tr><td align="center"
                style="font-family:system-ui,'Segoe UI',sans-serif; font-size:10px;
                       color:rgba(75,85,99,0.95); padding-top:4px;">
              This notification was generated automatically by UTA Smart Kiosk.
            </td></tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
</html>
"""
    return html


def render_bulk_cancellation_email(reservations, logo_url, cancelled_by, reason):
    """
    **PREMIUM BULK CANCELLATION EMAIL**
    Matches the exact visual style of reservation confirmed,
    reservation cancelled, and supply request.
    Shows ALL cancelled reservations in a glass card list.
    """

    if not reservations:
        return ""

    # All reservations belong to same user
    user = reservations[0].user
    user_first = user.first_name or user.username or "User"

    # Build reservation rows
    rows_html = ""
    for r in reservations:
        date_str = r.date.strftime("%Y-%m-%d")
        time_str = f"{r.start_time.strftime('%I:%M %p')} – {r.end_time.strftime('%I:%M %p')}"
        room_name = r.room.name

        rows_html += f"""
          <tr>
            <td style="padding:14px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:rgba(15,23,42,0.86);
                            border-radius:14px;
                            border:1px solid rgba(148,163,184,0.28);
                            padding:16px 18px;
                            box-shadow:inset 0 0 28px rgba(3,7,18,0.32),
                                       0 15px 45px rgba(0,0,0,0.35);">
                <tr>
                  <td>
                    <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                font-size:15px; font-weight:700; color:#e5e7eb;">
                      {room_name}
                    </div>

                    <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                font-size:13px; color:rgba(156,163,175,0.95);
                                margin-top:6px;">
                      {date_str} • {time_str}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        """

    # wrap email
    html = f"""\
<html>
  <body style="margin:0; padding:0; background-color:#020617;">
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#020617; padding:40px 0;">
      <tr><td align="center">

        <!-- Outer premium card -->
        <table width="640" cellpadding="0" cellspacing="0" border="0"
               style="max-width:640px;
                      background:radial-gradient(circle at 20% 0%,
                        rgba(3,7,18,0.95) 0%,
                        rgba(2,6,23,1) 35%,
                        #020617 100%);
                      border-radius:26px;
                      border:1px solid rgba(148,163,184,0.22);
                      box-shadow:0 28px 70px rgba(0,0,0,0.75);
                      padding:32px;">

          <!-- Header -->
          <tr><td style="padding-bottom:20px;">
            <table width="100%">
              <tr>

                <!-- Logo -->
                <td align="left">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:12px;">
                        <img src="{logo_url}" width="46" height="46"
                             style="display:block; border-radius:12px;
                             border:1px solid rgba(148,163,184,0.25);" />
                      </td>
                      <td>
                        <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                    font-size:17px; font-weight:700; color:#e5e7eb;">
                          UTA Smart Kiosk
                        </div>
                        <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                    font-size:12px; color:rgba(148,163,184,0.85);">
                          ERSA buiding
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>

                <!-- ID (Bulk) -->
                <td align="right"
                    style="font-family:system-ui,'Segoe UI',sans-serif;
                           font-size:12px; color:rgba(148,163,184,0.65);">
                  Cancellation Summary
                </td>

              </tr>
            </table>
          </td></tr>

          <!-- Title -->
          <tr><td>
            <div style="font-family:system-ui,'Segoe UI',sans-serif;
            font-size:26px; font-weight:800;
            color:#f9fafb; letter-spacing:0.02em;">
              <span style="font-size:26px; vertical-align:middle;
                          margin-right:10px;
                          text-shadow:0 0 14px rgba(238,118,36,0.55);">
                ⚠️
              </span>
              { "1 Reservation Cancelled" if len(reservations)==1 else f"{len(reservations)} Reservations Cancelled" }
            </div>

            <!-- Orange line -->
            <div style="width:160px; height:3px; background:#EE7624;
                        border-radius:3px; margin-top:8px; margin-bottom:12px;">
            </div>

            <div style="font-family:system-ui,'Segoe UI',sans-serif;
                        font-size:14px; color:rgba(209,213,219,0.96);
                        line-height:1.55;">
              Hello <b>{user_first}</b>, your reservations have been cancelled.
            </div>
            <div style="font-family:system-ui,'Segoe UI',sans-serif;
                        font-size:13px; color:rgba(209,213,219,0.7);
                        padding-top:4px;">
              Cancelled by: <b>{cancelled_by}</b>
            </div>

          </td></tr>

          <!-- Cancel reason -->
          <tr><td style="padding-top:18px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:rgba(15,23,42,0.86);
                          border-radius:18px;
                          border:1px solid rgba(148,163,184,0.3);
                          padding:18px 22px;
                          box-shadow:inset 0 0 35px rgba(3,7,18,0.35),
                                     0 18px 55px rgba(0,0,0,0.4);">

              <tr><td>
                <div style="font-family:system-ui,'Segoe UI',sans-serif;
                            font-size:13px; color:rgba(156,163,175,0.9);">
                  Reason:
                </div>
                <div style="font-family:system-ui,'Segoe UI',sans-serif;
                            font-size:14px; color:#e5e7eb; margin-top:4px;">
                  {reason}
                </div>
              </td></tr>

            </table>
          </td></tr>

          <!-- Cancelled reservations list -->
          <tr><td style="padding-top:26px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              {rows_html}
            </table>
          </td></tr>

          <!-- Footer -->
          <tr><td align="center"
              style="padding-top:24px; font-family:system-ui,'Segoe UI',sans-serif;
                     font-size:11px; color:rgba(148,163,184,0.9);">
            This email confirms that these reservations are no longer active.
          </td></tr>

          <tr><td align="center"
              style="font-family:system-ui,'Segoe UI',sans-serif; font-size:10px;
                     color:rgba(75,85,99,0.95); padding-top:4px;">
            This notification was generated automatically by UTA Smart Kiosk.
          </td></tr>

        </table>

      </td></tr>
    </table>
  </body>
</html>
"""
    return html



def render_supply_request_email(full_name, email, items, request_id, timestamp, logo_url):
    """
    Premium admin-facing email for a new supply request.
    Uses real item images from GitHub, one item per row.
    """

    full_name = full_name or "Unknown User"
    email = email or "Not provided"

    # Format timestamp safely
    try:
        timestamp_str = timestamp.strftime("%Y-%m-%d %I:%M %p")
    except Exception:
        timestamp_str = str(timestamp)

    # Helper: turn item name ("AA Batteries") into folder ("AA_Batteries")
    def folder_from_name(name: str) -> str:
        base = (name or "").strip()
        if not base:
            return "Unknown"
        # Replace slashes with space, then split on whitespace
        parts = base.replace("/", " ").split()
        norm_parts = []
        for p in parts:
            # Keep ALLCAPS tokens as-is (e.g., "AA")
            if p.isupper():
                norm_parts.append(p)
            else:
                norm_parts.append(p[0].upper() + p[1:])
        return "_".join(norm_parts)

    # Build rows for each item
    items = items or []
    if not isinstance(items, (list, tuple)):
        items = [str(items)]

    rows_html = ""
    for raw_name in items:
        display_name = str(raw_name or "").strip()
        safe_name = html_lib.escape(display_name or "(Unnamed item)")

        folder = folder_from_name(display_name)
        filename = f"{folder}.png"

        image_url = (
            "https://raw.githubusercontent.com/patrickngg1/kioskguys/main/"
            f"smartKiosk/media/items/{folder}/{filename}"
        )

        rows_html += f"""
          <tr>
            <td style="padding:10px 0; width:48px; vertical-align:middle;">
              <img src="{image_url}" alt="{safe_name}"
                   width="40" height="40"
                   style="display:block; border-radius:12px;
                          border:1px solid rgba(148,163,184,0.5);
                          object-fit:cover; background-color:#020617;" />
            </td>
            <td style="padding:10px 0; vertical-align:middle;
                       font-family:system-ui,'Segoe UI',sans-serif;
                       font-size:14px; color:#e5e7eb;">
              {safe_name}
            </td>
          </tr>
        """

    if not rows_html:
        rows_html = """
          <tr>
            <td colspan="2" style="padding:8px 0; font-family:system-ui,'Segoe UI',sans-serif;
                                   font-size:13px; color:rgba(148,163,184,0.9);">
              (No items listed)
            </td>
          </tr>
        """

    html = f"""\
<html>
  <body style="margin:0; padding:0; background-color:#020617;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#020617; padding:40px 0;">
      <tr>
        <td align="center">

          <!-- Outer card -->
          <table width="640" cellpadding="0" cellspacing="0" border="0"
                 style="max-width:640px; background:radial-gradient(circle at 20% 0%,rgba(3,7,18,0.95) 0%,rgba(2,6,23,1) 35%,#020617 100%);
                        border-radius:26px; border:1px solid rgba(148,163,184,0.22);
                        box-shadow:0 28px 70px rgba(0,0,0,0.75); padding:32px;">

            <!-- Header -->
            <tr>
              <td style="padding-bottom:20px;">
                <table width="100%">
                  <tr>
                    <td align="left">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right:12px;">
                            <img src="{logo_url}" width="46" height="46"
                                 style="display:block; border-radius:12px;
                                        border:1px solid rgba(148,163,184,0.25);" />
                          </td>
                          <td>
                            <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                        font-size:17px; font-weight:700; color:#e5e7eb;">
                              UTA Smart Kiosk
                            </div>
                            <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                        font-size:12px; color:rgba(148,163,184,0.85);">
                              ERSA building
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>

                    <td align="right"
                        style="font-family:system-ui,'Segoe UI',sans-serif; font-size:12px;
                               color:rgba(148,163,184,0.65);">
                      Supply Request ID: #{request_id}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td>
                <div style="font-family:system-ui,'Segoe UI',sans-serif; font-size:26px;
                            font-weight:800; color:#f9fafb; letter-spacing:0.02em;">
                  <span style="font-size:26px; vertical-align:middle; margin-right:10px;
                               text-shadow:0 0 10px rgba(34,197,94,0.45);">📦</span>
                  Supply Request Received
                </div>

                <!-- Subtle orange accent line -->
                <div style="width:110px; height:3px; background:#EE7624; border-radius:3px;
                            margin-top:8px; margin-bottom:12px;"></div>

                <div style="font-family:system-ui,'Segoe UI',sans-serif; font-size:14px;
                            color:rgba(209,213,219,0.96); line-height:1.55;">
                  A new supply request has been submitted via UTA Smart Kiosk.
                </div>
              </td>
            </tr>

            <!-- Requester details card -->
            <tr>
              <td style="padding-top:22px;">
                <table width="100%" cellpadding="0" cellspacing="0"
                       style="background:rgba(15,23,42,0.86);
                              border-radius:18px; border:1px solid rgba(148,163,184,0.3);
                              box-shadow:inset 0 0 35px rgba(3,7,18,0.35),
                                         0 18px 55px rgba(0,0,0,0.4);">
                  <tr>
                    <td style="padding:18px 22px;">
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:13px; color:rgba(156,163,175,0.9);">
                        Requested by:
                      </div>
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:16px; font-weight:600; color:#e5e7eb; padding-bottom:10px;">
                        {html_lib.escape(full_name)}
                      </div>

                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:13px; color:rgba(156,163,175,0.9);">
                        Email:
                      </div>
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:14px; color:#e5e7eb; padding-bottom:10px;">
                        {html_lib.escape(email)}
                      </div>

                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:13px; color:rgba(156,163,175,0.9);">
                        Requested at:
                      </div>
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:14px; color:#e5e7eb;">
                        {html_lib.escape(timestamp_str)}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Items list card -->
            <tr>
              <td style="padding-top:24px;">
                <table width="100%" cellpadding="0" cellspacing="0"
                       style="background:rgba(15,23,42,0.9);
                              border-radius:18px; border:1px solid rgba(148,163,184,0.3);
                              box-shadow:0 18px 55px rgba(0,0,0,0.4);">
                  <tr>
                    <td style="padding:18px 22px;">
                      <div style="font-family:system-ui,'Segoe UI',sans-serif;
                                  font-size:13px; color:rgba(156,163,175,0.9); padding-bottom:6px;">
                        Items requested:
                      </div>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        {rows_html}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top:24px;
                                       font-family:system-ui,'Segoe UI',sans-serif;
                                       font-size:11px; color:rgba(148,163,184,0.9);">
                Please use this email as a picking/fulfillment ticket for supplies.
              </td>
            </tr>
            <tr>
              <td align="center"
                  style="font-family:system-ui,'Segoe UI',sans-serif; font-size:10px;
                         color:rgba(75,85,99,0.95); padding-top:4px;">
                This notification was generated automatically by UTA Smart Kiosk.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
    return html


def render_password_reset_email(logo_url: str, code: str) -> str:
    """
    Premium UTA Smart Kiosk email for password reset (6-digit login code).
    Matches visual style of existing reservation & supply emails.
    """
    return f"""
    <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
        Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        background: #f3f4f6;
        padding: 40px 0;
        color: #111827;
    ">
      <div style="
          max-width: 520px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.85);
          border-radius: 20px;
          padding: 32px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.35);
      ">
        <div style="text-align:center; margin-bottom: 25px;">
          <img src="{logo_url}" alt="UTA Smart Kiosk" style="width: 68px; height: 68px;" />
        </div>

        <h2 style="
            font-size: 22px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 10px;
            color: #111827;
        ">
          Your Smart Kiosk Reset Code
        </h2>

        <p style="
            font-size: 15px;
            line-height: 1.55;
            margin-bottom: 22px;
            text-align: center;
        ">
          A password reset was requested for your UTA Smart Kiosk account.
          Use the 6-digit code below as your <strong>temporary password</strong>.
        </p>

        <div style="
            margin: 25px auto;
            text-align: center;
            padding: 14px 24px;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 3px;
            background: #2563eb;
            color: white;
            width: fit-content;
            border-radius: 12px;
            box-shadow: 0 3px 10px rgba(37, 99, 235, 0.32);
        ">
            {code}
        </div>

        <p style="
            font-size: 15px;
            line-height: 1.6;
            margin-top: 24px;
        ">
          <strong>How to log in:</strong><br/>
          1. Go to the kiosk login page<br/>
          2. Enter your email<br/>
          3. Enter the 6-digit code above as your password<br/>
          4. After logging in, you will be prompted to create a new password
        </p>

        <p style="
            font-size: 14px;
            color: #6b7280;
            margin-top: 20px;
        ">
          If you didn't request this, you can safely ignore this email.
        </p>

        <p style="
            font-size: 13px;
            color: #9ca3af;
            margin-top: 28px;
            text-align: center;
        ">
          © {datetime.datetime.now().year} UTA Smart Kiosk - All Rights Reserved.
        </p>
      </div>
    </div>
    """
