// src/components/RequestSupply.jsx
import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';

function RequestSupply({
  isOpen,
  onClose,
  itemsByCategory,
  selectedSupplies,
  submitSupplies,
  renderSection,
  setSelectedSupplies, // ✅ Need this to clear selection on close
}) {
  // 'idle' | 'loading' | 'success' | 'error'
  const [btnState, setBtnState] = useState('idle');
  const [lockedItems, setLockedItems] = useState([]);
  // Reset button when modal opens
  useEffect(() => {
    if (isOpen) setBtnState('idle');
  }, [isOpen]);

  const handleSmartSubmit = async () => {
    if (btnState !== 'idle') return;

    // 1. Start Loading
    setBtnState('loading');

    // 2. Call Parent API
    const success = await submitSupplies();

    if (success) {
      // 3. Success Animation
      setBtnState('success');

      // 4. Wait 1.5s for user to appreciate the premium green button, then close
      setTimeout(() => {
        onClose();
        // Clear selection nicely
        if (setSelectedSupplies) setSelectedSupplies([]);
      }, 1600);
    } else {
      // 5. Error (Revert to idle so they can try again)
      setBtnState('idle');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className='modal-overlay'>
        <div
          className='modal-box reserve-box fixed-layout request-supply'
          onClick={(e) => e.stopPropagation()}
        >
          {/* --- FIXED HEADER --- */}
          <div className='modal-header-fixed'>
            <button
              className='close-btn'
              onClick={onClose}
              disabled={btnState === 'loading' || btnState === 'success'}
            >
              ✕
            </button>
            <h2>Request Supplies</h2>
            <p className='supply-hint'>
              Tap on pictures to select items. Popular items appear first.
            </p>
          </div>

          {/* --- SCROLLABLE BODY --- */}
          <div
            className='modal-scroll-content'
            onScroll={(e) => {
              const el = e.currentTarget;
              const stickyBar = el.querySelector('.submit-request-sticky');
              if (stickyBar) {
                const atBottom =
                  el.scrollHeight - el.scrollTop <= el.clientHeight + 5;
                if (!atBottom && el.scrollTop > 0)
                  stickyBar.classList.add('scrolling');
                else stickyBar.classList.remove('scrolling');
              }
            }}
          >
            <div className='supply-grid-wrapper'>
              {Object.entries(itemsByCategory).map(([categoryName, items]) =>
                renderSection(categoryName, items)
              )}
            </div>

            {/* --- PREMIUM SMART BUTTON --- */}
            <div className='submit-request-sticky'>
              <button
                onClick={handleSmartSubmit}
                disabled={selectedSupplies.length === 0 || btnState !== 'idle'}
                className={`btn btn-primary w-full mt-2 smart-submit-btn ${btnState} ${
                  selectedSupplies.length > 0 && btnState === 'idle'
                    ? 'active-glow'
                    : ''
                }`}
              >
                {/* 1. IDLE TEXT */}
                <span
                  className={`btn-text-layer ${
                    btnState === 'idle' ? 'visible' : ''
                  }`}
                >
                  {selectedSupplies.length > 0
                    ? `Submit Request (${selectedSupplies.length} item${
                        selectedSupplies.length > 1 ? 's' : ''
                      })`
                    : 'Select Items to Submit'}
                </span>

                {/* 2. LOADING SPINNER */}
                <span
                  className={`btn-text-layer ${
                    btnState === 'loading' ? 'visible' : ''
                  }`}
                >
                  <span className='spinner-loader'></span>
                  Sending...
                </span>

                {/* 3. SUCCESS MESSAGE */}
                <span
                  className={`btn-text-layer ${
                    btnState === 'success' ? 'visible' : ''
                  }`}
                >
                  <svg
                    className='checkmark-icon'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='3.5'
                  >
                    <path
                      d='M5 13l4 4L19 7'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                  Request Sent
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default RequestSupply;
