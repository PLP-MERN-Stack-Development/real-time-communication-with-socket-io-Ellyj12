import React from 'react';

// This component renders the "is typing" message.
// It receives:
// - typingUsers: An array of *usernames* (strings) from the hook.

function TypingIndicator({ typingUsers }) {
  // If no one is typing, render nothing.
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  // Format the text based on the number of typing users
  let text = '';
  if (typingUsers.length === 1) {
    text = `${typingUsers[0]} is typing...`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
  } else {
    // More than 2
    const others = typingUsers.length - 2;
    text = `${typingUsers[0]}, ${typingUsers[1]}, and ${others} other${
      others > 1 ? 's' : ''
    } are typing...`;
  }

  return <div className="text-sm text-gray-400 italic">{text}</div>;
}

export default TypingIndicator;
