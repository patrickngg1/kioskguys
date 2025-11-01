// LoginPage.jsx
import React from 'react';
import KioskMap from './KioskMap';
import AuthScreen from './AuthScreen';
import '../App.css'; // ensure global styles load

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
