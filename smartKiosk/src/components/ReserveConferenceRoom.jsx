// src/components/ReserveConferenceRoom.jsx
// ---------------------------------------------------------------
// PREMIUM OPTION A + C FINAL
// - Room cards show only when there are 1–2 rooms
//   and animate out when rooms >= 3
// - My Reservations panel: Vision-style
// - Multi-select cancel
// - Confirmation panel: ONLY TWO buttons (Yes / Keep)
// - No inline styles added
// ---------------------------------------------------------------
import '../styles/Dashboard.css';
import '../styles/reserveModal.css';
import React, { useEffect, useMemo, useState } from 'react';

// Convert 12h time + period to "HH:MM" (24h)
const to24h = (hour, minute, period) => {
  if (!hour || !minute || !period) return null;
  let h = parseInt(hour, 10);
  let m = parseInt(minute, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 1 || h > 12 || m < 0 || m > 59) return null;

  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Combine "YYYY-MM-DD" + "HH:MM" into local JS Date
const combineDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  if ([year, month, day, hour, minute].some(Number.isNaN)) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

// Interval overlap test for [start,end)
const overlaps = (startA, endA, startB, endB) => startA < endB && startB < endA;

// Convert "HH:MM" (24h) to "h:MM AM/PM"
const to12HourDisplay = (timeStr) => {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${suffix}`;
};

function ReserveConferenceRoom({
  isOpen,
  onClose,
  user,
  setToast,
  setToastShake,
  onReservationCreated,
  existingReservations = [],
}) {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [reservationData, setReservationData] = useState({
    roomId: '',
    date: '',
    startHour: '',
    startMin: '',
    startPeriod: 'AM',
    endHour: '',
    endMin: '',
    endPeriod: 'AM',
  });

  // My reservations (future only)
  const [myPanelOpen, setMyPanelOpen] = useState(false);
  const [loadingMyReservations, setLoadingMyReservations] = useState(false);
  const [myReservations, setMyReservations] = useState([]);

  // Multi-select cancellation
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Track cancelled locally so overlap checks ignore parent-cached ones
  const [locallyCancelledIds, setLocallyCancelledIds] = useState([]);

  const todayISO = new Date().toISOString().split('T')[0];

  // ✅ Show clickable room cards only when there are 1–2 rooms.
  const cardsShouldShow = rooms.length > 0 && rooms.length <= 2;

  // We keep cards mounted briefly for a smooth exit animation.
  const [cardsRender, setCardsRender] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    if (cardsShouldShow) {
      setCardsRender(true);
      // next frame so CSS transition can run
      requestAnimationFrame(() => setCardsVisible(true));
    } else {
      setCardsVisible(false);
      const t = setTimeout(() => setCardsRender(false), 280);
      return () => clearTimeout(t);
    }
  }, [cardsShouldShow]);

  // Load rooms + my reservations when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadRooms = async () => {
      setLoadingRooms(true);
      try {
        const res = await fetch('http://localhost:8000/api/rooms/', {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          console.error('Room load failed:', data);
          setRooms([]);
          return;
        }
        setRooms(data.rooms || []);
      } catch (err) {
        console.error('Rooms fetch error:', err);
        setRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };

    const loadMyReservations = async () => {
      if (!user) {
        setMyReservations([]);
        return;
      }
      setLoadingMyReservations(true);
      try {
        const res = await fetch(
          'http://localhost:8000/api/rooms/reservations/my/',
          { credentials: 'include' }
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          console.error('My reservations load failed:', data);
          setMyReservations([]);
          return;
        }
        setMyReservations(data.reservations || []);
      } catch (err) {
        console.error('My reservations fetch error:', err);
        setMyReservations([]);
      } finally {
        setLoadingMyReservations(false);
      }
    };

    loadRooms();
    loadMyReservations();

    // reset selection each open
    setSelectedIds([]);
    setConfirmingCancel(false);
    setLocallyCancelledIds([]);
    setMyPanelOpen(false);
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Sort future reservations
  const sortedMyReservations = useMemo(() => {
    const arr = [...(myReservations || [])];
    arr.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
    return arr;
  }, [myReservations]);

  const firstSelectedId = selectedIds[0] || null;
  const selectedCount = selectedIds.length;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        if (id === firstSelectedId) setConfirmingCancel(false);
        return next;
      }
      return [...prev, id];
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setConfirmingCancel(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // ⭐ stops the hard page reload
    e.stopPropagation();

    if (!user) {
      setToast('Please sign in first.');
      setToastShake(true);
      return;
    }

    const {
      roomId,
      date,
      startHour,
      startMin,
      startPeriod,
      endHour,
      endMin,
      endPeriod,
    } = reservationData;

    if (!roomId || !date || !startHour || !startMin || !endHour || !endMin) {
      setToast('Please complete all fields.');
      setToastShake(true);
      return;
    }

    const start24 = to24h(startHour, startMin, startPeriod);
    const end24 = to24h(endHour, endMin, endPeriod);

    if (!start24 || !end24) {
      setToast('Invalid time.');
      setToastShake(true);
      return;
    }

    if (end24 <= start24) {
      setToast('End time must be after start time.');
      setToastShake(true);
      return;
    }

    // Prevent past times on today
    const now = new Date();
    const startDT = combineDateTime(date, start24);
    const endDT = combineDateTime(date, end24);

    if (!startDT || !endDT) {
      setToast('Invalid date/time selection.');
      setToastShake(true);
      return;
    }

    if (date === todayISO && endDT <= now) {
      setToast('Please choose a time later today.');
      setToastShake(true);
      return;
    }

    // Client-side overlap (existing + my future), ignore locally cancelled
    const combined = [
      ...(existingReservations || []),
      ...(myReservations || []),
    ];

    const conflict = combined.some((r) => {
      if (r.cancelled) return false;
      if (locallyCancelledIds.includes(r.id)) return false;
      if (String(r.roomId) !== String(roomId)) return false;
      if (r.date !== date) return false;
      return overlaps(start24, end24, r.startTime, r.endTime);
    });

    if (conflict) {
      setToast('That time slot is already reserved.');
      setToastShake(true);
      return;
    }

    setSubmitting(true);
    setToast('Submitting...');
    setToastShake(false);

    try {
      const res = await fetch('http://localhost:8000/api/rooms/reserve/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          date,
          startTime: start24,
          endTime: end24,
        }),
      });
      // Safely parse backend response
      let data = null;

      try {
        data = await res.json();
      } catch {
        // Backend returned no JSON body (common with 201 Created)
        data = {};
      }

      // Correct success detection
      if (!res.ok || data.ok !== true) {
        if (res.status === 409) {
          setToast(
            data.message ||
              data.error ||
              'This room is already reserved for that time.'
          );
        } else {
          setToast(data.error || 'Reservation failed.');
        }
        setToastShake(true);
        return;
      }

      const r = data.reservation;

      onReservationCreated({
        id: r.id,
        roomId: r.roomId,
        roomName: r.roomName,
        capacity: r.capacity,
        hasScreen: r.hasScreen,
        hasHdmi: r.hasHdmi,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
        cancelled: r.cancelled,
        cancelReason: r.cancelReason || '',
      });

      // Add into local "my reservations"
      setMyReservations((prev) => [
        ...prev,
        {
          id: r.id,
          roomId: r.roomId,
          roomName: r.roomName,
          date: r.date,
          startTime: r.startTime,
          endTime: r.endTime,
          cancelled: r.cancelled,
        },
      ]);

      setToast(
        `Room Reserved:\n${r.roomName} ${r.date} ${r.startTime}–${r.endTime}`
      );
      setToastShake(false);

      // Reset form
      setReservationData({
        roomId: '',
        date: '',
        startHour: '',
        startMin: '',
        startPeriod: 'AM',
        endHour: '',
        endMin: '',
        endPeriod: 'AM',
      });

      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      setToast('Network error.');
      setToastShake(true);
    } finally {
      setSubmitting(false);
    }
  };

  // In src/components/ReserveConferenceRoom.jsx (Replace the existing function with this)
  const handleConfirmCancelSelected = async () => {
    if (selectedIds.length === 0) return;

    setCancelSubmitting(true);
    setToast('Cancelling reservations...');
    setToastShake(false);

    const successes = [];
    const failures = [];

    for (const id of selectedIds) {
      try {
        const res = await fetch(
          `http://localhost:8000/api/rooms/reservations/${id}/cancel/`,
          {
            method: 'POST',
            credentials: 'include',
            // 💡 FIX APPLIED: Removed headers and body to send the cleanest request possible.
            // The backend's request.body read will handle the parsing gracefully.
          }
        );

        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        const msg = (data?.error || data?.message || '').toLowerCase();
        const alreadyCanceled = msg.includes('already');

        // Only count success when backend confirms it,
        // OR when it is already canceled (race-proof).
        if ((res.ok && data.ok) || alreadyCanceled) {
          successes.push(id);
          setLocallyCancelledIds((prev) => [...prev, id]);
        } else {
          failures.push({
            id,
            error:
              data?.error ||
              data?.message ||
              `Cancel failed (status ${res.status})`,
          });
        }
      } catch (err) {
        failures.push({ id, error: 'Network error' });
      }
    }

    // ✅ Only remove the ones that truly succeeded
    if (successes.length > 0) {
      setMyReservations((prev) =>
        prev.filter((r) => !successes.includes(r.id))
      );
    }

    // ✅ Toasts that make sense in kiosk UX
    if (failures.length > 0) {
      if (successes.length === 0) {
        setToast(
          failures[0]?.error?.includes('Database unavailable')
            ? 'Database offline — cancellation didn’t go through.'
            : 'Unable to cancel selected reservations.'
        );
      } else {
        setToast(
          `Cancelled ${successes.length} reservation(s). ${failures.length} failed.`
        );
      }
      setToastShake(true);
    } else {
      setToast(`Cancelled ${successes.length} reservation(s).`);
      setToastShake(false);
    }

    clearSelection();
    setConfirmingCancel(false);
    setCancelSubmitting(false);
  };

  return (
    <div className='modal-overlay' onClick={() => !submitting && onClose()}>
      <div
        className='modal-box reserve-box'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className='close-btn'
          type='button'
          onClick={() => !submitting && onClose()}
        >
          ✕
        </button>

        <h2>Reserve Conference Room</h2>

        {/* ROOM CARDS (only when 1–2 rooms, animated) */}
        {cardsRender && (
          <div
            className={`rooms-row rooms-row-premium ${
              cardsVisible ? 'cards-in' : 'cards-out'
            }`}
          >
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`room-card ${
                  String(reservationData.roomId) === String(room.id)
                    ? 'selected'
                    : ''
                }`}
                onClick={() =>
                  setReservationData((d) => ({ ...d, roomId: room.id }))
                }
              >
                <div className='room-name'>{room.name}</div>
                <div className='room-meta'>
                  Capacity: {room.capacity} ·{' '}
                  {room.hasScreen ? 'Screen' : 'No Screen'} ·{' '}
                  {room.hasHdmi ? 'HDMI' : 'No HDMI'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OPTION A: Vision toggle ABOVE the form */}
        <div className='myres-toggle-row'>
          <div className='myres-toggle-label'>
            My Reservations
            <span className='myres-toggle-sub'>Upcoming only</span>
          </div>

          <button
            type='button'
            className={`vision-toggle ${myPanelOpen ? 'on' : 'off'}`}
            role='switch'
            aria-checked={myPanelOpen}
            onClick={() => setMyPanelOpen((o) => !o)}
          >
            <span className='vision-toggle-knob' />
          </button>
        </div>

        {/* PANEL */}
        <div className={`myres-panel ${myPanelOpen ? 'open' : 'closed'}`}>
          {myPanelOpen && (
            <>
              {loadingMyReservations ? (
                <p className='myres-loading'>Loading reservations…</p>
              ) : sortedMyReservations.length === 0 ? (
                <p className='myres-empty'>
                  You have no upcoming reservations.
                </p>
              ) : (
                <>
                  <div className='myres-list'>
                    {sortedMyReservations.map((res) => {
                      const isSelected = selectedIds.includes(res.id);

                      return (
                        <React.Fragment key={res.id}>
                          <div
                            className={`myres-card ${
                              isSelected ? 'selected' : ''
                            }`}
                            onClick={() => toggleSelect(res.id)}
                          >
                            <div className='myres-card-left'>
                              <div className='myres-room'>{res.roomName}</div>
                              <div className='myres-time'>
                                {res.date} · {to12HourDisplay(res.startTime)} –{' '}
                                {to12HourDisplay(res.endTime)}
                              </div>
                            </div>

                            <button
                              type='button'
                              className={`vision-toggle small ${
                                isSelected ? 'on' : 'off'
                              }`}
                              role='checkbox'
                              aria-checked={isSelected}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(res.id);
                              }}
                            >
                              <span className='vision-toggle-knob' />
                            </button>
                          </div>

                          {/* Slide-down confirmation under FIRST selected card */}
                          {confirmingCancel && firstSelectedId === res.id && (
                            <div className='cancel-confirm-panel'>
                              <p className='cancel-confirm-text'>
                                Cancel {selectedCount} reservation
                                {selectedCount > 1 ? 's' : ''}?
                              </p>
                              <div className='cancel-confirm-actions'>
                                <button
                                  type='button'
                                  className='btn btn-primary cancel-confirm-btn'
                                  onClick={handleConfirmCancelSelected}
                                >
                                  Yes, Cancel the reservation
                                </button>

                                <button
                                  type='button'
                                  className='btn btn-primary cancel-confirm-btn keep-btn'
                                  onClick={() => setConfirmingCancel(false)}
                                >
                                  Keep the reservation
                                </button>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* CTA row hidden while confirming */}
                  {!confirmingCancel && (
                    <div className='myres-actions'>
                      <button
                        type='button'
                        className='btn btn-primary myres-cancel-btn'
                        disabled={selectedIds.length === 0 || cancelSubmitting}
                        onClick={() => setConfirmingCancel(true)}
                      >
                        Cancel Selected
                      </button>

                      {selectedIds.length > 0 && (
                        <button
                          type='button'
                          className='btn btn-primary myres-clear-btn'
                          onClick={clearSelection}
                          disabled={cancelSubmitting}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className='reserve-form'>
          <div className='form-row'>
            <div>
              <label>Date</label>
              <input
                type='date'
                required
                min={todayISO}
                value={reservationData.date}
                onChange={(e) =>
                  setReservationData((d) => ({ ...d, date: e.target.value }))
                }
              />
            </div>

            <div>
              <label>Room</label>
              <select
                required
                value={reservationData.roomId}
                onChange={(e) =>
                  setReservationData((d) => ({ ...d, roomId: e.target.value }))
                }
              >
                <option value=''>Select</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='form-row'>
            <div>
              <label>Start Time</label>
              <div className='time-picker'>
                <select
                  required
                  value={reservationData.startHour}
                  onChange={(e) =>
                    setReservationData((d) => ({
                      ...d,
                      startHour: e.target.value,
                    }))
                  }
                >
                  <option value=''>Hour</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1}>{i + 1}</option>
                  ))}
                </select>

                <select
                  required
                  value={reservationData.startMin}
                  onChange={(e) =>
                    setReservationData((d) => ({
                      ...d,
                      startMin: e.target.value,
                    }))
                  }
                >
                  <option value=''>Min</option>
                  {['00', '15', '30', '45'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>

                <span
                  className={`ampm-badge ${
                    reservationData.startPeriod === 'PM'
                      ? 'pm-active'
                      : 'am-active'
                  }`}
                  onClick={() =>
                    setReservationData((d) => ({
                      ...d,
                      startPeriod: d.startPeriod === 'AM' ? 'PM' : 'AM',
                    }))
                  }
                >
                  {reservationData.startPeriod || 'AM'}
                </span>
              </div>
            </div>

            <div>
              <label>End Time</label>
              <div className='time-picker'>
                <select
                  required
                  value={reservationData.endHour}
                  onChange={(e) =>
                    setReservationData((d) => ({
                      ...d,
                      endHour: e.target.value,
                    }))
                  }
                >
                  <option value=''>Hour</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1}>{i + 1}</option>
                  ))}
                </select>

                <select
                  required
                  value={reservationData.endMin}
                  onChange={(e) =>
                    setReservationData((d) => ({
                      ...d,
                      endMin: e.target.value,
                    }))
                  }
                >
                  <option value=''>Min</option>
                  {['00', '15', '30', '45'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>

                <span
                  className={`ampm-badge ${
                    reservationData.endPeriod === 'PM'
                      ? 'pm-active'
                      : 'am-active'
                  }`}
                  onClick={() =>
                    setReservationData((d) => ({
                      ...d,
                      endPeriod: d.endPeriod === 'AM' ? 'PM' : 'AM',
                    }))
                  }
                >
                  {reservationData.endPeriod || 'AM'}
                </span>
              </div>
            </div>
          </div>

          {/* Single main CTA only */}
          <button
            type='submit'
            className='btn btn-primary w-full mt-2'
            disabled={submitting || loadingRooms}
          >
            {submitting ? 'Reserving...' : 'Confirm Reservation'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReserveConferenceRoom;
