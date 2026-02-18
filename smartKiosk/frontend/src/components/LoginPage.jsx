// src/components/LoginPage.jsx
import React, { useContext } from 'react';
import AuthScreen from './AuthScreen';
import '../styles/Login.css';
import '../styles/App.css';
import { UIAssetsContext } from '../App';

export default function LoginPage() {
  const uiAssets = useContext(UIAssetsContext);

  return (
    <div
      className='app-layout remote-login-layout'
      style={{
        backgroundImage: uiAssets?.['bg-campus']
          ? `url(${uiAssets['bg-campus']})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* New Title with tracking animation */}
      <h1 className="remote-title">Smart Kiosk Remote Login</h1>
      
      {/* Auth section with the slide-in animation applied */}
      <div id='auth-section' className="slide-in-card">
        <AuthScreen />
      </div>
    </div>
  );
}