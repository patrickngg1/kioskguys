// LoginPage.jsx
import React from 'react';
import KioskMap from './KioskMap';
import AuthScreen from './AuthScreen';
import '../styles/Login.css';
import '../styles/App.css';

export default function LoginPage() {
  return (
    <div className='app-layout'>
      {/* LEFT: Map section */}
      <div id='map-container'>
        <KioskMap />
      </div>

      {/* RIGHT: Auth section */}
      <div id='auth-section'>
        <AuthScreen />
      </div>
    </div>
  );
}
