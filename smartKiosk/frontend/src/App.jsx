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
  const location = useLocation();

  return (
    <>
      {/* 🟦 Provide UI assets to the entire app */}
      <UIAssetsContext.Provider value={uiAssets}>
        {<Header />}
        {<PageLayout />}
      </UIAssetsContext.Provider>
    </>
  );
}

export default function App() {
  const [uiAssets, setUIAssets] = useState(null);

  
  // 🟧 Fetch UI assets ONCE from Django
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL.replace(/\/$/, "");
    fetch(`${API}/api/ui-assets/`)
      .then((res) => res.json())
      .then((data) => setUIAssets(data.assets))
      .catch((e) => console.error('Failed to load UI assets', e));
      
  }, []);

  // 🟧 Update favicon dynamically when assets load
  useEffect(() => {
    if (!uiAssets?.["favicon-32x32"]) return;

    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = uiAssets["favicon-32x32"];
  }, [uiAssets]);

  // Wait for assets BEFORE showing anything
  if (uiAssets === null) return null; // only block while fetching

  return (
    <Router>
      <AppContent uiAssets={uiAssets} />
    </Router>
  );
}
