// src/components/Dashboard.jsx
import React, { useEffect, useState, useRef, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UIAssetsContext } from '../App';
import KioskMap from './KioskMap';
import '../styles/Dashboard.css';
import '../styles/App.css';
import '../styles/CardSwipeModal.css';
import '../styles/PremiumModal.css';
import '../styles/PremiumInput.css';
import '../styles/AdminPanel.css'; // ✅ Imported to get Premium Button Styles
import DashboardToast from './DashboardToast';
import AdminPanel from './AdminPanel';
import RequestSupply from './RequestSupply';
import ReserveConferenceRoom from './ReserveConferenceRoom';
import { getSessionUser, logoutSession } from '../api/authApi';
import SetPasswordOverlay from './SetPasswordOverlay';
import CardSwipeModal from './CardSwipeModal';
import PremiumInput from './PremiumInput';

// --- HELPER: Smart Button Inner Content ---
// (Identical to AdminPanel to ensure premium animations)
const SmartButtonContent = ({
  btnState,
  idleText,
  loadingText,
  successText,
  successIcon = true,
}) => (
  <>
    {/* Layer 1: Idle Text */}
    <span className={`btn-text-layer ${btnState === 'idle' ? 'visible' : ''}`}>
      {idleText}
    </span>

    {/* Layer 2: Loading Spinner */}
    <span
      className={`btn-text-layer ${btnState === 'loading' ? 'visible' : ''}`}
    >
      <span
        className='spinner-loader'
        style={{ width: '14px', height: '14px', borderWidth: '2px' }}
      ></span>
      {loadingText && <span>{loadingText}</span>}
    </span>

    {/* Layer 3: Success Checkmark */}
    <span
      className={`btn-text-layer ${btnState === 'success' ? 'visible' : ''}`}
    >
      {successIcon && (
        <svg
          className='checkmark-icon'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='3.5'
          style={{ width: '16px', height: '16px' }}
        >
          <path
            d='M5 13l4 4L19 7'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      )}
      {successText}
    </span>
  </>
);

