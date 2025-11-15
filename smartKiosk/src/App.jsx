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
        <Route path='/dashboard' element={<Dashboard />} />
      </Routes>
    </div>
  );
}

function AppContent() {
  const [started, setStarted] = useState(false);
  const inactivityTimer = useRef(null);
  const location = useLocation();

  const onDashboard = location.pathname.includes('dashboard');
  // ✅ Render content if user has started OR we’re on dashboard
  const allowContent = started || onDashboard;

  // ✅ Inactivity overlay only on login route (never blank the dashboard)
  useEffect(() => {
    if (onDashboard) return; // do nothing on dashboard
    if (!started) return; // only run timer when overlay is dismissed

    const resetTimer = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        setStarted(false); // bring overlay back on login
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
      {/* 🟧 Overlay only on login (never on dashboard) */}
      {!started && !onDashboard && (
        <StartOverlay onStart={() => setStarted(true)} />
      )}

      {/* 🟩 Header + content render when started OR on dashboard */}
      {allowContent && <Header />}
      {allowContent && <PageLayout />}
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
