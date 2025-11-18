// src/components/Dashboard.jsx
// --------------------------------------------------------------------
// - Django session auth (no Firebase)
// - Reads user either from navigation state or /api/auth/me/
// - User card (top-left) shows logged-in user's info
// - 3-minute inactivity auto-logout with a 30s warning modal
// - Premium inactivity modal: dim background, circular countdown ring,
//   UTA blue/orange gradient, soft chime, fade/zoom animation
// - Post-logout splash screen before redirecting to login
// - Reserve modal with AM/PM toggles + conflict check (localStorage-only)
// - Supplies modal with category-specific "Frequently Requested"
// - Clears selection on modal open; live count + glow on submit
// - Persists request history in localStorage; recomputes popularity on submit

import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import KioskMap from './KioskMap';
import '../styles/Dashboard.css';
import '../styles/App.css';
import banner1 from '../assets/banner1.png';
import banner2 from '../assets/banner2.png';
import DashboardToast from './DashboardToast'; // still available if you want to use later
import { getSessionUser, logoutSession } from '../api/authApi';

// Load every .png and .jpg in /src/assets as URLs at build time
const assetPng = import.meta.glob('../assets/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const assetJpg = import.meta.glob('../assets/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});

// Helper: get image for an item name, falling back to Kleenex.png
const getSupplyImg = (name) =>
  assetPng[`../assets/${name}.png`] ||
  assetJpg[`../assets/${name}.jpg`] ||
  assetPng['../assets/Kleenex.png'];

const nowISO = () => new Date().toISOString();
const readJSON = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const timesOverlap = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && bStart < aEnd;
const isRoomReserved = (reservations, room, date, start, end) =>
  reservations.some(
    (r) =>
      r.room === room &&
      r.date === date &&
      timesOverlap(start, end, r.start, r.end)
  );

