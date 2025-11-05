// Dashboard.jsx (Scrollable Supplies Modal version)
// - Keeps Firebase auth/profile logic
// - Modal: Reserve Conference Room (Room A/B) with availability check
// - Modal: Request Supplies (one long scroll with categories + image cards)
// - localStorage persistence for reservations & supply selections
// - 3s auto-fade confirmation overlay

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskMap from './KioskMap';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config';

const APP_ID = 'kiosk-room-booking-v1';
const DEV_MODE = true;

// ---------- Small helpers ----------
const nowISO = () => new Date().toISOString();
const readJSON = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// Time overlap check (HH:MM 24h)
function timesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
function isRoomReserved(reservations, room, date, start, end) {
  return reservations.some(
    (r) =>
      r.room === room &&
      r.date === date &&
      timesOverlap(start, end, r.start, r.end)
  );
}

// ---------- Banner ----------
function Banner({ item }) {
  if (!item) return null;
  return (
    <div className='card banner-block'>
      <img
        className='banner-img'
        src={item.image}
        alt={item.alt || 'Announcement'}
      />
      {item.cta && (
        <a className='btn btn-primary banner-cta' href={item.cta.href}>
          {item.cta.label}
        </a>
      )}
    </div>
  );
}

// ---------- Confirmation overlay (auto-fades in 3s) ----------
function ConfirmToast({ message, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3000);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div className='confirm-toast'>
      <div className='confirm-card'>
        <div className='confirm-emoji'>✅</div>
        <div className='confirm-text'>{message}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // ---------- Auth ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (DEV_MODE && (!u || !u.email)) {
        setUser({ email: 'dev@uta.edu', uid: 'DEVUSER12345' });
        setProfile({ fullName: 'Developer Mode User' });
        return;
      }
      if (!u || !u.email) {
        navigate('/');
        return;
      }
      setUser(u);
      try {
        const ref = doc(
          db,
          'artifacts',
          APP_ID,
          'users',
          u.uid,
          'user_profiles',
          u.uid
        );
        const snap = await getDoc(ref);
        setProfile(snap.exists() ? snap.data() : null);
      } catch {
        setProfile(null);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      navigate('/');
    }
  };

  const display = {
    name: profile?.fullName || user?.email || 'Kiosk User',
    id: user?.uid?.slice(0, 10) || '—',
    role: DEV_MODE ? 'Developer Mode' : 'Authenticated User',
    email: user?.email || '—',
    avatar:
      'https://api.dicebear.com/7.x/thumbs/svg?seed=uta&backgroundType=gradientLinear&shapeColor=1d4ed8,2563eb',
  };

  // ---------- Banner rotation ----------
  const [bannerIdx, setBannerIdx] = useState(0);
  const banners = [
    {
      image:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop',
      alt: 'Welcome to ERSA — Smart Kiosk',
      cta: { href: '#reserve', label: 'Reserve a Room' },
    },
    {
      image:
        'https://images.unsplash.com/photo-1472224371017-08207f84aaae?q=80&w=1200&auto=format&fit=crop',
      alt: 'Need markers or adapters?',
      cta: { href: '#supplies', label: 'Request Supplies' },
    },
  ];
  useEffect(() => {
    const id = setInterval(
      () => setBannerIdx((i) => (i + 1) % banners.length),
      7000
    );
    return () => clearInterval(id);
  }, []);

  // ---------- Modals + toasts ----------
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
    start: '',
    end: '',
  });

  const submitReservation = (e) => {
    e.preventDefault();
    const { room, date, start, end } = reservationData;
    if (!room || !date || !start || !end) return;

    if (isRoomReserved(reservations, room, date, start, end)) {
      setToast('⚠️ That time is already reserved. Please choose another time.');
      return;
    }

    const updated = [
      ...reservations,
      { room, date, start, end, createdAt: nowISO() },
    ];
    setReservations(updated);
    writeJSON('reservations', updated);
    setShowReserveModal(false);
    setToast(`Room ${room} reserved on ${date} from ${start} to ${end}.`);
  };

  const roomStatus = (room, date, start, end) => {
    if (!room || !date || !start || !end) return 'neutral';
    return isRoomReserved(reservations, room, date, start, end)
      ? 'busy'
      : 'free';
  };

  // ---------- Supplies (Scrollable) ----------
  // Categories and items (based on your screenshot)
  const STORAGE_CLOSET = [
    'Pens',
    'Pencils',
    'Highlighters',
    'Dry Erase Markers',
    'Erasers',
    'Whiteboard Cleaner',
    'Sticky Notes',
    'Sticky Tabs',
    'Notepad',
    'Printer Paper',
    'Folders',
    'Binders',
    'Binder Clips',
    'Paper Clips',
    'Stapler',
    'Tape Dispenser',
    'Scissors',
    'Ruler',
    'Glue Stick',
    'Index Cards',
    'Extension Cord',
    'HDMI Cable',
    'DisplayPort Cable',
    'USB-C Adapter',
    'USB Drive',
    'Charging Cable',
    'Mouse',
    'Keyboard',
    'Laser Pointer',
    'Cleaning Wipes',
    'Batteries AA',
    'Batteries AAA',
  ];
  const BREAK_ROOM = [
    'Coffee Cups',
    'Coffee Lids',
    'Stirrers',
    'Sugar Packets',
    'Creamer',
    'Napkins',
    'Plates',
    'Bowls',
    'Plastic Spoons',
    'Plastic Forks',
    'Paper Towels',
    'Kleenex',
    'Trash Bags',
    'Dish Soap',
    'Sponge',
  ];
  const K_CUPS = [
    'Donut Shop',
    'Breakfast Blend',
    'French Roast',
    'Hazelnut',
    'Vanilla',
    'Colombian',
    'Decaf',
    'Green Tea',
    'Earl Grey',
    'Hot Cocoa',
  ];

  // Popular items (float to top within each section)
  const POPULAR = new Set([
    'HDMI Cable',
    'USB-C Adapter',
    'Dry Erase Markers',
    'Erasers',
    'Coffee Cups',
    'Kleenex',
    'Sugar Packets',
    'Donut Shop',
  ]);

  const [selectedSupplies, setSelectedSupplies] = useState(() =>
    readJSON('supplySelected', [])
  );
  const toggleSupply = (name) => {
    setSelectedSupplies((prev) => {
      const has = prev.includes(name);
      const next = has ? prev.filter((x) => x !== name) : [...prev, name];
      writeJSON('supplySelected', next);
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
    setShowSuppliesModal(false);
    setToast(`Supply request sent: ${selectedSupplies.join(', ')}`);
  };

  // UI helpers
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
      <img
        src={`https://via.placeholder.com/160?text=${encodeURIComponent(name)}`}
        alt={name}
      />
      <span>{name}</span>
    </div>
  );

  const renderSection = (title, items) => {
    const popular = items.filter((i) => POPULAR.has(i));
    const rest = items.filter((i) => !POPULAR.has(i));
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

  const generateTimes = () => {
    const times = [];
    let hour = 8,
      minute = 0;
    while (hour < 21) {
      // 8:00 AM to 8:00 PM
      const hh = hour.toString().padStart(2, '0');
      const mm = minute.toString().padStart(2, '0');
      const period = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      times.push(`${displayHour}:${mm} ${period}`);
      minute += 15;
      if (minute === 60) {
        minute = 0;
        hour++;
      }
    }
    return times;
  };

  // ---------- Render ----------
  return (
    <div className='app-layout dashboard-view'>
      <div className='dashboard-grid'>
        {/* LEFT */}
        <aside className='dash-left'>
          <div className='card user-card'>
            <div className='user-row'>
              <img className='user-avatar' src={display.avatar} alt='' />
              <div>
                <div className='user-name'>{display.name}</div>
                <div className='user-id'>User ID: {display.id}</div>
              </div>
            </div>
            <div className='user-meta'>{display.role}</div>
            <div className='user-links'>
              <a href={`mailto:${display.email}`} className='pill-link'>
                Email
              </a>
              <a href='https://www.uta.edu/maps' className='pill-link'>
                UTA Map
              </a>
              <a href='https://www.uta.edu/alerts' className='pill-link'>
                Alerts
              </a>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <button onClick={handleLogout} className='auth-button'>
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* CENTER */}
        <section className='dash-center'>
          <Banner item={banners[bannerIdx]} />
          <div className='card map-card'>
            <div style={{ height: '50vh' }}>
              <KioskMap />
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <aside className='dash-right'>
          <div className='card action-card'>
            <div className='action-head'>
              <div className='action-title'>Reserve Conference Room</div>
              <span className='action-check' aria-hidden>
                ✓
              </span>
            </div>
            <p className='action-copy'>Book a meeting space by date & time.</p>
            <button
              onClick={() => setShowReserveModal(true)}
              className='btn btn-primary w-full'
            >
              Open Scheduler
            </button>
          </div>

          <div className='card action-card'>
            <div className='action-head'>
              <div className='action-title'>Request Supplies</div>
              <span className='action-check' aria-hidden>
                ✓
              </span>
            </div>
            <p className='action-copy'>
              Tap pictures to select items you need.
            </p>
            <button
              onClick={() => setShowSuppliesModal(true)}
              className='btn btn-primary w-full'
            >
              Open Request Form
            </button>
          </div>
        </aside>
      </div>

      {/* ---------- Reserve Room Modal ---------- */}
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
                const status = roomStatus(
                  r,
                  reservationData.date,
                  reservationData.start,
                  reservationData.end
                );
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
                    <div className={`room-status ${status}`}>
                      {status === 'free'
                        ? '🟢 Available'
                        : status === 'busy'
                        ? '🔴 Reserved'
                        : '—'}
                    </div>
                    <div className='room-meta'>Capacity: 8 · Screen · HDMI</div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={submitReservation} className='reserve-form'>
              {/* Row 1 — Date + Room */}
              <div className='form-row'>
                <div>
                  <label>Date</label>
                  <input
                    type='date'
                    required
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

              {/* Row 2 — Start + End Time */}
              <div className='form-row'>
                <div>
                  <label>Start Time</label>
                  <div className='time-picker'>
                    <select
                      required
                      value={reservationData.start}
                      onChange={(e) =>
                        setReservationData((d) => ({
                          ...d,
                          start: e.target.value,
                        }))
                      }
                    >
                      <option value=''>Select Start Time</option>
                      {generateTimes().map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {reservationData.start && (
                      <span className='ampm-badge fixed'>
                        {reservationData.start.includes('AM') ? 'AM' : 'PM'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label>End Time</label>
                  <div className='time-picker'>
                    <select
                      required
                      value={reservationData.end}
                      onChange={(e) =>
                        setReservationData((d) => ({
                          ...d,
                          end: e.target.value,
                        }))
                      }
                    >
                      <option value=''>Select End Time</option>
                      {generateTimes().map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {reservationData.end && (
                      <span className='ampm-badge fixed'>
                        {reservationData.end.includes('AM') ? 'AM' : 'PM'}
                      </span>
                    )}
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

      {/* ---------- Supplies Modal (Single Scrollable Page) ---------- */}
      {showSuppliesModal && (
        <div
          className='modal-overlay'
          onClick={() => setShowSuppliesModal(false)}
        >
          <div className='modal-box large' onClick={(e) => e.stopPropagation()}>
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

            {renderSection('Storage Closet', STORAGE_CLOSET)}
            {renderSection('Break Room', BREAK_ROOM)}
            {renderSection('K-Cups', K_CUPS)}

            <button
              onClick={submitSupplies}
              className='btn btn-primary w-full mt-2'
            >
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* ---------- Confirmation Toast ---------- */}
      {toast && <ConfirmToast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
