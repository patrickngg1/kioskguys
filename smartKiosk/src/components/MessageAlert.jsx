import React from 'react';

/**
 * Displays a message alert with color-coded background based on type.
 * @param {object} props - The component props.
 * @param {string} props.text - The message content.
 * @param {'success' | 'error' | 'info'} props.type - The type of message.
 */
const MessageAlert = ({ text, type }) => {
  if (!text) {
    return null; // Don't render if there's no message
  }

  let classes = 'mb-4 message-box p-3 rounded-lg text-sm font-medium ';

  // Set Tailwind classes based on the message type
  switch (type) {
    case 'success':
      classes += 'bg-green-100 text-green-800 border border-green-300';
      break;
    case 'error':
      classes += 'bg-red-100 text-red-800 border border-red-300';
      break;
    case 'info':
      classes += 'bg-blue-100 text-blue-800 border border-blue-300';
      break;
    default:
      classes += 'bg-gray-100 text-gray-800';
  }

  return (
    <div id='message-container' className={classes}>
      {text}
    </div>
  );
};

export default MessageAlert;
