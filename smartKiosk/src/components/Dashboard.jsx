// src/components/Dashboard.jsx
// --------------------------------------------------------------------
// - Uses TiDB-backed popularity via /api/supplies/popular/?limit=3
// - Uses dynamic categories via /api/items/
// - Shows top-3 "Frequently Requested" per category, then the rest
// - RequestSupply modal is fully dynamic (admin can add categories)
// - Toasts are clean, premium, and not duplicated
// --------------------------------------------------------------------

import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import KioskMap from './KioskMap';
import '../styles/Dashboard.css';
import '../styles/App.css';
import banner1 from '../assets/banner1.png';
import banner2 from '../assets/banner2.png';
import DashboardToast from './DashboardToast';
import RequestSupply from './RequestSupply';
import { getSessionUser, logoutSession } from '../api/authApi';

// Load assets dynamically
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

// --------------- (Kept for possible future mapping if needed) ---------------
const ITEM_CATEGORY_MAP = {
  'Plastic Knives': 'closet',
  'Paper Roll': 'closet',
  'Water Filters': 'closet',
  'Dish Soap': 'closet',
  Kleenex: 'closet',
  'Paper Towels': 'closet',
  'Dry Erase Marker': 'closet',
  Tape: 'closet',
  Stapler: 'closet',

  'Coffee Stirrer': 'break',
  Sugar: 'break',
  Creamer: 'break',
  Snacks: 'break',

  'Cafe Bustelo': 'kcup',
  'Dark Magic': 'kcup',
  'Breakfast Blend': 'kcup',
  'Breakfast Blend Decaf': 'kcup',
  'Green Tea': 'kcup',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Inactivity / countdown
  const [ringProgress, setRingProgress] = useState(0);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef(null);

  const INACTIVITY_LIMIT = 2 * 60 * 1000;
  const WARNING_TIME = 30;
  const inactivityTimer = useRef(null);
  const [showLogoutSplash, setShowLogoutSplash] = useState(false);
  const chimeRef = useRef(null);

  useEffect(() => {
    chimeRef.current = new Audio('/soft-chime.wav');
  }, []);

  function startLogoutSplash() {
    setShowLogoutSplash(true);
    setTimeout(() => navigate('/', { state: { startOverlay: true } }), 3000);
  }

  // ------------------------ Load User ------------------------
  useEffect(() => {
    const navUser = location.state?.user || null;

    async function initUser() {
      if (navUser) {
        setUser(navUser);
        setProfile({ fullName: navUser.fullName, email: navUser.email });
        return;
      }

      const sessionUser = await getSessionUser();

      if (!sessionUser) {
        navigate('/');
        return;
      }

      setUser(sessionUser);
      setProfile({ fullName: sessionUser.fullName, email: sessionUser.email });
    }

    initUser();
  }, [location.state, navigate]);

  // ------------------------ Inactivity Logic ------------------------
  // ------------------------ Inactivity Detection (no countdown here) ------------------------
  useEffect(() => {
    if (!user) return;

    const startWarningCountdown = () => {
      setShowInactivityModal(true);
    };

    const resetInactivityTimer = () => {
      if (showInactivityModal) return;

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

    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer));

    resetInactivityTimer();

    return () => {
      events.forEach((ev) =>
        window.removeEventListener(ev, resetInactivityTimer)
      );
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user]);

  // ------------------------ Countdown Timer Logic ------------------------
  useEffect(() => {
    if (!showInactivityModal) return;

    // Reset countdown & ring
    setCountdown(WARNING_TIME);
    setRingProgress(0);

    // Play chime
    if (chimeRef.current) {
      chimeRef.current.volume = 0.35;
      chimeRef.current.currentTime = 0;
      chimeRef.current.play().catch(() => {});
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        const pct = ((WARNING_TIME - next) / WARNING_TIME) * 360;
        setRingProgress(pct);

        if (prev === 1) {
          clearInterval(countdownRef.current);
          logoutSession().finally(() => startLogoutSplash());
        }

        return next;
      });
    }, 1000);

    return () => {
      clearInterval(countdownRef.current);
    };
  }, [showInactivityModal]);

  const handleLogout = async () => {
    try {
      await logoutSession();
    } finally {
      startLogoutSplash();
    }
  };

  const display = {
    name: profile?.fullName || user?.fullName || user?.email,
    id: user?.id ?? '—',
    role: 'Authenticated User',
    email: user?.email,
    avatar:
      'https://api.dicebear.com/7.x/thumbs/svg?seed=' +
      encodeURIComponent(user?.email || 'uta') +
      '&backgroundType=gradientLinear&shapeColor=1d4ed8,2563eb',
  };

  // ------------------------ Banners ------------------------
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

  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastShake, setToastShake] = useState(false);

  // ------------------------ Reservations ------------------------
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
      setToastShake(true);
      return;
    }

    const toMinutes = (h, m, p) => {
      let hour = parseInt(h, 10) % 12;
      if (p === 'PM') hour += 12;
      return hour * 60 + parseInt(m, 10);
    };

    const startMins = toMinutes(startHour, startMin, startPeriod);
    const endMins = toMinutes(endHour, endMin, endPeriod);
    if (endMins <= startMins) {
      setToast('⚠️ End time must be after start time.');
      setToastShake(true);
      return;
    }

    const start = `${startHour}:${startMin} ${startPeriod}`;
    const end = `${endHour}:${endMin} ${endPeriod}`;

    if (isRoomReserved(reservations, room, date, start, end)) {
      setToast('⚠️ That time is already reserved. Please choose another slot.');
      setToastShake(true);
      return;
    }

    const newReservation = { room, date, start, end, createdAt: nowISO() };
    const updated = [...reservations, newReservation];
    setReservations(updated);
    writeJSON('reservations', updated);

    setShowReserveModal(false);
    setToast(`✅ Room ${room} reserved on ${date} from ${start} to ${end}.`);
    setToastShake(false);
  };

  // ------------------------ Items from backend ------------------------
  // itemsByCategory: { "Storage Closet": [ {id, name, image, ...}, ... ], ... }
  const [itemsByCategory, setItemsByCategory] = useState({});

  useEffect(() => {
    async function loadItems() {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/items/');
        const data = await res.json();
        setItemsByCategory(data.categories ?? {});
      } catch (err) {
        console.error('Failed to load items', err);
        setItemsByCategory({});
      }
    }
    loadItems();
  }, []);

  // ------------------------ Backend Popularity (grouped per category) ------------------------
  // /api/supplies/popular/?limit=3 returns:
  // { ok: true, popular: { "Storage Closet": [ { name, count }, ... ], ... } }
  const [popularByCategory, setPopularByCategory] = useState({});

  const loadPopular = async () => {
    try {
      const res = await fetch(
        'http://127.0.0.1:8000/api/supplies/popular/?limit=3'
      );
      const data = await res.json();
      const popular = data?.popular || {};

      const mapped = {};
      Object.entries(popular).forEach(([categoryName, items]) => {
        mapped[categoryName] = new Set((items || []).map((x) => x.name));
      });

      setPopularByCategory(mapped);
    } catch (err) {
      console.error('Failed to load popular items', err);
      setPopularByCategory({});
    }
  };

  useEffect(() => {
    loadPopular();
  }, []);

  const [selectedSupplies, setSelectedSupplies] = useState([]);

  // Auto-rotate banner only when modals are closed
  useEffect(() => {
    if (showReserveModal || showSuppliesModal) return;
    const id = setInterval(
      () => setBannerIdx((i) => (i + 1) % banners.length),
      7000
    );
    return () => clearInterval(id);
  }, [showReserveModal, showSuppliesModal, banners.length]);

  const toggleSupply = (id) =>
    setSelectedSupplies((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submitSupplies = async () => {
    if (!selectedSupplies.length) {
      setToast('Please select at least one item.');
      setToastShake(true);
      return;
    }

    // Close modal instantly
    setShowSuppliesModal(false);

    // Show loading toast
    setToastShake(false);
    setToast('Submitting your request...');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/supplies/request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: selectedSupplies,
          userId: user?.id,
          fullName: user?.fullName,
          email: user?.email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setToast('Something went wrong. Please try again.');
        setToastShake(true);
        return;
      }

      // 🔥 Refresh popularity instantly (so UI updates!)
      await loadPopular();

      // Build item names from selected ids
      const allItems = Object.values(itemsByCategory).flat();
      const itemNames = selectedSupplies
        .map((id) => allItems.find((x) => x.id === id)?.name || 'Item')
        .join(', ');

      setToast(
        `Your supply request was submitted successfully!\nItems: ${itemNames}`
      );
      setToastShake(false);

      // Reset selected items
      setSelectedSupplies([]);
    } catch (err) {
      console.error('Network error:', err);
      setToast('Network error. Please try again.');
      setToastShake(true);
    }
  };

  // Supply card for each item
  const supplyCard = (item) => {
    if (!item) return null;

    const imgSrc = item.image ? item.image : getSupplyImg(item.name);

    return (
      <div
        key={item.id}
        className={`supply-item ${
          selectedSupplies.includes(item.id) ? 'selected' : ''
        }`}
        onClick={() => toggleSupply(item.id)}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && toggleSupply(item.id)}
        aria-label={`Select ${item.name}`}
      >
        <img src={imgSrc} alt={item.name} />
        <span>{item.name}</span>
      </div>
    );
  };

  // ------------------------ Render Per Category (dynamic) ------------------------
  const renderSection = (title, items) => {
    const popularSet = popularByCategory[title] || new Set();

    const popular = items.filter((item) => popularSet.has(item.name));
    const rest = items.filter((item) => !popularSet.has(item.name));

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

  // ------------------------ Toast Type Logic (single source of truth) ------------------------
  let toastType = 'success';
  if (toastShake) {
    toastType = 'error';
  } else if (!toast) {
    toastType = 'success';
  } else if (toast.toLowerCase().includes('submitting')) {
    toastType = 'loading';
  } else if (
    toast.toLowerCase().includes('successfully') ||
    toast.toLowerCase().includes('submitted')
  ) {
    toastType = 'success';
  } else if (
    toast.toLowerCase().includes('error') ||
    toast.toLowerCase().includes('please select') ||
    toast.startsWith('⚠')
  ) {
    toastType = 'error';
  }

  // ------------------------ RENDER ------------------------
  return (
    <>
      {/* MAIN DASHBOARD */}
      <div
        className={`dashboard-view dashboard-fade-in ${
          showLogoutSplash ? 'dashboard-freeze' : ''
        }`}
      >
        <div className='dashboard-grid'>
          {/* USER CARD */}
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

            <button
              onClick={handleLogout}
              className='btn btn-primary wl-ful'
              style={{ marginTop: '0.75rem' }}
            >
              Sign Out
            </button>
          </div>

          {/* BANNER */}
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

          {/* MAP */}
          <div className='map-container' style={{ gridArea: 'map' }}>
            <KioskMap />
          </div>

          {/* RESERVE CARD */}
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

          {/* SUPPLIES CARD */}
          <div className='card action-card' style={{ gridArea: 'supplies' }}>
            <div className='action-head'>
              <div className='action-title'>Request Supplies</div>
            </div>
            <p className='action-copy'>
              Tap pictures to select items you need.
            </p>
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
      </div>

      {/* RESERVATION MODAL */}
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
              {['A', 'B'].map((l) => {
                const r = `Room ${l}`;
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

              {/* Start Time */}
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
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
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
                      {reservationData.startPeriod}
                    </span>
                  </div>
                </div>

                {/* End Time */}
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
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
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
                      {reservationData.endPeriod}
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

      {/* SUPPLIES MODAL */}
      <RequestSupply
        isOpen={showSuppliesModal}
        onClose={() => setShowSuppliesModal(false)}
        itemsByCategory={itemsByCategory}
        selectedSupplies={selectedSupplies}
        submitSupplies={submitSupplies}
        renderSection={renderSection}
      />

      {/* INACTIVITY OVERLAY */}
      {showInactivityModal && <div className='inactivity-dim'></div>}

      {/* INACTIVITY MODAL */}
      {showInactivityModal && (
        <div className='modal-overlay' style={{ zIndex: 9999 }}>
          <div
            className='modal-box inactivity-modal-enter'
            style={{ maxWidth: 420, textAlign: 'center' }}
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

            {/* countdown ring */}
            <div
              className={`countdown-ring ${
                countdown <= 5
                  ? 'ring-glow-strong'
                  : countdown <= 10
                  ? 'ring-glow'
                  : ''
              }`}
              style={{
                background: `conic-gradient(var(--uta-orange) ${ringProgress}deg, var(--uta-blue) ${ringProgress}deg)`,
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

            <button
              className='btn btn-primary w-full'
              style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}
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
      )}

      {/* LOGOUT SPLASH */}
      {showLogoutSplash && (
        <div className='astral-logout-overlay'>
          <div className='astral-portal-card'>
            <div className='portal-orb'>
              <div className='portal-orb-ring outer'></div>
              <div className='portal-orb-ring mid'></div>
              <div className='portal-orb-ring inner'></div>
              <div className='portal-orb-core'>
                <span className='uta-badge'>UTA</span>
              </div>
            </div>

            <div className='logout-message-astral'>
              <span className='logout-message-main'>Signing Out</span>
              <span className='logout-message-sub'>See you next time ✨</span>
            </div>

            <div className='portal-particles'>
              {[...Array(12)].map((_, i) => (
                <span key={i} className={`portal-particle p-${i + 1}`}></span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM TOAST */}
      <DashboardToast
        type={toastType}
        message={toast}
        onClose={() => {
          setToast(null);
          setToastShake(false);
        }}
        visible={!!toast}
      />
    </>
  );
}
