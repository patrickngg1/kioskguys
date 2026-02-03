// App.jsx
import React, { useState, useEffect, useRef, createContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';

import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import StartOverlay from './components/StartOverlay';
import './styles/App.css';
import './styles/Glass.css';

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
        <Route path='/dashboard' element={<Dashboard />} />
      </Routes>
    </div>
  );
}

function AppContent({ uiAssets }) {
  const [started, setStarted] = useState(false);
  const inactivityTimer = useRef(null);
  const location = useLocation();

  const onDashboard = location.pathname.includes('dashboard');
  const allowContent = started || onDashboard;

  // Inactivity overlay logic (unchanged)
  useEffect(() => {
    if (onDashboard) return;
    if (!started) return;

    const resetTimer = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        setStarted(false);
      }, 60000);
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
      {!started && !onDashboard && (
        <StartOverlay onStart={() => setStarted(true)} />
      )}

      {/* 🟦 Provide UI assets to the entire app */}
      <UIAssetsContext.Provider value={uiAssets}>
        {allowContent && <Header />}
        {allowContent && <PageLayout />}
      </UIAssetsContext.Provider>
    </>
  );
}

export default function App() {
  const [uiAssets, setUIAssets] = useState(null);

  
  // 🟧 Fetch UI assets ONCE from Django
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL;
    fetch(`${API}/api/ui-assets/`)
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
