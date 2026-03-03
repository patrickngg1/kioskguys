// App.jsx
import React, { useState, useEffect, useRef, createContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';

import LoginPage from './components/LoginPage';
import Header from './components/Header';
import StartOverlay from './components/StartOverlay';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import './styles/App.css';
import './styles/Glass.css';
import './styles/Dashboard.css'; // Make sure this is here so your modal styles load!

// 🟦 NEW: Context to store all Django UI asset URLs
export const UIAssetsContext = createContext(null);

/**
 * PageLayout:
 * - Applies 'app-layout' on login
 * - Applies 'dashboard-layout' on dashboard
 */
function PageLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.includes('dashboard');
  const layoutClass = isDashboard ? 'dashboard-layout' : 'app-layout';

  return (
    <div className={layoutClass}>
      <Routes>
        <Route path='/' element={<LoginPage />} />
      </Routes>
    </div>
  );
}

function AppContent({ uiAssets }) {
  const [started, setStarted] = useState(false);
  const location = useLocation();

  const onDashboard = location.pathname.includes('dashboard');
  const allowContent = started || onDashboard;

  // --- Inactivity Modal State ---
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [ringProgress, setRingProgress] = useState(0);

  const countdownRef = useRef(null);

  const IDLE_LIMIT    = 60_000;      // 60 s  — idle on parent page → warn
  const MAX_SESSION   = 3 * 60_000;  // 3 min — walked away mid-navigation → warn
  const WARNING_TIME  = 10;          // 10 s countdown before returning to start

  // Idle + max-session timer. Both call onTimeout which shows the warning modal.
  //   limitMs    — fires if user hasn't touched the parent page for 60 s
  //   maxSessionMs — fires unconditionally after 3 min even if user is on the map
  //                  (handles "walked away while the timer was suspended")
  // No mapContainerRef needed — hook falls back to document.getElementById('map-frame')
  useInactivityTimer({
    enabled: started,
    paused: showInactivityModal,
    limitMs: IDLE_LIMIT,
    maxSessionMs: MAX_SESSION,
    onTimeout: () => {
      setCountdown(WARNING_TIME);
      setRingProgress(0);
      setShowInactivityModal(true);
    },
  });

  // 2. 10-Second Countdown Logic
  useEffect(() => {
    if (showInactivityModal) {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Countdown finished! Return to start screen
            clearInterval(countdownRef.current);
            setShowInactivityModal(false);
            setStarted(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(countdownRef.current);
    }

    return () => clearInterval(countdownRef.current);
  }, [showInactivityModal]);

  // 3. Ring Progress Math
  useEffect(() => {
    const progress = ((WARNING_TIME - countdown) / WARNING_TIME) * 360;
    setRingProgress(progress);
  }, [countdown]);


  return (
    <>
      {!started && !onDashboard && (
        <StartOverlay onStart={() => setStarted(true)} />
      )}

      {/* 🟦 Provide UI assets to the entire app */}
      <UIAssetsContext.Provider value={uiAssets}>
        {allowContent && <Header />}
        {allowContent && <PageLayout />}

        {/* ========================================= */}
        {/* INACTIVITY OVERLAY & MODAL                */}
        {/* ========================================= */}
        {showInactivityModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999
            }}
          >
            {/* 1. SIBLING BACKGROUND DIMMER: Keeps the text sharp! */}
            <div 
              className='inactivity-dim' 
              style={{ position: 'absolute', inset: 0, zIndex: 0 }}
            ></div>

            {/* 2. THE MODAL BOX */}
            <div
              className='modal-box inactivity-modal-enter'
              style={{ 
                width: '90%',        // <--- FIX: Forces it to not be skinny!
                maxWidth: '420px', 
                textAlign: 'center',
                position: 'relative',
                zIndex: 1            // <--- Places it above the dimmer
              }}
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
              
              <h2>Are You Still Here?</h2>
              <p style={{ marginTop: '0.75rem', fontSize: '1.1rem' }}>
                Exiting Session In
              </p>
              
              <div
                className={`countdown-ring ${
                  countdown <= 3
                    ? 'ring-glow-strong'
                    : countdown <= 6
                    ? 'ring-glow'
                    : ''
                }`}
                style={{
                  background: `conic-gradient(var(--uta-orange) ${ringProgress}deg, var(--uta-blue) ${ringProgress}deg)`,
                }}
              >
                <div
                  className={`countdown-ring-inner ${
                    countdown <= 3
                      ? 'text-pulse-strong'
                      : countdown <= 6
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
                Stay
              </button>
              
              <button
                className='btn btn-primary w-full'
                style={{ background: '#d72638' }}
                onClick={() => {
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  setShowInactivityModal(false);
                  setStarted(false);
                }}
              >
                I'm Done
              </button>
            </div>
          </div>
        )}
      </UIAssetsContext.Provider>
    </>
  );
}

export default function App() {
  const [uiAssets, setUIAssets] = useState(null);

  // 🟧 Fetch UI assets ONCE from Django
  useEffect(() => {
    fetch('/api/ui-assets/')
      .then((res) => res.json())
      .then((data) => setUIAssets(data.assets))
      .catch((e) => console.error('Failed to load UI assets', e));
  }, []);

  // 🟧 Update favicon dynamically when assets load
  useEffect(() => {
    if (!uiAssets || !uiAssets['favicon-32x32']) return;

    const link = document.querySelector("link[rel='icon']");
    if (link) link.href = uiAssets['favicon-32x32'];
  }, [uiAssets]);

  // Wait for assets BEFORE showing anything
  if (uiAssets === null) return null; // only block while fetching

  return (
    <Router>
      <AppContent uiAssets={uiAssets} />
    </Router>
  );
}