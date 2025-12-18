// src/components/ReserveConferenceRoom.jsx
import '../styles/Dashboard.css';
import '../styles/reserveModal.css';
import '../styles/PremiumInput.css';
import PremiumInput from './PremiumInput';
import React, { useEffect, useMemo, useState, useRef } from 'react';

// --- 100 BILLION DOLLAR STYLES (Embedded for Instant Power) ---
const PREMIUM_STYLES = `
  @keyframes premium-shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  
  .smart-submit-btn.error {
    background: linear-gradient(135deg, #ef4444, #b91c1c) !important;
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.6) !important;
    animation: premium-shake 0.4s ease-in-out;
    border: 1px solid rgba(255,255,255,0.2) !important;
  }

  .smart-submit-btn.warning {
    background: linear-gradient(135deg, #f59e0b, #d97706) !important; /* Amber */
    box-shadow: 0 0 25px rgba(245, 158, 11, 0.6) !important;
    animation: premium-shake 0.4s ease-in-out;
  }

  /* Refined Text Layers for Smart Button */
  .btn-text-layer {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    opacity: 0;
    transform: translateY(10px) scale(0.95);
    position: absolute;
    inset: 0;
    justify-content: center;
    pointer-events: none;
  }
  
  .btn-text-layer.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    position: relative;
    pointer-events: auto;
  }
`;

