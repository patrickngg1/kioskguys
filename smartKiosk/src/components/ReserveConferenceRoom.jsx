// src/components/ReserveConferenceRoom.jsx
import '../styles/Dashboard.css';
import '../styles/reserveModal.css';
import '../styles/PremiumInput.css';
import PremiumInput from './PremiumInput';
import React, { useEffect, useMemo, useState } from 'react';

// --- HELPER FUNCTIONS ---
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

const combineDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  if ([year, month, day, hour, minute].some(Number.isNaN)) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

const to12HourDisplay = (timeStr) => {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${suffix}`;
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// --- AVAILABILITY GRID COMPONENT ---
function RoomDayAvailability({ rooms, reservations, selectedRoomId, date }) {
  if (!date || !rooms || rooms.length === 0) return null;

  const DAY_START_HOUR = 0;
  const DAY_END_HOUR = 24;
  const SLOT_MINUTES = 30;
  const slots = [];

  for (let hour = DAY_START_HOUR; hour < DAY_END_HOUR; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const label24 = `${String(hour).padStart(2, '0')}:${String(
        minute
      ).padStart(2, '0')}`;
      const suffix = hour >= 12 ? 'PM' : 'AM';
      const hour12 = ((hour + 11) % 12) + 1;
      const displayHour = `${hour12}${
        minute === 0 ? '' : `:${String(minute).padStart(2, '0')}`
      } ${suffix}`;
      slots.push({ key: label24, label24, displayHour, hour, minute });
    }
  }

  const totalSlots = slots.length;
  const dayStartMinutes = DAY_START_HOUR * 60;
  const dayEndMinutes = DAY_END_HOUR * 60;
  const slotsByRoom = {};
  rooms.forEach((r) => {
    slotsByRoom[r.id] = new Array(totalSlots).fill(null);
  });

  (reservations || []).forEach((res) => {
    const roomSlots = slotsByRoom[res.roomId];
    if (!roomSlots) return;

    let startMin = timeToMinutes(res.startTime);
    let endMin = timeToMinutes(res.endTime);
    if (startMin == null || endMin == null) return;

    const gridDateObj = new Date(`${date}T00:00:00`);
    const resDateObj = new Date(`${res.date}T00:00:00`);
    const diffDays = Math.round((gridDateObj - resDateObj) / 86400000);
    const isOvernight = endMin <= startMin;

    if (diffDays === 0) {
      if (isOvernight) endMin += 1440;
    } else if (diffDays === 1 && isOvernight) {
      startMin = 0;
    } else {
      return;
    }

    const clampedStart = Math.max(startMin, dayStartMinutes);
    const clampedEnd = Math.min(endMin, dayEndMinutes);
    if (clampedEnd <= clampedStart) return;

    const firstSlot = Math.floor(
      (clampedStart - dayStartMinutes) / SLOT_MINUTES
    );
    const lastSlot = Math.ceil((clampedEnd - dayStartMinutes) / SLOT_MINUTES);
    const label = `${to12HourDisplay(res.startTime)} – ${to12HourDisplay(
      res.endTime
    )} Reserved`;

    for (let i = firstSlot; i < lastSlot; i++) {
      if (i < 0 || i >= totalSlots) continue;
      roomSlots[i] = label;
    }
  });

  const prettyDate = (() => {
    try {
      const d = new Date(`${date}T00:00:00`);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  })();

  const anyReservations = (reservations || []).length > 0;

  return (
    <div className='day-availability-shell'>
      <div className='day-availability-header'>
        <div className='day-availability-title'>
          <span className='day-availability-pill-dot' />
          <span>Room availability for {prettyDate}</span>
        </div>
        <div className='day-availability-legend'>
          <span className='legend-item'>
            <span className='legend-dot free' /> Free
          </span>
          <span className='legend-item'>
            <span className='legend-dot partial' /> Partially booked
          </span>
          <span className='legend-item'>
            <span className='legend-dot full' /> Booked
          </span>
        </div>
      </div>

      {!anyReservations && (
        <p className='day-grid-empty'>
          All rooms are currently available for this day. 🟢
        </p>
      )}

      <div className='day-availability-grid'>
        <div className='hour-label-row'>
          {Array.from({ length: 24 }).map((_, hour) => {
            const hour12 = ((hour + 11) % 12) + 1;
            return (
              <span key={hour} className='hour-label'>
                {hour12}
              </span>
            );
          })}
        </div>
        <div className='ampm-section-row'>
          <span className='ampm-section am'>AM</span>
          <span className='ampm-section pm'>PM</span>
        </div>
        {rooms.map((room) => {
          const roomSlots = slotsByRoom[room.id] || [];
          const busyCount = roomSlots.filter(Boolean).length;
          const totalRoomSlots = roomSlots.length;
          let statusLabel = 'Partially booked';
          let statusClass = 'partial';
          if (busyCount === 0) {
            statusLabel = 'Free all day';
            statusClass = 'free';
          } else if (busyCount === totalRoomSlots) {
            statusLabel = 'Fully booked';
            statusClass = 'full';
          }
          const isSelected =
            selectedRoomId && String(selectedRoomId) === String(room.id);

          return (
            <div
              key={room.id}
              className={`day-grid-row ${isSelected ? 'selected' : ''}`}
            >
              <div className='day-grid-roomMeta'>
                <div className='day-grid-roomName'>{room.name}</div>
                <div className={`day-grid-status ${statusClass}`}>
                  <span className='status-dot' />
                  <span>{statusLabel}</span>
                </div>
              </div>
              <div
                className={`day-grid-track ${isSelected ? 'selected' : ''}`}
                style={{ '--day-grid-slot-count': slots.length }}
              >
                {(() => {
                  const cells = [];
                  let i = 0;
                  while (i < slots.length) {
                    const label = roomSlots[i];
                    if (!label) {
                      cells.push(
                        <div
                          key={`${room.id}-${slots[i].key}`}
                          className='day-grid-cell capsule free'
                          data-time={slots[i].displayHour}
                          title={`${room.name}\nAvailable`}
                        />
                      );
                      i++;
                      continue;
                    }
                    let j = i + 1;
                    while (j < slots.length && roomSlots[j] === label) j++;
                    const span = j - i;
                    cells.push(
                      <div
                        key={`${room.id}-${slots[i].key}-group`}
                        className='day-grid-cell capsule booked grouped'
                        style={{ gridColumn: `span ${span}` }}
                        data-time={label}
                      />
                    );
                    i = j;
                  }
                  return cells;
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
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
  const [showOvernightModal, setShowOvernightModal] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);

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

  const [myPanelOpen, setMyPanelOpen] = useState(false);
  const [loadingMyReservations, setLoadingMyReservations] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [dayReservations, setDayReservations] = useState([]);
  const [loadingDayReservations, setLoadingDayReservations] = useState(false);
  const [dayReservationsError, setDayReservationsError] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [locallyCancelledIds, setLocallyCancelledIds] = useState([]);

  const todayISO = new Date().toISOString().split('T')[0];
  const cardsShouldShow = rooms.length > 0 && rooms.length <= 2;
  const [cardsRender, setCardsRender] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    if (cardsShouldShow) {
      setCardsRender(true);
      requestAnimationFrame(() => setCardsVisible(true));
    } else {
      setCardsVisible(false);
      const t = setTimeout(() => setCardsRender(false), 280);
      return () => clearTimeout(t);
    }
  }, [cardsShouldShow]);

  useEffect(() => {
    if (!isOpen) return;
    const loadRooms = async () => {
      setLoadingRooms(true);
      try {
        const res = await fetch('/api/rooms/', { credentials: 'include' });
        const data = await res.json();
        setRooms(data.rooms || []);
      } catch {
        setRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };
    const loadMy = async () => {
      if (!user) {
        setMyReservations([]);
        return;
      }
      setLoadingMyReservations(true);
      try {
        const res = await fetch('/api/rooms/reservations/my/', {
          credentials: 'include',
        });
        const data = await res.json();
        setMyReservations(data.reservations || []);
      } catch {
        setMyReservations([]);
      } finally {
        setLoadingMyReservations(false);
      }
    };
    loadRooms();
    loadMy();
    setSelectedIds([]);
    setConfirmingCancel(false);
    setLocallyCancelledIds([]);
    setMyPanelOpen(false);
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen || !reservationData.date || !user) {
      setDayReservations([]);
      setDayReservationsError(null);
      setLoadingDayReservations(false);
      return;
    }
    const controller = new AbortController();
    const loadForDay = async () => {
      setLoadingDayReservations(true);
      setDayReservationsError(null);
      try {
        const res = await fetch(
          `/api/rooms/reservations/by-date/?date=${reservationData.date}`,
          { credentials: 'include', signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setDayReservations([]);
          setDayReservationsError(data.error || 'Could not load availability.');
        } else {
          setDayReservations(data.reservations || []);
        }
      } catch (err) {
        if (err.name !== 'AbortError') setDayReservations([]);
      } finally {
        setLoadingDayReservations(false);
      }
    };
    loadForDay();
    return () => controller.abort();
  }, [isOpen, reservationData.date, user]);

  const sortedMyReservations = useMemo(() => {
    const arr = [...(myReservations || [])];
    arr.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
    return arr;
  }, [myReservations]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        if (id === selectedIds[0]) setConfirmingCancel(false);
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
    e.preventDefault();
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

    const startDT = combineDateTime(date, start24);
    let endDT = combineDateTime(date, end24);
    if (!startDT || !endDT) {
      setToast('Invalid date/time.');
      setToastShake(true);
      return;
    }

    const isOvernight = endDT <= startDT;
    if (isOvernight) {
      setPendingRequest({ roomId, date, startTime: start24, endTime: end24 });
      setShowOvernightModal(true);
      return;
    }

    const now = new Date();
    if (date === todayISO && endDT <= now) {
      setToast('Please choose a time later today.');
      setToastShake(true);
      return;
    }
    if (endDT <= startDT) endDT = new Date(endDT.getTime() + 86400000);

    const combined = [
      ...(existingReservations || []),
      ...(myReservations || []),
    ];
    const conflict = combined.some((r) => {
      if (
        r.cancelled ||
        locallyCancelledIds.includes(r.id) ||
        String(r.roomId) !== String(roomId)
      )
        return false;
      const rStart = new Date(`${r.date}T${r.startTime}`);
      let rEnd = new Date(`${r.date}T${r.endTime}`);
      if (rEnd <= rStart) rEnd.setDate(rEnd.getDate() + 1);
      return startDT < rEnd && endDT > rStart;
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
      const res = await fetch('/api/rooms/reserve/', {
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
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setToast(data.error || 'Reservation failed.');
        setToastShake(true);
        return;
      }

      const r = data.reservation;
      onReservationCreated(r);
      setMyReservations((prev) => [...prev, r]);
      setToast(
        `Room Reserved:\n${r.roomName}\n${to12HourDisplay(
          r.startTime
        )} → ${to12HourDisplay(r.endTime)}`
      );
      setToastShake(false);
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
    } catch {
      setToast('Network error.');
      setToastShake(true);
    } finally {
      setSubmitting(false);
    }
  };

  const finalizeReservation = async (req) => {
    const { roomId, date, startTime, endTime } = req;
    setSubmitting(true);
    setToast('Submitting...');
    try {
      const res = await fetch('/api/rooms/reserve/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, date, startTime, endTime }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setToast(data.error || 'Reservation failed.');
        setToastShake(true);
        return;
      }
      const r = data.reservation;
      setToast(
        `Room Reserved:\n${r.roomName}\n${to12HourDisplay(
          r.startTime
        )} → ${to12HourDisplay(r.endTime)}`
      );
      setToastShake(false);
      onReservationCreated(r);
      onClose();
    } catch {
      setToast('Network error.');
      setToastShake(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancelSelected = async () => {
    if (selectedIds.length === 0) return;
    setCancelSubmitting(true);
    setToast('Cancelling...');
    try {
      if (selectedIds.length === 1) {
        const id = selectedIds[0];
        const res = await fetch(`/api/rooms/reservations/${id}/cancel/`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok) {
          setMyReservations((prev) => prev.filter((r) => r.id !== id));
          setToast('Reservation cancelled.');
        } else {
          setToast(data.error);
          setToastShake(true);
        }
      } else {
        const res = await fetch('/api/rooms/reservations/cancel-bulk/', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, reason: 'User cancelled.' }),
        });
        const data = await res.json();
        if (data.ok) {
          setMyReservations((prev) =>
            prev.filter((r) => !selectedIds.includes(r.id))
          );
          setToast(`Cancelled ${selectedIds.length}.`);
        } else {
          setToast(data.error);
          setToastShake(true);
        }
      }
    } catch {
      setToast('Network error.');
      setToastShake(true);
    } finally {
      clearSelection();
      setCancelSubmitting(false);
    }
  };

  return (
    <div className='modal-overlay'>
      <div
        className='modal-box reserve-box fixed-layout'
        onClick={(e) => e.stopPropagation()}
        style={{ width: '850px', maxWidth: '95vw' }}
      >
        {/* --- FIXED HEADER --- */}
        <div className='modal-header-fixed'>
          <button
            className='close-btn'
            type='button'
            onClick={() => !submitting && onClose()}
          >
            ✕
          </button>
          <h2>Reserve Conference Room</h2>
        </div>

        {/* --- SCROLLABLE BODY --- */}
        <div
          className='modal-scroll-content'
          onScroll={(e) => {
            const el = e.currentTarget;
            const stickyBar = el.querySelector('.submit-request-sticky');
            if (stickyBar) {
              const atBottom =
                el.scrollHeight - el.scrollTop <= el.clientHeight + 5;
              if (!atBottom && el.scrollTop > 0)
                stickyBar.classList.add('scrolling');
              else stickyBar.classList.remove('scrolling');
            }
          }}
        >
          {cardsRender && (
            <div
              className={`rooms-row rooms-row-premium ${
                cardsVisible ? 'cards-in' : 'cards-out'
              }`}
              style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}
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
                    Capacity: {room.capacity}
                    {room.features && <> · {room.features.join(' · ')}</>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className='myres-toggle-row' style={{ marginBottom: '0.5rem' }}>
            <div className='myres-toggle-label'>
              My Reservations
              <span className='myres-toggle-sub'>Upcoming only</span>
            </div>
            <button
              type='button'
              className={`vision-toggle ${myPanelOpen ? 'on' : 'off'}`}
              role='switch'
              onClick={() => setMyPanelOpen((o) => !o)}
            >
              <span className='vision-toggle-knob' />
            </button>
          </div>

          <div
            className={`myres-panel ${myPanelOpen ? 'open' : 'closed'}`}
            style={{ marginBottom: '1.5rem' }}
          >
            {myPanelOpen &&
              (loadingMyReservations ? (
                <p className='myres-loading'>Loading...</p>
              ) : sortedMyReservations.length === 0 ? (
                <p className='myres-empty'>No upcoming reservations.</p>
              ) : (
                <div className='myres-list'>
                  {sortedMyReservations.map((res) => {
                    const isSelected = selectedIds.includes(res.id);
                    return (
                      <div
                        key={res.id}
                        className={`myres-card ${isSelected ? 'selected' : ''}`}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(res.id);
                          }}
                        >
                          <span className='vision-toggle-knob' />
                        </button>
                      </div>
                    );
                  })}

                  {!confirmingCancel && selectedIds.length > 0 && (
                    <div
                      className='myres-actions'
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: '0.5rem',
                      }}
                    >
                      <button
                        className='admin-pill-button admin-pill-danger'
                        onClick={() => setConfirmingCancel(true)}
                      >
                        Cancel Selected
                      </button>
                    </div>
                  )}

                  {confirmingCancel && (
                    <div
                      className='cancel-confirm-actions'
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      <button
                        className='admin-pill-button admin-pill-subtle'
                        onClick={() => setConfirmingCancel(false)}
                      >
                        Go Back
                      </button>
                      <button
                        className='admin-pill-button admin-pill-danger'
                        onClick={handleConfirmCancelSelected}
                      >
                        Confirm Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className='form-row' style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label>Date</label>
                <PremiumInput
                  type='date'
                  required
                  min={todayISO}
                  value={reservationData.date}
                  onChange={(e) =>
                    setReservationData((d) => ({ ...d, date: e.target.value }))
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Room</label>
                <PremiumInput
                  as='select'
                  required
                  value={reservationData.roomId}
                  onChange={(e) =>
                    setReservationData((d) => ({
                      ...d,
                      roomId: e.target.value,
                    }))
                  }
                >
                  <option value=''>Select Room...</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.capacity} seats ·{' '}
                      {r.features?.join(', ') || 'Standard'})
                    </option>
                  ))}
                </PremiumInput>
              </div>
            </div>

            {!reservationData.date && (
              <div className='availability-hint-pill'>
                <span className='availability-hint-glow' />
                <span>💬 Select a date to view room availability</span>
              </div>
            )}
            {reservationData.date && (
              <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                {loadingDayReservations ? (
                  <p className='day-grid-loading'>Loading...</p>
                ) : (
                  <RoomDayAvailability
                    rooms={rooms}
                    reservations={dayReservations}
                    selectedRoomId={reservationData.roomId}
                    date={reservationData.date}
                  />
                )}
              </div>
            )}

            <div
              className='form-row'
              style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}
            >
              {/* Start Time */}
              <div style={{ flex: 1 }}>
                <label>Start Time</label>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <PremiumInput
                      as='select'
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
                    </PremiumInput>
                  </div>
                  <div style={{ flex: 1 }}>
                    <PremiumInput
                      as='select'
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
                    </PremiumInput>
                  </div>
                  <div style={{ width: '60px' }}>
                    <PremiumInput
                      as='button'
                      type='button'
                      className={`premium-input-field ${
                        reservationData.startPeriod === 'AM'
                          ? 'am-mode'
                          : 'pm-mode'
                      }`}
                      onClick={() =>
                        setReservationData((d) => ({
                          ...d,
                          startPeriod: d.startPeriod === 'AM' ? 'PM' : 'AM',
                        }))
                      }
                    >
                      {reservationData.startPeriod || 'AM'}
                    </PremiumInput>
                  </div>
                </div>
              </div>

              {/* End Time */}
              <div style={{ flex: 1 }}>
                <label>End Time</label>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <PremiumInput
                      as='select'
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
                    </PremiumInput>
                  </div>
                  <div style={{ flex: 1 }}>
                    <PremiumInput
                      as='select'
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
                    </PremiumInput>
                  </div>
                  <div style={{ width: '60px' }}>
                    <PremiumInput
                      as='button'
                      type='button'
                      className={`premium-input-field ${
                        reservationData.endPeriod === 'AM'
                          ? 'am-mode'
                          : 'pm-mode'
                      }`}
                      onClick={() =>
                        setReservationData((d) => ({
                          ...d,
                          endPeriod: d.endPeriod === 'AM' ? 'PM' : 'AM',
                        }))
                      }
                    >
                      {reservationData.endPeriod || 'AM'}
                    </PremiumInput>
                  </div>
                </div>
              </div>
            </div>

            {/* STICKY FOOTER BUTTON WRAPPER */}
            <div className='submit-request-sticky'>
              <button
                type='submit'
                className='btn btn-primary w-full mt-2'
                disabled={submitting || loadingRooms}
              >
                {submitting ? 'Reserving...' : 'Confirm Reservation'}
              </button>
            </div>
          </form>

          {showOvernightModal && (
            <div className='overnight-modal-backdrop'>
              <div className='overnight-modal'>
                <h2>Confirm Overnight</h2>
                <p>Reservation extends past midnight.</p>
                <div className='overnight-actions'>
                  <button
                    className='btn-cancel'
                    onClick={() => setShowOvernightModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className='btn-confirm'
                    onClick={() => {
                      setShowOvernightModal(false);
                      finalizeReservation(pendingRequest);
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReserveConferenceRoom;
