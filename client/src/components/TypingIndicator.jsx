import React from 'react';



function TypingIndicator({ typingUsers }) {
  
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  let text = '';
  if (typingUsers.length === 1) {
    text = `${typingUsers[0]} is typing...`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
  } else {
    
    const others = typingUsers.length - 2;
    text = `${typingUsers[0]}, ${typingUsers[1]}, and ${others} other${
      others > 1 ? 's' : ''
    } are typing...`;
  }

  return <div className="text-sm text-gray-400 italic">{text}</div>;
}

export default TypingIndicator;