// Toast used for reservation/supplies confirm
function ConfirmToast({ message = '', onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 4000);
    return () => clearTimeout(id);
  }, [onDone]);

  const formatted =
    typeof message === 'string'
      ? message
          .replace(/(Total)/g, '<strong>$1</strong>')
          .replace(/(\$[0-9,]+)/g, '<span class="highlight-time">$1</span>')
      : '';

  return (
    <div className='confirm-toast'>
      <div className='confirm-card'>
        <div className='confirm-emoji'>💎</div>
        <span className='confirm-icon'>✅</span>
        <div
          className='confirm-text'
          dangerouslySetInnerHTML={{ __html: formatted }}
        ></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null); // Django user: { id, email, fullName, ... }
  const [profile, setProfile] = useState(null); // future extension (roles, etc.)

  const [ringProgress, setRingProgress] = useState(0);

  // ---------------- Inactivity / Countdown State ----------------
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [countdown, setCountdown] = useState(30); // 30-second warning window
  const countdownRef = useRef(null);

  const INACTIVITY_LIMIT = 1 * 60 * 1000; // 3 minutes (change to 10 * 1000 for testing)
  const WARNING_TIME = 30; // 30 seconds countdown
  const inactivityTimer = useRef(null);

  // ---------------- Logout Splash State ----------------
  const [showLogoutSplash, setShowLogoutSplash] = useState(false);

  // Soft chime for inactivity warning
  const chimeRef = useRef(null);

  useEffect(() => {
    // Initialize audio only in browser
    chimeRef.current = new Audio('/soft-chime.wav');
  }, []);

  // Helper: show splash then go to login (Tap to Begin lives there)
  function startLogoutSplash() {
    setShowLogoutSplash(true);
    setTimeout(() => {
      navigate('/', { state: { startOverlay: true } });
    }, 3000);
  }

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  // ---------- Auth: load user from navigation or Django session ----------
  useEffect(() => {
    const navUser = location.state?.user || null;

    async function initUser() {
      // 1. If user was passed via navigate('/dashboard', { state: { user } })
      if (navUser) {
        setUser(navUser);
        setProfile({
          fullName: navUser.fullName,
          email: navUser.email,
        });
        return;
      }

      // 2. Fallback: fetch via session cookie
      const sessionUser = await getSessionUser();

      if (!sessionUser) {
        // Not authenticated -> back to login screen
        navigate('/');
        return;
      }

      setUser(sessionUser);
      setProfile({
        fullName: sessionUser.fullName,
        email: sessionUser.email,
      });
    }

    initUser();
  }, [location.state, navigate]);

  // ---------- Inactivity Auto-Logout (3 min + 30s warning modal) ----------
  useEffect(() => {
    if (!user) return; // only start after user is loaded

    const startWarningCountdown = () => {
      setShowInactivityModal(true);
      setCountdown(WARNING_TIME);
      setRingProgress(0);

      // Play soft chime when warning appears
      if (chimeRef.current) {
        chimeRef.current.volume = 0.35;
        chimeRef.current.currentTime = 0;
        chimeRef.current.play().catch(() => {
          // ignore autoplay errors
        });
      }

      // Countdown timer (1 second per tick)
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          const next = prev - 1;

          // update progress ring
          const pct = ((WARNING_TIME - next) / WARNING_TIME) * 360;
          setRingProgress(pct);

          if (prev === 1) {
            clearInterval(countdownRef.current);
            logoutSession().finally(() => startLogoutSplash());
          }
          return next;
        });
      }, 1000);
    };

    const resetInactivityTimer = () => {
      // If warning modal is open, do NOT close it and do NOT reset countdown.
      if (showInactivityModal) {
        return;
      }

      // Otherwise reset the main inactivity timer normally.
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(
        startWarningCountdown,
        INACTIVITY_LIMIT
      );
    };

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
    ];

    events.forEach((e) => window.addEventListener(e, resetInactivityTimer));

    // Start timer initially
    resetInactivityTimer();

    return () => {
      events.forEach((e) =>
        window.removeEventListener(e, resetInactivityTimer)
      );
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [user]); // important: only depends on user

  const handleLogout = async () => {
    try {
      await logoutSession();
    } finally {
      startLogoutSplash();
    }
  };

  const display = {
    name: profile?.fullName || user?.fullName || user?.email || 'Kiosk User',
    id: user?.id ?? '—',
    role: 'Authenticated User', // you can change to user.role later
    email: user?.email || '—',
    avatar:
      'https://api.dicebear.com/7.x/thumbs/svg?seed=' +
      encodeURIComponent(user?.email || 'uta') +
      '&backgroundType=gradientLinear&shapeColor=1d4ed8,2563eb',
  };

  // ---------- Banners ----------
  const [bannerIdx, setBannerIdx] = useState(0);
  const banners = [
    {
      image: banner1,
      alt: 'UTA Campus Entrance',
      cta: { href: '#reserve', label: 'Reserve a Room' },
    },
    {
      image: banner2,
      alt: 'Need markers or adapters?',
      cta: { href: '#supplies', label: 'Request Supplies' },
    },
  ];

  // ---------- Modals + Toast ----------
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [toast, setToast] = useState(null);

  // ---------- Reservations ----------
  const [reservations, setReservations] = useState(() =>
    readJSON('reservations', [])
  );
  const [reservationData, setReservationData] = useState({
    room: '',
    date: '',
    startHour: '',
    startMin: '',
    startPeriod: 'AM',
    endHour: '',
    endMin: '',
    endPeriod: 'AM',
  });

  const submitReservation = (e) => {
    e.preventDefault();

    const {
      room,
      date,
      startHour,
      startMin,
      startPeriod,
      endHour,
      endMin,
      endPeriod,
    } = reservationData;

    if (!room || !date || !startHour || !startMin || !endHour || !endMin) {
      console.error('Reservation form is incomplete');
      return;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setToast('⚠️ You cannot reserve rooms for past dates.');
      return;
    }

    const toMinutes = (h, m, period) => {
      let hour = parseInt(h, 10) % 12;
      if (period === 'PM') hour += 12;
      return hour * 60 + parseInt(m, 10);
    };

    const startMins = toMinutes(startHour, startMin, startPeriod);
    const endMins = toMinutes(endHour, endMin, endPeriod);

    if (endMins <= startMins) {
      setToast('⚠️ End time must be after start time.');
      return;
    }

    const start = `${startHour}:${startMin} ${startPeriod}`;
    const end = `${endHour}:${endMin} ${endPeriod}`;

    if (isRoomReserved(reservations, room, date, start, end)) {
      setToast('⚠️ That time is already reserved. Please choose another slot.');
      return;
    }

    const newReservation = {
      room,
      date,
      start,
      end,
      createdAt: nowISO(),
    };

    const updated = [...reservations, newReservation];
    setReservations(updated);
    writeJSON('reservations', updated);

    setShowReserveModal(false);
    setToast(`✅ Room ${room} reserved on ${date} from ${start} to ${end}.`);
  };

  // ---------- Supplies ----------
  const STORAGE_CLOSET = [
    'Kleenex',
    'AA Batteries',
    'Ultra Fine Point Permanent Marker',
    'Regular Permanent Marker',
    'Finepoint Permanent Marker',
    'Black Ballpoint Pen',
    'Blue Ballpoint Pen',
    'Standard Paper Clips',
    'Jumbo Paper Clips',
    'Staplers',
    'Blue Dry Erase Markers',
    'Red Dry Erase Markers',
    'Black Dry Erase Markers',
    'Whiteboard Spray',
    'Scissors',
    'Yellow Highlighters',
    'Orange Highlighters',
    'Pink Highlighters',
    'Microfiber Cloth',
    'Micro Binder Clips',
    'Medium Binder Clips',
    'Large Binder Clips',
    'Rubber Bands',
    'Pencils',
    'Mechanical Pencil Lead',
    'Spray Bottles',
    'All Purpose Cleaner',
    'Dry Eraser',
    'Copy Paper',
    'Dolly',
  ];

  const BREAK_ROOM = [
    'Coffee Cups',
    'Coffee Lids',
    'Stir Sticks',
    'Sugar Packets',
    'Sugar Container',
    'Coffee Creamer',
    'Napkins',
    'Plates',
    'Trash Bags',
    'Small Trash Bags',
    'Plastic Spoons',
    'Plastic Forks',
    'Plastic Knives',
    'Paper Roll',
    'Water Filters',
    'Dish Soap',
  ];

  const K_CUPS = [
    'Cafe Bustelo',
    'Dark Magic',
    'Breakfast Blend',
    'Breakfast Blend Decaf',
    'Green Tea',
  ];

  const categorizeItem = (item) => {
    if (STORAGE_CLOSET.includes(item)) return 'closet';
    if (BREAK_ROOM.includes(item)) return 'break';
    if (K_CUPS.includes(item)) return 'kcup';
    return 'other';
  };

  const computePopularByCategory = (history) => {
    const freq = { closet: {}, break: {}, kcup: {} };
    history.forEach((req) => {
      req.items.forEach((item) => {
        const cat = categorizeItem(item);
        if (!freq[cat]) return;
        freq[cat][item] = (freq[cat][item] || 0) + 1;
      });
    });

    const toTop6Set = (obj) =>
      new Set(
        Object.entries(obj)
          .sort((a, b) => b[1] - a[1])
          .map(([i]) => i)
          .slice(0, 6)
      );

    return {
      closet: toTop6Set(freq.closet),
      break: toTop6Set(freq.break),
      kcup: toTop6Set(freq.kcup),
    };
  };

  const [popularByCategory, setPopularByCategory] = useState(() => {
    const history = readJSON('supplyRequests', []);
    return computePopularByCategory(history);
  });

  const [selectedSupplies, setSelectedSupplies] = useState([]);

  useEffect(() => {
    if (showReserveModal || showSuppliesModal) return; // pause while modal open
    const id = setInterval(
      () => setBannerIdx((i) => (i + 1) % banners.length),
      7000
    );
    return () => clearInterval(id);
  }, [showReserveModal, showSuppliesModal]);

  const toggleSupply = (name) => {
    setSelectedSupplies((prev) => {
      const has = prev.includes(name);
      const next = has ? prev.filter((x) => x !== name) : [...prev, name];
      return next;
    });
  };

  const submitSupplies = () => {
    if (selectedSupplies.length === 0) {
      setToast('Please select at least one item.');
      return;
    }
    const history = readJSON('supplyRequests', []);
    const updatedHistory = [
      ...history,
      { items: selectedSupplies, createdAt: nowISO() },
    ];
    writeJSON('supplyRequests', updatedHistory);
    setPopularByCategory(computePopularByCategory(updatedHistory));
    setShowSuppliesModal(false);
    setToast(`Supply request sent: ${selectedSupplies.join(', ')}`);
  };

  const supplyCard = (name) => (
    <div
      key={name}
      className={`supply-item ${
        selectedSupplies.includes(name) ? 'selected' : ''
      }`}
      onClick={() => toggleSupply(name)}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' ? toggleSupply(name) : null)}
      aria-label={`Select ${name}`}
    >
      <img src={getSupplyImg(name)} alt={name} />
      <span>{name}</span>
    </div>
  );

  const renderSection = (title, items, categoryKey) => {
    const popularSet =
      categoryKey === 'closet'
        ? popularByCategory.closet
        : categoryKey === 'break'
        ? popularByCategory.break
        : popularByCategory.kcup;

    const popular = items.filter((i) => popularSet.has(i));
    const rest = items.filter((i) => !popularSet.has(i));

    return (
      <section className='supply-section' key={title}>
        <h3 className='supply-title'>{title}</h3>

        {popular.length > 0 && (
          <>
            <div className='supply-subtitle'>Frequently Requested</div>
            <div className='supply-grid'>{popular.map(supplyCard)}</div>
          </>
        )}

        <div className='supply-grid'>{rest.map(supplyCard)}</div>
      </section>
    );
  };

  return (
    <div
      className={`dashboard-view dashboard-fade-in ${
        showLogoutSplash ? 'dashboard-freeze' : ''
      }`}
    >
      <div className='dashboard-grid'>
        {/* User Card (top-left) */}
        <div
          className='card user-card action-card'
          style={{ gridArea: 'user' }}
        >
          <div className='user-row'>
            <img className='user-avatar' src={display.avatar} alt='' />
            <div>
              <div className='user-name'>{display.name}</div>
              <div className='user-id'>User ID: {display.id}</div>
            </div>
          </div>
          <div className='user-meta'>{display.role}</div>

          <div className='user-email'>{display.email}</div>

          <div style={{ marginTop: '0.75rem' }}>
            <button onClick={handleLogout} className='btn btn-primary wl-ful'>
              Sign Out
            </button>
          </div>
        </div>

        {/* Banner */}
        <div className='banner-block'>
          {banners.map((b, i) => (
            <img
              key={i}
              src={b.image}
              alt={b.alt}
              className={`banner-img ${i === bannerIdx ? 'active' : ''}`}
            />
          ))}

          <button
            className='banner-cta btn btn-primary'
            onClick={() => {
              const href = banners[bannerIdx].cta.href;
              if (href === '#reserve') setShowReserveModal(true);
              if (href === '#supplies') {
                setSelectedSupplies([]);
                setShowSuppliesModal(true);
              }
            }}
          >
            {banners[bannerIdx].cta.label}
          </button>
        </div>

        {/* Map */}
        <div className='map-container' style={{ gridArea: 'map' }}>
          <KioskMap />
        </div>

        {/* Reserve Action Card */}
        <div className='card action-card' style={{ gridArea: 'reserve' }}>
          <div className='action-head'>
            <div className='action-title'>Reserve Conference Room</div>
          </div>
          <p className='action-copy'>Book a meeting space by date & time.</p>
          <button
            onClick={() => {
              setReservationData({
                room: '',
                date: '',
                startHour: '',
                startMin: '',
                startPeriod: 'AM',
                endHour: '',
                endMin: '',
                endPeriod: 'AM',
              });
              setShowReserveModal(true);
            }}
            className='btn btn-primary wl-ful'
          >
            Open Scheduler
          </button>
        </div>

        {/* Supplies Action Card */}
        <div className='card action-card' style={{ gridArea: 'supplies' }}>
          <div className='action-head'>
            <div className='action-title'>Request Supplies</div>
          </div>
          <p className='action-copy'>Tap pictures to select items you need.</p>
          <button
            onClick={() => {
              setSelectedSupplies([]);
              setShowSuppliesModal(true);
            }}
            className='btn btn-primary w-full'
          >
            Open Request Form
          </button>
        </div>
      </div>

      {/* Reserve Room Modal */}
      {showReserveModal && (
        <div
          className='modal-overlay'
          onClick={() => setShowReserveModal(false)}
        >
          <div
            className='modal-box reserve-box'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className='close-btn'
              onClick={() => setShowReserveModal(false)}
            >
              ✕
            </button>
            <h2>Reserve Conference Room</h2>

            <div className='rooms-row'>
              {['A', 'B'].map((letter) => {
                const r = `Room ${letter}`;
                return (
                  <div
                    key={r}
                    className={`room-card ${
                      reservationData.room === r ? 'selected' : ''
                    }`}
                    onClick={() =>
                      setReservationData((d) => ({ ...d, room: r }))
                    }
                  >
                    <div className='room-name'>{r}</div>
                    <div className='room-meta'>Capacity: 8 · Screen · HDMI</div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={submitReservation} className='reserve-form'>
              <div className='form-row'>
                <div>
                  <label>Date</label>
                  <input
                    type='date'
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={reservationData.date}
                    onChange={(e) =>
                      setReservationData((d) => ({
                        ...d,
                        date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label>Room</label>
                  <select
                    required
                    value={reservationData.room}
                    onChange={(e) =>
                      setReservationData((d) => ({
                        ...d,
                        room: e.target.value,
                      }))
                    }
                  >
                    <option value=''>Select Room</option>
                    <option value='Room A'>Room A</option>
                    <option value='Room B'>Room B</option>
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
                      {[...Array(12)].map((_, i) => {
                        const h = i + 1;
                        return (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        );
                      })}
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
                      {[...Array(12)].map((_, i) => {
                        const h = i + 1;
                        return (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        );
                      })}
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

              <button type='submit' className='btn btn-primary w-full mt-2'>
                Confirm Reservation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Supplies Modal */}
      {showSuppliesModal && (
        <div
          className='modal-overlay'
          onClick={() => setShowSuppliesModal(false)}
        >
          <div
            className='modal-box large'
            onClick={(e) => e.stopPropagation()}
            onScroll={(e) => {
              const el = e.currentTarget;
              const stickyBar = el.querySelector('.submit-request-sticky');
              if (!stickyBar) return;

              const atTop = el.scrollTop === 0;
              const atBottom =
                el.scrollHeight - el.scrollTop <= el.clientHeight + 1;

              if (!atTop && !atBottom) {
                stickyBar.classList.add('scrolling');
              } else {
                stickyBar.classList.remove('scrolling');
              }
            }}
          >
            <button
              className='close-btn'
              onClick={() => setShowSuppliesModal(false)}
            >
              ✕
            </button>
            <h2>Request Supplies</h2>
            <p className='supply-hint'>
              Tap on the pictures to select items. Frequently requested items
              appear first.
            </p>

            {renderSection('Storage Closet', STORAGE_CLOSET, 'closet')}
            {renderSection('Break Room', BREAK_ROOM, 'break')}
            {renderSection('K-Cups', K_CUPS, 'kcup')}

            <div className='submit-request-sticky'>
              <button
                onClick={submitSupplies}
                className={`btn btn-primary w-full mt-2 ${
                  selectedSupplies.length > 0 ? 'active-glow' : ''
                }`}
              >
                {selectedSupplies.length > 0
                  ? `Submit Request (${selectedSupplies.length} item${
                      selectedSupplies.length > 1 ? 's' : ''
                    })`
                  : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen dimming for inactivity modal */}
      {showInactivityModal && <div className='inactivity-dim'></div>}

      {/* Inactivity Warning Modal */}
      {showInactivityModal && (
        <div className='modal-overlay' style={{ zIndex: 9999 }}>
          <div
            className='modal-box inactivity-modal-enter'
            style={{ maxWidth: '420px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className='close-btn'
              onClick={() => {
                setShowInactivityModal(false);
                if (countdownRef.current) clearInterval(countdownRef.current);
              }}
            >
              ✕
            </button>

            <h2>Are you still here?</h2>
            <p style={{ marginTop: '0.75rem', fontSize: '1.1rem' }}>
              You will be signed out in
            </p>

            {/* Circular countdown ring */}
            <div
              className={`countdown-ring ${
                countdown <= 5
                  ? 'ring-glow-strong'
                  : countdown <= 10
                  ? 'ring-glow'
                  : ''
              }`}
              style={{
                background: `conic-gradient(
      var(--uta-orange) ${ringProgress}deg,
      var(--uta-blue) ${ringProgress}deg
    )`,
              }}
            >
              <div
                className={`countdown-ring-inner ${
                  countdown <= 5
                    ? 'text-pulse-strong'
                    : countdown <= 10
                    ? 'text-pulse'
                    : ''
                }`}
              >
                {countdown}s
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button
                className='btn btn-primary w-full'
                style={{ marginBottom: '0.75rem' }}
                onClick={() => {
                  setShowInactivityModal(false);
                  if (countdownRef.current) clearInterval(countdownRef.current);
                }}
              >
                Stay Signed In
              </button>

              <button
                className='btn btn-primary w-full'
                style={{ background: '#d72638' }}
                onClick={async () => {
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  await logoutSession();
                  startLogoutSplash();
                }}
              >
                Sign Out Now
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutSplash && (
        <div className='astral-logout-overlay'>
          <div className='astral-portal-card'>
            {/* Floating portal orb */}
            <div className='portal-orb'>
              <div className='portal-orb-ring outer'></div>
              <div className='portal-orb-ring mid'></div>
              <div className='portal-orb-ring inner'></div>

              <div className='portal-orb-core'>
                <span className='uta-badge'>UTA</span>
              </div>
            </div>

            {/* Signing out text */}
            <div className='logout-message-astral'>
              <span className='logout-message-main'>Signing Out</span>
              <span className='logout-message-sub'>See you next time ✨</span>
            </div>

            {/* Particle layer */}
            <div className='portal-particles'>
              {[...Array(12)].map((_, i) => (
                <span key={i} className={`portal-particle p-${i + 1}`}></span>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <ConfirmToast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
