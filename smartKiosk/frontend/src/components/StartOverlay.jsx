// src/components/StartOverlay.jsx
import React, { useState, useEffect } from 'react';
import '../styles/App.css';

export default function StartOverlay({ onStart }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    fetch('/api/banners/active/')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.banners)) {
          setBanners(data.banners);
        }
      })
      .catch(() => {});

    const timer = setTimeout(() => setFadeIn(false), 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners]);

  // src/components/StartOverlay.jsx

  return (
    <div
      className={`start-overlay ${fadeOut ? 'fade-out' : ''} ${
        fadeIn ? 'fade-in' : ''
      }`}
      style={
        banners.length > 0
          ? {
              backgroundImage: `url(${banners[activeIndex].image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'background-image 1.2s cubic-bezier(0.4, 0, 0.2, 1)', // Smoother transition
            }
          : undefined
      }
      onClick={(e) => {
        if (e.target.closest('.start-qr-glass-plate')) return;
        setFadeOut(true);
        setTimeout(() => onStart(), 800);
      }}
    >
      {/* 1. CINEMATIC VIGNETTE (Ensures text/QR always pops) */}
      <div className='start-vignette-layer'></div>
      {/* 2. THE TEXT STAGE */}
      {/* src/components/StartOverlay.jsx */}

      <div
        className={`start-text-stage ${
          banners.length > 0 ? 'at-bottom' : 'at-center'
        }`}
      >
        {/* The Luxury Flash Element */}
        <div className='glass-light-sweep'></div>

        <div className='text-pulsar'>
          <h1 className='tap-to-begin-quantum'>Tap to Begin</h1>
        </div>
      </div>
      {/* 3. FLOATING GLASS QR PLATE */}
      {banners[activeIndex]?.link && (
        <div className='start-qr-glass-plate'>
          <div className='qr-glass-glow'></div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
              banners[activeIndex].link
            )}`}
            alt='Scan'
            className='qr-etched-image'
          />
          <span className='qr-glass-label'>SCAN FOR INFO</span>
        </div>
      )}
    </div>
  );
}
