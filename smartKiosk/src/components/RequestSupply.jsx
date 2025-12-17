// src/components/RequestSupply.jsx
import React from 'react';
import '../styles/dashboard.css';

function RequestSupply({
  isOpen,
  onClose,
  itemsByCategory,
  selectedSupplies,
  submitSupplies,
  renderSection,
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className='modal-overlay'>
        {/* 'fixed-layout' class is key here for the CSS to work */}
        <div
          className='modal-box large fixed-layout'
          onClick={(e) => e.stopPropagation()}
        >
          {/* --- FIXED HEADER (Stays on top) --- */}
          <div className='modal-header-fixed'>
            <button className='close-btn' onClick={onClose}>
              ✕
            </button>
            <h2>Request Supplies</h2>
            <p className='supply-hint'>
              Tap on pictures to select items. Frequently requested items appear
              at the top.
            </p>
          </div>

          {/* --- SCROLLABLE BODY --- */}
          <div
            className='modal-scroll-content'
            onScroll={(e) => {
              const el = e.currentTarget;
              const stickyBar = el.querySelector('.submit-request-sticky');
              // Toggles a shadow class on the footer when user scrolls
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
              {/* Render Categories */}
              {Object.entries(itemsByCategory).map(([categoryName, items]) =>
                renderSection(categoryName, items)
              )}
            </div>

            {/* Sticky Footer (Sticks to bottom of the scroll view) */}
            <div className='submit-request-sticky'>
              <button
                onClick={submitSupplies}
                disabled={selectedSupplies.length === 0}
                className={`btn btn-primary w-full mt-2 ${
                  selectedSupplies.length > 0 ? 'active-glow' : ''
                }`}
              >
                {selectedSupplies.length > 0
                  ? `Submit Request (${selectedSupplies.length} item${
                      selectedSupplies.length > 1 ? 's' : ''
                    })`
                  : 'Select Items to Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default RequestSupply;
