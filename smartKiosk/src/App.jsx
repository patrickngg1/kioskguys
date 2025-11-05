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
import './App.css';

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
      }, 6000); // 60 seconds
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
      {started && (
        <div className='app-layout'>
          <Routes>
            <Route path='/' element={<LoginPage />} />
            <Route path='/dashboard' element={<Dashboard />} />
          </Routes>
        </div>
      )}
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
