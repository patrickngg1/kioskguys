import React from 'react';
import KioskMap from './KioskMap';
import AuthScreen from './AuthScreen';
import '../styles/Login.css';
import '../styles/App.css';

export default function LoginPage() {
  return (
    <div className='app-layout'>
      <div id='map-container'>
        <KioskMap />
      </div>

      <div id='auth-section'>
        <AuthScreen />
      </div>
    </div>
  );
}
