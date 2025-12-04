import React from 'react';
import '/src/styles/Dashboard.css'; // uses existing astral-portal styles

export default function AstralLoading({ visible }) {
  return (
    <>
      {visible && (
        <div className='astral-logout-overlay'>
          <div className='astral-portal-card'>
            <div className='portal-orb'>
              <div className='portal-orb-ring outer'></div>
              <div className='portal-orb-ring mid'></div>
              <div className='portal-orb-ring inner'></div>

              <div className='portal-orb-core'>
                <span className='uta-badge'>UTA</span>
              </div>
            </div>

            <div className='logout-message-astral'>
              <span className='logout-message-main'>Loading Map</span>
              <span className='logout-message-sub'>
                Preparing your campus view…
              </span>
            </div>

            <div className='portal-particles'>
              {[...Array(12)].map((_, i) => (
                <span key={i} className={`portal-particle p-${i + 1}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
