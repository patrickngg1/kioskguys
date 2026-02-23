import React, { useContext } from 'react';
import KioskMap from './KioskMap';
import '../styles/Login.css'; // Keep this if it has your layout styles
import '../styles/App.css';
import { UIAssetsContext } from '../App';

export default function MapPage() {
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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100vw'
      }}
    >
      {/* Expanded to take up the full screen now that Auth is gone */}
      <div id='map-container' style={{ width: '90%', height: '85vh', maxWidth: '1200px' }}>
        <KioskMap />
      </div>
    </div>
  );
}