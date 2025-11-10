import React, { useState, useEffect } from 'react';
import '../styles/App.css';

export default function StartOverlay({ onStart }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [fadeIn, setFadeIn] = useState(true); // 🆕 new state for fade-in animation

  useEffect(() => {
    // Trigger the fade-in animation once the overlay mounts
    const timer = setTimeout(() => setFadeIn(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    setFadeOut(true);
    setTimeout(() => {
      onStart();
    }, 600);
  };

  return (
    <div
      className={`start-overlay ${fadeOut ? 'fade-out' : ''} ${
        fadeIn ? 'fade-in' : ''
      }`}
      onClick={handleClick}
    >
      <div className='start-text'>
        <span>Tap to Begin</span>
      </div>
    </div>
  );
}
