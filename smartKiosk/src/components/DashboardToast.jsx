import React from 'react';
import BaseToast from './BaseToast';

export default function DashboardToast({ type, message, onClose }) {
  return (
    <BaseToast
      type={type}
      message={message}
      onClose={onClose}
      position='bottom-right'
      duration={3800}
    />
  );
}
