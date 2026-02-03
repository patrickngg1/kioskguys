import React from 'react';
import './PremiumModal.css';

export default function PremiumModal({
  isOpen,
  onClose,
  title,
  message,
  actions = [],
  children,
  width = 520, // can be overridden for larger forms
}) {
  if (!isOpen) return null;

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div className='premium-modal-overlay'>
      <div
        className='premium-modal-container'
        style={{ width }}
        onClick={stopPropagation}
      >
        {/* Title */}
        {title && <h2 className='premium-modal-title'>{title}</h2>}

        {/* Message */}
        {message && <p className='premium-modal-message'>{message}</p>}

        {/* Custom content (forms, fields, images, anything) */}
        {children && <div className='premium-modal-body'>{children}</div>}

        {/* Actions */}
        {actions.length > 0 && (
          <div className='premium-modal-actions'>
            {actions.map((btn, i) => (
              <button
                key={i}
                className={`premium-btn ${btn.type || 'default'}`}
                onClick={btn.onClick}
                type='button'
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
