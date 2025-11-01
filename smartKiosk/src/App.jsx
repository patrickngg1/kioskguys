// App.jsx
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
// import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LoginPage />} />

        {/* DEV MODE: dashboard accessible without auth */}
        <Route path='/dashboard' element={<Dashboard />} />

        {/* When ready to secure again, switch to:
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
    </Router>
  );
}
