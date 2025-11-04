// App.jsx
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import Header from './components/Header'; // 🆕 Import the new header
// import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

export default function App() {
  return (
    <Router>
      {/* 🧭 Persistent kiosk header */}
      <Header />

      {/* Wrap all page views in app-layout so they render below header */}
      <div className='app-layout'>
        <Routes>
          <Route path='/' element={<LoginPage />} />

          {/* DEV MODE: dashboard accessible without auth */}
          <Route path='/dashboard' element={<Dashboard />} />

          {/* 🔒 When ready to secure again, switch to ProtectedRoute:
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          */}
        </Routes>
      </div>
    </Router>
  );
}
