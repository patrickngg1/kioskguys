// src/components/RequestSupply.jsx
// Light modal wrapper: all popularity / sorting logic is handled
// by Dashboard via the renderSection(categoryName, items) callback.

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
      {/* SUPPLIES MODAL */}
      <div className='modal-overlay' onClick={onClose}>
        <div
          className='modal-box large'
          onClick={(e) => e.stopPropagation()}
          onScroll={(e) => {
            const el = e.currentTarget;
            const stickyBar = el.querySelector('.submit-request-sticky');
            if (!stickyBar) return;

            const atTop = el.scrollTop === 0;
            const atBottom =
              el.scrollHeight - el.scrollTop <= el.clientHeight + 1;

            if (!atTop && !atBottom) stickyBar.classList.add('scrolling');
            else stickyBar.classList.remove('scrolling');
          }}
        >
          <button className='close-btn' onClick={onClose}>
            ✕
          </button>

          <h2>Request Supplies</h2>
          <p className='supply-hint'>
            Tap on pictures to select items. Frequently requested items appear
            at the top of each section.
          </p>

          {/* Dynamically render ALL categories from the backend */}
          {Object.entries(itemsByCategory).map(([categoryName, items]) =>
            renderSection(categoryName, items)
          )}

          <div className='submit-request-sticky'>
            <button
              onClick={submitSupplies}
              className={`btn btn-primary w-full mt-2 ${
                selectedSupplies.length > 0 ? 'active-glow' : ''
              }`}
            >
              {selectedSupplies.length > 0
                ? `Submit Request (${selectedSupplies.length} item${
                    selectedSupplies.length > 1 ? 's' : ''
                  })`
                : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default RequestSupply;