// --- HELPER: Smart Button Content (Now supports Error/Warning) ---
const SmartButtonContent = ({
  btnState,
  idleText,
  loadingText,
  successText,
  errorText,
}) => (
  <>
    {/* Layer 1: Idle */}
    <span className={`btn-text-layer ${btnState === 'idle' ? 'visible' : ''}`}>
      {idleText}
    </span>

    {/* Layer 2: Loading */}
    <span
      className={`btn-text-layer ${btnState === 'loading' ? 'visible' : ''}`}
    >
      <span
        className='spinner-loader'
        style={{
          width: '16px',
          height: '16px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      ></span>
      {loadingText}
    </span>

    {/* Layer 3: Success */}
    <span
      className={`btn-text-layer ${btnState === 'success' ? 'visible' : ''}`}
    >
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='3.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M20 6L9 17l-5-5'></path>
      </svg>
      {successText}
    </span>

    {/* Layer 4: Error/Warning (The Fix) */}
    <span
      className={`btn-text-layer ${
        btnState === 'error' || btnState === 'warning' ? 'visible' : ''
      }`}
    >
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <circle cx='12' cy='12' r='10'></circle>
        <line x1='12' y1='8' x2='12' y2='12'></line>
        <line x1='12' y1='16' x2='12.01' y2='16'></line>
      </svg>
      {errorText}
    </span>
  </>
);

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

// --- AVAILABILITY GRID COMPONENT (Unchanged) ---
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
  onReservationCreated, // Note: Removed setToast props as we don't use them anymore
  existingReservations = [],
}) {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // --- SMART BUTTON STATE ---
  const [btnState, setBtnState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error' | 'warning'
  const [errorMsg, setErrorMsg] = useState(''); // Text to show on button
  const errorTimerRef = useRef(null); // Ref to clear timeout prevents flickering

  // --- SMART CANCEL BUTTON ---
  const [cancelBtnState, setCancelBtnState] = useState('idle');
  const [cancelErrorMsg, setCancelErrorMsg] = useState('');
  const cancelTimerRef = useRef(null);

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
  const [locallyCancelledIds, setLocallyCancelledIds] = useState([]);

  const todayISO = new Date().toISOString().split('T')[0];
  const cardsShouldShow = rooms.length > 0 && rooms.length <= 2;
  const [cardsRender, setCardsRender] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  // --- PREMIUM ERROR TRIGGER ---
  // Replaces cheap toasts with button-based feedback
  const triggerError = (msg, isWarning = false) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMsg(msg);
    setBtnState(isWarning ? 'warning' : 'error');
    errorTimerRef.current = setTimeout(() => {
      setBtnState('idle');
      setErrorMsg('');
    }, 2500);
  };

  const triggerCancelError = (msg) => {
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    setCancelErrorMsg(msg);
    setCancelBtnState('error');
    cancelTimerRef.current = setTimeout(() => {
      setCancelBtnState('idle');
      setCancelErrorMsg('');
    }, 2500);
  };

  useEffect(() => {
    if (isOpen) {
      setBtnState('idle');
      setCancelBtnState('idle');
    }
  }, [isOpen]);

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

  // --- 100 BILLION DOLLAR SUBMIT LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Validation -> Trigger Warning Button
    if (!user) return triggerError('Sign In Required', true);

    const { roomId, date, startHour, startMin, endHour, endMin } =
      reservationData;
    if (!roomId || !date || !startHour || !startMin || !endHour || !endMin) {
      return triggerError('Complete All Fields', true);
    }

    const start24 = to24h(startHour, startMin, reservationData.startPeriod);
    const end24 = to24h(endHour, endMin, reservationData.endPeriod);
    if (!start24 || !end24) return triggerError('Invalid Time', true);

    const startDT = combineDateTime(date, start24);
    let endDT = combineDateTime(date, end24);
    if (!startDT || !endDT) return triggerError('Invalid Date', true);

    const isOvernight = endDT <= startDT;
    if (isOvernight) {
      setPendingRequest({ roomId, date, startTime: start24, endTime: end24 });
      setShowOvernightModal(true);
      return;
    }

    const now = new Date();
    if (date === todayISO && endDT <= now)
      return triggerError('Time has passed', true);

    if (endDT <= startDT) endDT = new Date(endDT.getTime() + 86400000);

    // 2. Conflict Check -> Trigger Error Button
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

    if (conflict) return triggerError('Slot Unavailable');

    // 3. API Call -> Loading State
    setBtnState('loading');

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
        // API Error -> Trigger Error Button
        return triggerError(data.error || 'Reservation Failed');
      }

      // 4. Success -> Green Button
      const r = data.reservation;
      if (onReservationCreated) onReservationCreated(r);
      setMyReservations((prev) => [...prev, r]);

      setBtnState('success');

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

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      triggerError('Network Error');
    }
  };

  const finalizeReservation = async (req) => {
    // If called from overnight modal, update main button state
    setBtnState('loading');
    try {
      const res = await fetch('/api/rooms/reserve/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        return triggerError(data.error || 'Reservation Failed');
      }

      const r = data.reservation;
      setBtnState('success');
      if (onReservationCreated) onReservationCreated(r);
      setTimeout(() => onClose(), 1500);
    } catch {
      triggerError('Network Error');
    }
  };

  // --- SMART CANCEL BUTTON LOGIC ---
  const handleConfirmCancelSelected = async () => {
    if (selectedIds.length === 0) return;
    setCancelBtnState('loading');

    try {
      let success = false;
      let error = '';

      if (selectedIds.length === 1) {
        const id = selectedIds[0];
        const res = await fetch(`/api/rooms/reservations/${id}/cancel/`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok) success = true;
        else error = data.error;
      } else {
        const res = await fetch('/api/rooms/reservations/cancel-bulk/', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, reason: 'User cancelled.' }),
        });
        const data = await res.json();
        if (data.ok) success = true;
        else error = data.error;
      }

      if (success) {
        setCancelBtnState('success');
        setTimeout(() => {
          setMyReservations((prev) =>
            prev.filter((r) => !selectedIds.includes(r.id))
          );
          clearSelection();
          setCancelBtnState('idle');
        }, 1500);
      } else {
        triggerCancelError(error || 'Failed');
      }
    } catch {
      triggerCancelError('Network Error');
    }
  };

  return (
    <div className='modal-overlay'>
      {/* Inject animations directly */}
      <style>{PREMIUM_STYLES}</style>

      <div
        className='modal-box reserve-box fixed-layout'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='modal-header-fixed'>
          <button
            className='close-btn'
            type='button'
            onClick={() => {
              if (btnState !== 'loading' && btnState !== 'success') onClose();
            }}
          >
            ✕
          </button>
          <h2>Reserve Conference Room</h2>
          <p className='supply-hint'>
            Reserve a conference room, check the availability, and cancel
            reservations
          </p>
        </div>

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
                    <div className='myres-actions'>
                      <button
                        className='admin-pill-button admin-pill-danger'
                        onClick={() => setConfirmingCancel(true)}
                      >
                        Cancel Selected
                      </button>
                    </div>
                  )}
                  {confirmingCancel && (
                    <div className='cancel-confirm-actions'>
                      <button
                        className='admin-pill-button admin-pill-subtle'
                        onClick={() => setConfirmingCancel(false)}
                        disabled={cancelBtnState !== 'idle'}
                      >
                        Go Back
                      </button>
                      <button
                        className={`admin-pill-button ${
                          cancelBtnState === 'success'
                            ? 'admin-pill-success'
                            : cancelBtnState === 'loading'
                            ? 'admin-pill-loading'
                            : cancelBtnState === 'error'
                            ? 'admin-pill-danger'
                            : 'admin-pill-danger'
                        }`}
                        onClick={handleConfirmCancelSelected}
                        disabled={cancelBtnState !== 'idle'}
                      >
                        <SmartButtonContent
                          btnState={cancelBtnState}
                          idleText='Confirm Cancel'
                          loadingText='Cancelling...'
                          successText='Cancelled'
                          errorText={cancelErrorMsg || 'Failed'}
                        />
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
                      onClick={(e) => {
                        e.preventDefault();
                        setReservationData((d) => ({
                          ...d,
                          startPeriod: d.startPeriod === 'AM' ? 'PM' : 'AM',
                        }));
                      }}
                    >
                      {reservationData.startPeriod || 'AM'}
                    </PremiumInput>
                  </div>
                </div>
              </div>
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
                      onClick={(e) => {
                        e.preventDefault();
                        setReservationData((d) => ({
                          ...d,
                          endPeriod: d.endPeriod === 'AM' ? 'PM' : 'AM',
                        }));
                      }}
                    >
                      {reservationData.endPeriod || 'AM'}
                    </PremiumInput>
                  </div>
                </div>
              </div>
            </div>

            <div className='submit-request-sticky'>
              <button
                type='submit'
                className={`btn btn-primary w-full mt-2 smart-submit-btn ${btnState}`}
                disabled={
                  btnState !== 'idle' &&
                  btnState !== 'error' &&
                  btnState !== 'warning'
                }
              >
                <SmartButtonContent
                  btnState={btnState}
                  idleText='Confirm Reservation'
                  loadingText='Reserving Room...'
                  successText='Reservation Confirmed'
                  errorText={errorMsg || 'Error'}
                />
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
