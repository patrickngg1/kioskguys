// src/components/LoginPage.jsx
import React, { useContext } from 'react';
import KioskMap from './KioskMap';
import AuthScreen from './AuthScreen';
import '../styles/Login.css';
import '../styles/App.css';
import { UIAssetsContext } from '../App';

export default function LoginPage() {
  const uiAssets = useContext(UIAssetsContext);

  return (
    <div
      className='app-layout'
      style={{
        backgroundImage: uiAssets?.['bg-campus']
          ? `url(${uiAssets['bg-campus']})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div id='map-container'>
        <KioskMap />
      </div>

      <div id='auth-section'>
        <AuthScreen />
      </div>
    </div>
  );
}
