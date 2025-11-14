// Dashboard.jsx — Smart Kiosk (Category-specific Popular + Clean Modal)
// --------------------------------------------------------------------
// - Firebase auth/profile (dev mode friendly)
// - Reserve modal with AM/PM toggles + conflict check
// - Supplies modal with category-specific "Frequently Requested"
// - Hides "Frequently Requested" until there is real history
// - Clears selection on modal open; live count + glow on submit
// - Persists request history; recomputes per-category popularity on submit

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskMap from './KioskMap';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config';
import '../styles/Dashboard.css';
import '../styles/App.css';
import banner1 from '../assets/banner1.png';
import banner2 from '../assets/banner2.png';

const APP_ID = 'kiosk-room-booking-v1';
const DEV_MODE = true;

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

// Banner
function Banner({ item, onReserveClick, onSuppliesClick }) {
  if (!item) return null;

  const handleClick = () => {
    if (item.cta?.href === '#reserve') onReserveClick?.();
    if (item.cta?.href === '#supplies') onSuppliesClick?.();
  };

  return (
    <div className='card banner-block'>
      <img className='banner-img' src={item.image} alt={item.alt || 'Banner'} />
      {item.cta && (
        <button className='btn btn-primary banner-cta' onClick={handleClick}>
          {item.cta.label}
        </button>
      )}
    </div>
  );
}

// Toast
function ConfirmToast({ message = '', onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 4800);
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
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Auth
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

  // Banners
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

  // Modals + Toast
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Reservations
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

    // 1. Destructure all required fields from the state
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

    // 2. Basic form validation
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

    // 3. Convert AM/PM times to minutes since midnight for comparison
    const toMinutes = (h, m, period) => {
      let hour = parseInt(h, 10) % 12;
      if (period === 'PM') hour += 12;
      return hour * 60 + parseInt(m, 10);
    };

    const startMins = toMinutes(startHour, startMin, startPeriod);
    const endMins = toMinutes(endHour, endMin, endPeriod);

    // 4. Validate that end time is after start time
    if (endMins <= startMins) {
      setToast('⚠️ End time must be after start time.');
      return;
    }

    // 5. Format the start and end times for saving
    const start = `${startHour}:${startMin} ${startPeriod}`;
    const end = `${endHour}:${endMin} ${endPeriod}`;

    // 6. Check for conflicts with existing reservations
    if (isRoomReserved(reservations, room, date, start, end)) {
      setToast('⚠️ That time is already reserved. Please choose another slot.');
      return;
    }

    // 7. Create and save the new reservation
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

    // 8. Close modal and show success message
    setShowReserveModal(false);
    setToast(`✅ Room ${room} reserved on ${date} from ${start} to ${end}.`);
  };

  // Supplies — verified item lists (from your spreadsheet), simplified where needed
  // Supplies — verified item lists (from your spreadsheet), simplified where needed
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
      closet: toTop6Set(freq.closet), // may be empty if no history
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
    setPopularByCategory(computePopularByCategory(updatedHistory)); // updates for next open
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
      {/* Replace src with your generated asset path when ready */}
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
    <div className='dashboard-view'>
      <div className='dashboard-grid'>
        {/* User Card (dash-left content) */}
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

          <div style={{ marginTop: '0.75rem' }}>
            <button onClick={handleLogout} className='btn btn-primary wl-ful'>
              Sign Out
            </button>
          </div>
        </div>

        {/* Banner (dash-center content, first item) - Banner component already has the banner-block class */}
        <div className='banner-block'>
          {banners.map((b, i) => (
            <img
              key={i}
              src={b.image}
              alt={b.alt}
              className={`banner-img ${i === bannerIdx ? 'active' : ''}`}
            />
          ))}

          {/* CTA buttons now open modals dynamically */}
          <button
            className='banner-cta btn btn-primary'
            onClick={() => {
              const href = banners[bannerIdx].cta.href;
              if (href === '#reserve') setShowReserveModal(true);
              if (href === '#supplies') {
                setSelectedSupplies([]); // 🔄 Clear selections when opened via banner
                setShowSuppliesModal(true);
              }
            }}
          >
            {banners[bannerIdx].cta.label}
          </button>
        </div>

        {/* Map (dash-center content, second item) */}
        <div className='map-container' style={{ gridArea: 'map' }}>
          <KioskMap />
        </div>

        {/* Reserve Action Card (dash-right content, first item) */}
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
              }); // 🔄 reset reservation form
              setShowReserveModal(true);
            }}
            className='btn btn-primary wl-ful'
          >
            Open Scheduler
          </button>
        </div>

        {/* Supplies Action Card (dash-right content, second item) */}
        <div className='card action-card' style={{ gridArea: 'supplies' }}>
          <div className='action-head'>
            <div className='action-title'>Request Supplies</div>
          </div>
          <p className='action-copy'>Tap pictures to select items you need.</p>
          <button
            onClick={() => {
              setSelectedSupplies([]); // 🔄 Clear previous selections
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
            onClick={(e) => e.stopPropagation()} // <-- prevent modal close on item click
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

      {toast && <ConfirmToast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