function extractUTAID(raw) {
  if (!raw) return null;
  const t3 = raw.match(/\+(\d{8,10})\?/);
  if (t3) return t3[1];
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const uiAssets = useContext(UIAssetsContext);
  const initialResetRequired = sessionStorage.getItem('reset-required') === '1';

  // User State
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Password Reset State
  const [isSetPasswordOpen, setIsSetPasswordOpen] =
    useState(initialResetRequired);
  const [mustSetPassword, setMustSetPassword] = useState(initialResetRequired);

  // Name Editing State
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  // ✅ NEW: Button State for Edit Name
  const [editNameBtnState, setEditNameBtnState] = useState('idle');

  // Inactivity / Countdown State
  const [ringProgress, setRingProgress] = useState(0);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef(null);

  const INACTIVITY_LIMIT = 30 * 1000;
  const WARNING_TIME = 30;
  const inactivityTimer = useRef(null);
  const [showLogoutSplash, setShowLogoutSplash] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const chimeRef = useRef(null);

  // ------------------------ Dynamic Banners State ------------------------
  const [banners, setBanners] = useState([]);
  const [bannerIdx, setBannerIdx] = useState(0);

  useEffect(() => {
    chimeRef.current = new Audio('/soft-chime.wav');
  }, []);

  // src/components/Dashboard.jsx

  function startLogoutSplash() {
    setShowLogoutSplash(true);

    // 1. Initial Void Warping (The screen starts to darken and blur)
    document.body.classList.add('astral-void-active');

    // 2. The Quantum Implosion (A blinding white flash at 3.2 seconds)
    setTimeout(() => {
      document.body.classList.add('astral-supernova');
    }, 3200);

    // 3. Final Redirect at 4 seconds
    setTimeout(() => {
      document.body.classList.remove('astral-void-active', 'astral-supernova');
      navigate('/', { state: { startOverlay: true } });
    }, 4000);
  }
  // ------------------------ Load User ------------------------
  useEffect(() => {
    async function initUser() {
      try {
        const sessionUser = await getSessionUser();

        if (!sessionUser) {
          navigate('/');
          return;
        }

        setUser(sessionUser);
        setProfile({
          fullName: sessionUser.fullName,
          email: sessionUser.email,
        });

        const resetRequiredByServer = sessionUser.mustSetPassword === true;
        setMustSetPassword(resetRequiredByServer);
        setIsSetPasswordOpen(resetRequiredByServer);

        if (resetRequiredByServer === true) {
          return;
        }

        await loadReservations();
      } catch (err) {
        console.error('Dashboard initUser error:', err);
      }
    }

    initUser();
  }, [navigate]);

  // ------------------------ Load Banners (Dynamic + Static) ------------------------
  useEffect(() => {
    const loadBanners = async () => {
      // 1. Define Static Defaults
      const defaults = [
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
      ].filter((b) => b.image); // Only keep if image loaded

      try {
        // 2. Fetch Active Banner from Admin
        const res = await fetch('/api/banners/active/');
        const data = await res.json();

        if (data.ok && Array.isArray(data.banners)) {
          const dynamicBanners = data.banners.map((b) => ({
            image: b.image_url,
            alt: b.label || 'UTA Banner',
            cta: null,
            link: b.link || null,
          }));
          setBanners([...dynamicBanners, ...defaults]);
        } else {
          setBanners(defaults);
        }
      } catch (err) {
        console.error('Failed to load active banner', err);
        setBanners(defaults);
      }
    };

    loadBanners();
  }, [uiAssets]);

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

    setCountdown(WARNING_TIME);
    setRingProgress(0);

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

        if (prev === 0) {
          clearInterval(countdownRef.current);

          // 1. Immediately hide the countdown modal
          setShowInactivityModal(false);

          // 2. IMMEDIATELY start the animation (don't wait for the server)
          startLogoutSplash();

          // 3. Fire the logout request in the background
          logoutSession();
        }

        return next;
      });
    }, 1000);

    return () => {
      clearInterval(countdownRef.current);
    };
  }, [showInactivityModal]);

  const handleLogout = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await logoutSession();
    } finally {
      startLogoutSplash();
    }
  };

  const openEditName = () => {
    setEditNameValue(profile?.fullName || user?.fullName || '');
    setEditNameBtnState('idle'); // Reset button
    setShowEditNameModal(true);
  };

  // ✅ SUPER PREMIUM SAVE: Updates button instead of Toast
  const handleSaveName = async (e) => {
    e.preventDefault(); // Ensure form doesn't reload

    // 1. Clean up extra spaces
    const cleanName = editNameValue.trim().replace(/\s+/g, ' ');

    // 2. Check for empty
    if (!cleanName) {
      return showToast('Name cannot be empty', 'error');
    }

    // 3. Check for at least two words (First & Last)
    const nameParts = cleanName.split(' ');
    if (nameParts.length < 2) {
      return showToast('Please enter your full name (First & Last).', 'error');
    }

    setEditNameBtnState('loading'); // Start Loading Spinner

    try {
      const res = await fetch('/api/me/update-name/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        // Send the cleaned, multi-part name
        body: JSON.stringify({ fullName: cleanName }),
      });
      const data = await res.json();

      if (data.ok) {
        const newName = data.fullName;
        setUser((prev) => ({ ...prev, fullName: newName }));
        setProfile((prev) => ({ ...prev, fullName: newName }));

        // ✅ Success Animation (No Toast)
        setEditNameBtnState('success');

        setTimeout(() => {
          setShowEditNameModal(false);
          setEditNameBtnState('idle');
        }, 1500);
      } else {
        showToast(data.error || 'Failed to update name', 'error');
        setEditNameBtnState('idle');
      }
    } catch (err) {
      showToast('Network error', 'error');
      setEditNameBtnState('idle');
    }
  };

  const display = {
    name: profile?.fullName || user?.fullName || user?.email,
    id: user?.id ?? '—',
    role: user?.isAdmin ? 'Administrator' : 'Authenticated User',
    email: user?.email,
    avatar:
      'https://api.dicebear.com/7.x/thumbs/svg?seed=' +
      encodeURIComponent(user?.email || 'uta') +
      '&backgroundType=gradientLinear&shapeColor=1d4ed8,2563eb',
  };

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
        }
        setItemsByCategory(categoriesOut);
      } catch (err) {
        console.error('Failed to load items', err);
      }
    }
    loadItems();
  }, []);

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
    }
  };

  useEffect(() => {
    loadPopular();
  }, []);

  const [selectedSupplies, setSelectedSupplies] = useState([]);

  // Banner Slideshow Logic
  useEffect(() => {
    if (showReserveModal || showSuppliesModal || banners.length <= 1) return;
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
    if (selectedSupplies.length === 0) {
      return false;
    }
    try {
      const res = await fetch('/api/supplies/request/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedSupplies }),
      });
      const data = await res.json();

      if (!res.ok || (!data.ok && !data.requestId)) {
        console.error(data.error || 'Request failed.');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Network error', err);
      return false;
    }
  };

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

  let toastType = 'success';
  if (toastShake) toastType = 'error';
  else if (toast?.toLowerCase().includes('submitting')) toastType = 'loading';
  else if (toast?.toLowerCase().includes('error')) toastType = 'error';

  // src/components/Dashboard.jsx

  const handleCardRegister = async ({ raw, uta_id }) => {
    try {
      if (!raw && !uta_id) return false;

      const res = await fetch('/api/card/register/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_swipe: raw, uta_id: uta_id }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setUser((prev) => ({ ...prev, hasCard: true }));
        return true; // Modal will show "Identity Secured"
      } else {
        // If the card is wrong type or invalid, return false
        return false; // Modal will show "Access Denied"
      }
    } catch (err) {
      return false;
    }
  };
  return (
    <>
      {/* MAIN DASHBOARD */}
      <div
        className={`dashboard-view dashboard-fade-in ${
          showLogoutSplash ? 'dashboard-freeze' : ''
        }`}
      >
        <div className='dashboard-grid'>
          {/* USER CARD (CENTERED) */}
          <div
            className='card user-card action-card'
            style={{
              gridArea: 'user',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Avatar Centered */}
            <img className='user-avatar' src={display.avatar} alt='' />

            {/* Name + Black Pen Icon Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
              }}
            >
              <div
                className='user-name'
                style={{ fontWeight: '800', fontSize: '1.2rem' }}
              >
                {display.name}
              </div>

              <button
                className='edit-name-btn'
                onClick={openEditName}
                title='Edit Name'
                type='button'
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000',
                }}
              >
                <svg
                  viewBox='0 0 24 24'
                  fill='currentColor'
                  style={{
                    width: '18px',
                    height: '18px',
                    display: 'block',
                  }}
                >
                  <path d='M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z' />
                </svg>
              </button>
            </div>

            <div
              className='user-meta'
              style={{
                color: '#ea580c',
                fontWeight: '700',
                fontSize: '0.9rem',
              }}
            >
              Role: {display.role}
            </div>
            <div
              className='user-email'
              style={{
                color: '#64748b',
                fontSize: '0.9rem',
              }}
            >
              {display.email}
            </div>

            <div className='luxury-action-group'>
              <button
                onClick={() => setShowSwipeModal(true)}
                className='luxury-card-btn'
              >
                <div className='card-content-left'>
                  <div className='card-chip-icon' />
                  <div className='card-text-group'>
                    <span className='card-label-main'>
                      {user?.hasCard ? 'UTA Swipe Access' : 'Activate Swipe'}
                    </span>
                    <span className='card-label-sub'>
                      {user?.hasCard ? '•••• Linked' : 'Tap to configure'}
                    </span>
                  </div>
                </div>
                <div className='card-arrow-icon'>
                  <svg
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M5 12h14M12 5l7 7-7 7' />
                  </svg>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className='luxury-signout-btn'
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Signing Out…' : 'Sign Out'}
              </button>
            </div>
          </div>

          {/* BANNER (DYNAMIC) */}
          <div className='banner-block'>
            {banners.map((b, i) => (
              <img
                key={i}
                src={b.image}
                alt={b.alt}
                className={`banner-img ${i === bannerIdx ? 'active' : ''}`}
              />
            ))}

            {banners.length > 0 && banners[bannerIdx]?.cta ? (
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
            ) : banners.length > 0 && banners[bannerIdx]?.link ? (
              <div className='start-qr-glass-plate dashboard-qr-adjust'>
                <div className='qr-glass-glow'></div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                    banners[bannerIdx].link
                  )}`}
                  alt='Scan'
                  className='qr-etched-image'
                />
                <span className='qr-glass-label'>SCAN FOR INFO</span>
              </div>
            ) : null}
          </div>

          {/* ADMIN CARDS */}
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
                className='btn-uta-admin'
              >
                Open Admin Panel
              </button>
            </div>
          )}

          {/* MAP */}
          <div
            className='map-container'
            // ✅ FIX: Removed 'gridRow' constraint, added 'height: 100%' so it fills entire column
            style={{ gridArea: 'map', height: '100%', minHeight: '100%' }}
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
              {uiAssets?.banner1 && (
                <img
                  src={uiAssets.banner1}
                  alt='Reserve Preview'
                  className='card-preview-img'
                />
              )}
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
                className='btn-uta-blue'
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
              {uiAssets?.banner2 && (
                <img
                  src={uiAssets.banner2}
                  alt='Supplies Preview'
                  className='card-preview-img'
                />
              )}
              <button
                onClick={() => {
                  setSelectedSupplies([]);
                  setShowSuppliesModal(true);
                }}
                className='btn-uta-orange'
              >
                Open Request Form
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN PANEL */}
      {showAdminPanel && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          user={user}
          reservations={reservations}
          itemsByCategory={itemsByCategory}
          rooms={[]}
          users={[]}
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
            loadReservations();
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

      {/* EDIT NAME MODAL (Updated Input & Smart Button) */}
      {showEditNameModal && (
        <div className='modal-overlay'>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
            <button
              className='close-btn'
              onClick={() => setShowEditNameModal(false)}
            >
              ✕
            </button>
            <h2 className='premium-modal-title'>Edit Your Name</h2>
            <p className='premium-modal-message'>
              Correct a typo or update how your name appears on reservations.
            </p>
            <form onSubmit={handleSaveName}>
              <div
                className='form-row'
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginTop: '-1rem',
                  marginBottom: '2rem',
                }}
              >
                <label style={{ textAlign: 'left' }}>Full Name</label>
                <PremiumInput
                  type='text'
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  placeholder='e.g. John Doe'
                  autoFocus
                />
              </div>

              <div className='premium-modal-actions'>
                <button
                  type='button'
                  className='premium-btn cancel'
                  onClick={() => setShowEditNameModal(false)}
                  disabled={editNameBtnState !== 'idle'}
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className={`premium-btn primary smart-submit-btn ${editNameBtnState}`}
                  disabled={editNameBtnState !== 'idle'}
                >
                  <SmartButtonContent
                    btnState={editNameBtnState}
                    idleText='Save Changes'
                    loadingText='Saving...'
                    successText='Saved'
                  />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INACTIVITY OVERLAY */}
      {showInactivityModal && <div className='inactivity-dim'></div>}

      {/* INACTIVITY MODAL */}
      {showInactivityModal && (
        <div className='modal-overlay' style={{ zIndex: 999 }}>
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
          setMustSetPassword(false);
          setIsSetPasswordOpen(false);

          // Sync the local user state to reflect the password update
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
