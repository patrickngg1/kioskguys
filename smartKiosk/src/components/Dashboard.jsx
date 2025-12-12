import React, { useEffect, useState, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UIAssetsContext } from '../App';
import KioskMap from './KioskMap';
import '../styles/Dashboard.css';
import '../styles/App.css';
import '../styles/CardSwipeModal.css';
import DashboardToast from './DashboardToast';
import AdminPanel from './AdminPanel';
import RequestSupply from './RequestSupply';
import ReserveConferenceRoom from './ReserveConferenceRoom';
import { getSessionUser, logoutSession } from '../api/authApi';
import SetPasswordOverlay from './SetPasswordOverlay'; // adjust path if needed
import CardSwipeModal from './CardSwipeModal';

function extractUTAID(raw) {
  if (!raw) return null;

  // Track 3: +XXXXXXXXX?  ← THIS IS THE REAL STUDENT ID
  const t3 = raw.match(/\+(\d{8,10})\?/);
  if (t3) return t3[1];

  return null; // Do NOT fallback to track2/track1 — they aren't IDs
}

const timesOverlap = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && bStart < aEnd;

// ------------------------ Card Registration Handler ------------------------

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const navUser = location.state?.user || null;
  console.log('DASHBOARD → navUser:', navUser);
  // 🔵 Global UI assets (banners, chrome) from App.jsx context
  const uiAssets = useContext(UIAssetsContext);

  const initialResetRequired = sessionStorage.getItem('reset-required') === '1';

  // ...
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // Initialize state based on the initial check
  const [isSetPasswordOpen, setIsSetPasswordOpen] =
    useState(initialResetRequired);
  const [mustSetPassword, setMustSetPassword] = useState(initialResetRequired);
  // ...
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

  // src/components/Dashboard.jsx

  // ------------------------ Load User // ------------------------ Load User ------------------------
  useEffect(() => {
    async function initUser() {
      try {
        // 1️⃣ Always load session user from backend
        const sessionUser = await getSessionUser();

        // If not logged in → go back to login
        if (!sessionUser) {
          navigate('/');
          return;
        }

        // 2️⃣ Put user into state
        setUser(sessionUser);
        setProfile({
          fullName: sessionUser.fullName,
          email: sessionUser.email,
        });

        // 3️⃣ Check backend-enforced password reset
        const resetRequiredByServer = sessionUser.mustSetPassword === true;

        // Set overlay flags
        setMustSetPassword(resetRequiredByServer);
        setIsSetPasswordOpen(resetRequiredByServer);

        // 4️⃣ If reset is required, STOP dashboard from loading anything else
        if (resetRequiredByServer === true) {
          console.log(
            '⛔ Blocking dashboard until password reset is completed.'
          );
          return; // 🔥 VERY IMPORTANT
        }

        // 5️⃣ Load reservations normally
        await loadReservations();
      } catch (err) {
        console.error('Dashboard initUser error:', err);
      }
    }

    initUser();
  }, [navigate]);

  // ------------------------ Inactivity Detection ------------------------
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
  }, [user, showInactivityModal]);

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
    name:
      profile?.fullName ||
      user?.fullName ||
      user?.first_name ||
      user?.firstName ||
      user?.email,

    id: user?.id ?? '—',
    role: user?.isAdmin ? 'Administrator' : 'Authenticated User',
    email: user?.email,
    avatar:
      'https://api.dicebear.com/7.x/thumbs/svg?seed=' +
      encodeURIComponent(user?.email || 'uta') +
      '&backgroundType=gradientLinear&shapeColor=1d4ed8,2563eb',
  };

  // ------------------------ Banners (from Django ui_assets) ------------------------
  const [bannerIdx, setBannerIdx] = useState(0);
  const banners = [
    {
      image: uiAssets?.banner1,
      alt: 'UTA Campus Entrance',
      cta: { href: '#reserve', label: 'Reserve a Room' },
    },
    {
      image: uiAssets?.banner2,
      alt: 'Need markers or adapters?',
      cta: { href: '#supplies', label: 'Request Supplies' },
    },
  ];

  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSwipeModal, setShowSwipeModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastShake, setToastShake] = useState(false);
  const showToast = (message, type = 'success') => {
    setToast(message || '');
    setToastShake(type === 'error');
  };

  // ------------------------ Reservations (local) ------------------------
  // 💡 FIX: Set to empty array, relying entirely on the modal's fetch/API
  const [reservations, setReservations] = useState([]);

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

  const loadReservations = async () => {
    try {
      const res = await fetch('/api/rooms/reservations/my/', {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.ok && Array.isArray(data.reservations)) {
        setReservations(data.reservations);
      }
    } catch (err) {
      console.error('Failed to load reservations:', err);
    }
  };

  // ------------------------ Items from backend (TiDB) ------------------------
  // /api/items/ returns: { ok: true, categories: { "Storage Closet": [...], "Break Room": [...], "K-Cups": [...] } }
  const [itemsByCategory, setItemsByCategory] = useState({});
  useEffect(() => {
    async function loadItems() {
      try {
        const res = await fetch('/api/items/');
        const data = await res.json();

        let categoriesOut = {};

        if (data.categories) {
          categoriesOut = data.categories;
        } else if (Array.isArray(data.items)) {
          data.items.forEach((item) => {
            const cat = item.category_name || item.category || 'Misc';
            if (!categoriesOut[cat]) categoriesOut[cat] = [];
            categoriesOut[cat].push(item);
          });
        } else if (Array.isArray(data)) {
          data.forEach((item) => {
            const cat = item.category_name || item.category || 'Misc';
            if (!categoriesOut[cat]) categoriesOut[cat] = [];
            categoriesOut[cat].push(item);
          });
        } else {
          const entries = Object.entries(data);
          const allArrays = entries.every(([k, v]) => Array.isArray(v));
          if (allArrays) {
            categoriesOut = data;
          }
        }

        setItemsByCategory(categoriesOut);
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
      const res = await fetch('/api/supplies/popular/?limit=3');
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
  // ---- FIXED submitSupplies (drop-in replacement) ----
  // ==========================
  // CORRECT submitSupplies()
  // ==========================
  const submitSupplies = async () => {
    if (selectedSupplies.length === 0) {
      setToast('Please select at least one item.');
      setToastShake(true);
      return;
    }

    try {
      setToast('Submitting request…');
      setToastShake(false);

      const res = await fetch('/api/supplies/request/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedSupplies }),
      });

      const data = await res.json();

      // 🔥 SAFE SUCCESS CHECK
      const success =
        res.ok &&
        (data.ok === true ||
          data.requestId ||
          data.id ||
          data.success ||
          data.message);

      if (!success) {
        setToast(data.error || 'Request failed.');
        setToastShake(true);
        return;
      }

      // Build item names for toast
      const allItems = Object.values(itemsByCategory).flat();
      const itemNames = selectedSupplies
        .map((id) => allItems.find((x) => x.id === id)?.name || 'Item')
        .join(', ');

      setToast(`Request submitted successfully!\nItems: ${itemNames}`);
      setToastShake(false);

      setSelectedSupplies([]);
      setShowSuppliesModal(false);
    } catch (err) {
      console.error('Submit error:', err);
      setToast('Network error. Please try again.');
      setToastShake(true);
    }
  };

  // Supply card for each item — images come directly from TiDB/Django `items.image`
  const supplyCard = (item) => {
    if (!item) return null;

    const imgSrc = item.image || null;

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
        {imgSrc ? (
          <img src={imgSrc} alt={item.name} />
        ) : (
          <div className='supply-placeholder supply-letter-bubble'>
            {(item.name || '?').charAt(0).toUpperCase()}
          </div>
        )}

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

  const handleCardRegister = async ({ raw, uta_id }) => {
    try {
      if (!raw && !uta_id) {
        showToast('Could not read card data. Try again.', 'error');
        return;
      }

      const res = await fetch('/api/card/register/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_swipe: raw,
          uta_id: uta_id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        showToast('Card successfully linked!');
        setShowSwipeModal(false);

        // ✅ INSTANTLY UPDATE BUTTON STATE
        setUser((prev) => ({ ...prev, hasCard: true }));
      } else {
        showToast(data.error || 'Could not link card.', 'error');
      }
    } catch (err) {
      console.error('Card register error:', err);
      showToast('Network error while linking card.', 'error');
    }
  };
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
              </div>
            </div>
            <div className='user-meta'>Role: {display.role}</div>
            <div className='user-email'>{display.email}</div>
            <button
              onClick={() => setShowSwipeModal(true)}
              className='btn btn-primary wl-ful'
              style={{
                marginTop: '0.75rem',
                // Orange if new, Blue/Gray if updating
                background: user?.hasCard ? '#2563eb' : 'var(--uta-orange)',
              }}
            >
              {user?.hasCard ? 'Update Swipe Access' : 'Add Swipe Access'}
            </button>

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
            {banners.map((b, i) =>
              b.image ? (
                <img
                  key={i}
                  src={b.image}
                  alt={b.alt}
                  className={`banner-img ${i === bannerIdx ? 'active' : ''}`}
                />
              ) : null
            )}
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
          {/* ADMIN CARDS (only for admin users) */}
          {user?.isAdmin && (
            <div className='card action-card' style={{ gridArea: 'adminFull' }}>
              <div className='action-head'>
                <div className='action-title'>Admin Dashboard</div>
              </div>
              <p className='action-copy'>
                Manage rooms, reservations, items & users.
              </p>

              <button
                onClick={() => setShowAdminPanel(true)}
                className='btn btn-primary w-full'
              >
                Open Admin Panel
              </button>
            </div>
          )}

          {/* MAP */}
          {/* MAP – span both reserve + supplies rows */}
          {/* MAP */}
          <div
            className='map-container'
            style={{
              gridArea: 'map',
              gridRow: 'reserve / supplies', // spans reserve → supplies rows
            }}
          >
            <KioskMap />
          </div>
          {/* RESERVE CARD */}
          <div
            className='card action-card premium-card'
            style={{ gridArea: 'reserve' }}
          >
            <div className='premium-card-content'>
              <div className='action-head'>
                <div className='action-title'>Reserve Conference Room</div>
              </div>

              <p className='action-copy'>
                Book a meeting space by date & time.
              </p>

              {/* Premium cute image */}
              {uiAssets?.banner1 && (
                <img
                  src={uiAssets.banner1}
                  alt='Reserve Preview'
                  className='card-preview-img'
                />
              )}

              {/* CTA Button */}
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
          </div>

          {/* SUPPLIES CARD */}
          <div
            className='card action-card premium-card'
            style={{ gridArea: 'supplies' }}
          >
            <div className='premium-card-content'>
              <div className='action-head'>
                <div className='action-title'>Request Supplies</div>
              </div>

              <p className='action-copy'>
                Tap pictures to select items you need.
              </p>

              {/* Premium cute image */}
              {uiAssets?.banner2 && (
                <img
                  src={uiAssets.banner2}
                  alt='Supplies Preview'
                  className='card-preview-img'
                />
              )}

              {/* CTA Button */}
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
      </div>

      {/* ADMIN PANEL OVERLAY (Full Screen) */}
      {showAdminPanel && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          user={user}
          reservations={reservations}
          itemsByCategory={itemsByCategory}
          rooms={[]}
          users={[]}
          // ⭐ Add these two:
          showToast={showToast}
          loadReservations={loadReservations}
        />
      )}

      {/* RESERVE MODAL */}
      {showReserveModal && (
        <ReserveConferenceRoom
          isOpen={showReserveModal}
          onClose={() => {
            setShowReserveModal(false);
            loadReservations(); // ← reload data WITHOUT page refresh
          }}
          user={user}
          setToast={setToast}
          setToastShake={setToastShake}
          existingReservations={reservations}
          onReservationCreated={() => loadReservations()}
        />
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

      <SetPasswordOverlay
        isOpen={mustSetPassword}
        onSuccess={(success) => {
          if (success) {
            // Use your REAL toast API:
            setToast('Password updated successfully!');
            setToastShake(false); // success toast
          }

          // Close overlay
          setMustSetPassword(false);
          setIsSetPasswordOpen(false);

          // Make sure it NEVER reopens again
          setUser((prev) =>
            prev ? { ...prev, mustSetPassword: false } : prev
          );
        }}
        onRequestClose={
          mustSetPassword
            ? undefined
            : () => {
                setIsSetPasswordOpen(false);
              }
        }
      />

      <CardSwipeModal
        isOpen={showSwipeModal}
        onClose={() => setShowSwipeModal(false)}
        onCapture={handleCardRegister}
      />
    </>
  );
}
