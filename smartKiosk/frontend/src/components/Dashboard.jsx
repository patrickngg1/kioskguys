// src/components/Dashboard.jsx
import React, { useEffect, useState, useRef, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UIAssetsContext } from '../App';
import '../styles/Dashboard.css';
import '../styles/App.css';
import '../styles/PremiumModal.css';
import '../styles/PremiumInput.css';
import '../styles/AdminPanel.css';
import AdminPanel from './AdminPanel';
import ReserveConferenceRoom from './ReserveConferenceRoom';
import { getSessionUser, logoutSession } from '../api/authApi';
import SetPasswordOverlay from './SetPasswordOverlay';
import PremiumInput from './PremiumInput';
import { apiFetch } from '../api/api';

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

  const INACTIVITY_LIMIT = 10 * 60 * 1000;
  const WARNING_TIME = 30;
  const inactivityTimer = useRef(null);
  const [showLogoutSplash, setShowLogoutSplash] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const chimeRef = useRef(null);

  // ------------------------ Dynamic Banners State ------------------------
  const [banners, setBanners] = useState([]);
  const [bannerIdx, setBannerIdx] = useState(0);

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

  const handleSaveName = async (e) => {
    e.preventDefault(); // Ensure form doesn't reload

    // 1. Clean up extra spaces
    const cleanName = editNameValue.trim().replace(/\s+/g, ' ');

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

        setEditNameBtnState('success');

        setTimeout(() => {
          setShowEditNameModal(false);
          setEditNameBtnState('idle');
        }, 1500);
      } else {
        setEditNameBtnState('idle');
      }
    } catch (err) {
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
  const [showAdminPanel, setShowAdminPanel] = useState(false);

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
      const data = await apiFetch("/api/rooms/reservations/my/");
      if (data.ok && Array.isArray(data.reservations)) {
        setReservations(data.reservations);
      }
    } catch (err) {
      console.error("Failed to load reservations:", err);
    }
  };

  const [itemsByCategory, setItemsByCategory] = useState({});

  useEffect(() => {
    async function loadItems() {
      try {
        // apiFetch already returns JSON
        const data = await apiFetch('/api/items/');

        let categoriesOut = {};

        if (data?.categories && typeof data.categories === "object") {
          categoriesOut = data.categories;
        } else if (Array.isArray(data?.items)) {
          data.items.forEach((item) => {
            const cat =
              item.category_name ||
              item.category ||
              "Misc";

            if (!categoriesOut[cat]) {
              categoriesOut[cat] = [];
            }
            categoriesOut[cat].push(item);
          });
        }

        setItemsByCategory(categoriesOut);
      } catch (err) {
        console.error("Failed to load items:", err?.message || err);
      }
    }

    loadItems();
  }, []);

  const [popularByCategory, setPopularByCategory] = useState({});
  const loadPopular = async () => {
    try {
      const res = await apiFetch('/api/supplies/popular/?limit=3');
      const data = await res.json();
      const popular = data?.popular || {};
      const mapped = {};
      Object.entries(popular).forEach(([categoryName, items]) => {
        mapped[categoryName] = new Set((items || []).map((x) => x.name));
      });
      setPopularByCategory(mapped);
    } catch (err) {
      console.error('Failed to load popular items', err);
      console.log("items status", res.status, text.slice(0, 200));
    }
  };

  useEffect(() => {
    loadPopular();
  }, []);

  const [selectedSupplies, setSelectedSupplies] = useState([]);

  // Banner Slideshow Logic
  useEffect(() => {
    if (showReserveModal || banners.length <= 1) return;
    const id = setInterval(
      () => setBannerIdx((i) => (i + 1) % banners.length),
      7000
    );
    return () => clearInterval(id);
  }, [showReserveModal, banners.length]);

  // src/components/Dashboard.jsx

  
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
                onClick={handleLogout}
                className='luxury-signout-btn'
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Signing Out…' : 'Sign Out'}
              </button>
            </div>
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
          existingReservations={reservations}
          onReservationCreated={() => loadReservations()}
        />
      )}

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
    </>
  );
}
