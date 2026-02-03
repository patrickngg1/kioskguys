import React from 'react';
import '../styles/PremiumInput.css';

export default function PremiumInput({
  as = 'input',
  type = 'text',
  value,
  onChange,
  placeholder,
  children,
  className = '',
  ...rest
}) {
  // INPUT (void element — no children allowed)
  if (as === 'input') {
    return (
      <div className='premium-input-wrapper'>
        <input
          className={`premium-input-field ${className}`}
          type={type}
          value={type === 'file' ? undefined : value}
          placeholder={placeholder}
          onChange={onChange}
          {...rest}
        />
      </div>
    );
  }

  // SELECT or TEXTAREA (children allowed)
  const Component = as;

  return (
    <div className='premium-input-wrapper'>
      <Component
        className={`premium-input-field ${className}`}
        value={value}
        onChange={onChange}
        {...rest}
      >
        {children}
      </Component>
    </div>
  );
}
