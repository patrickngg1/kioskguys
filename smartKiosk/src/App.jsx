// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';

import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import StartOverlay from './components/StartOverlay';

import './styles/App.css';

/*
  PageLayout:
  - Controls whether the page uses a "login" layout or "dashboard" layout CSS.
  - Keeps LoginPage and Dashboard cleanly separated.
*/
function PageLayout() {
  const location = useLocation();
  const onDashboard = location.pathname.includes('dashboard');

  const layoutClass = onDashboard ? 'dashboard-layout' : 'app-layout';

  return (
    <div className={layoutClass}>
      <Routes>
        <Route path='/' element={<LoginPage />} />
        <Route path='/dashboard' element={<Dashboard />} />
      </Routes>
    </div>
  );
}

/*
  AppContent:
  - Handles StartOverlay (tap to begin)
  - Handles auto-reset to overlay after inactivity
  - Overlay is only shown on login page, NEVER on dashboard
*/
function AppContent() {
  const [started, setStarted] = useState(false);
  const inactivityTimer = useRef(null);
  const location = useLocation();

  const onDashboard = location.pathname.includes('dashboard');

  // Only show header + content if:
  // - The user tapped Start
  // - OR they are on dashboard
  const allowContent = started || onDashboard;

  /*
    INACTIVITY RESET:
    - Only active on the login screen
    - If user stops interacting, overlay comes back
    - Never resets while on the dashboard
  */
  useEffect(() => {
    if (onDashboard) return; // ignore dashboard
    if (!started) return; // only run after Start is pressed

    const resetTimer = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        setStarted(false); // show overlay again
      }, 60000); // 1 minute
    };

    const events = ['click', 'mousemove', 'keydown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer.current);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [started, onDashboard]);

  return (
    <>
      {/* 🔶 Overlay ONLY on login (never on dashboard) */}
      {!started && !onDashboard && (
        <StartOverlay onStart={() => setStarted(true)} />
      )}

      {/* 🔷 Only show Header + Page content when allowed */}
      {allowContent && <Header />}
      {allowContent && <PageLayout />}
    </>
  );
}

/*
  Root App component:
  - Wraps everything in HashRouter so routing works on kiosk hardware.
*/
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
