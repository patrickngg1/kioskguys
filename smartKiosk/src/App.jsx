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

/**
 * NEW: This component conditionally wraps your pages.
 * - LoginPage gets '.app-layout' (for flex centering).
 * - Dashboard gets '.dashboard-layout' (for scrolling).
 */
function PageLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.includes('dashboard');

  const layoutClass = isDashboard ? 'dashboard-layout' : 'app-layout';

  return (
    <div className={layoutClass}>
      <Routes>
        <Route path='/' element={<LoginPage />} />
        <Route path='/dashboard' element={<Dashboard />} />
      </Routes>
    </div>
  );
}

function AppContent() {
  const [started, setStarted] = useState(false);
  const inactivityTimer = useRef(null);
  const location = useLocation(); // ✅ works with HashRouter too

  // --- Inactivity Timer (overlay only for home screen) ---
  useEffect(() => {
    if (!started) return;

    // ✅ Only activate idle overlay when NOT on dashboard
    const isDashboard = location.pathname.includes('dashboard');
    if (isDashboard) return;

    const resetTimer = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        setStarted(false);
      }, 60000); // 60 seconds
    };

    const events = ['click', 'mousemove', 'keydown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [started, location.pathname]);

  return (
    <>
      {!started && <StartOverlay onStart={() => setStarted(true)} />}
      {started && <Header />}
      {/* UPDATED: Use the new PageLayout component instead of a hard-coded <div> */}
      {started && <PageLayout />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
