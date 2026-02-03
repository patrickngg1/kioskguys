// src/components/Header.jsx
import React, { useEffect, useState, useContext } from 'react';
import { UIAssetsContext } from '../App';

export default function Header() {
  const assets = useContext(UIAssetsContext); // 🔥 access Django images
  const [time, setTime] = useState(() => new Date());

  // update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // choose best available logo
  const utaLogo =
    assets['uta-logo'] ||
    assets['apple-touch-icon'] || // most likely
    assets['favicon-32x32'] ||
    assets['favicon-16x16'];

  const formatTime = (d) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const formatDate = (d) =>
    d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  return (
    <>
      <header className='kiosk-header'>
        <div className='brand-left'>
          {utaLogo ? (
            <img src={utaLogo} className='uta-logo' alt='UTA logo' />
          ) : (
            <div className='uta-logo uta-logo-fallback'>UTA</div>
          )}

          <div className='brand-text'>
            <div className='brand-title'>ERSA Smart Kiosk</div>
            <div className='brand-sub'>Engineering Research South • BLDG A</div>
          </div>
        </div>

        <div className='header-center'>
          <span className='welcome-msg'>Welcome, Maverick!</span>
        </div>

        <div className='brand-right'>
          <div className='kiosk-date'>{formatDate(time)}</div>
          <div className='kiosk-time'>{formatTime(time)}</div>
        </div>
      </header>

      {/* Accent bar */}
      <div className='kiosk-accent' />
    </>
  );
}
