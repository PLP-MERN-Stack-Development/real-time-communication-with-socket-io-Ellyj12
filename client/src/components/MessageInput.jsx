import React, { useState, useRef } from 'react';

// This component renders the text input form at the bottom.
// It receives:
// - setTyping: Function from the hook to emit typing events.
// - sendMessage: Function from the hook to send a public message.
// - sendPrivateMessage: Function from the hook to send a private message.
// - pmRecipient: The current PM target (null for public chat).

function MessageInput({ setTyping, sendMessage, sendPrivateMessage, pmRecipient }) {
  // Local state to control the input field
  const [text, setText] = useState('');

  // We use a ref to manage the "stop typing" timeout
  const typingTimeoutRef = useRef(null);

  // This runs on every keystroke
  const handleInputChange = (e) => {
    setText(e.target.value);

    // 1. Emit "start typing"
    setTyping(true);

    // 2. Clear any existing "stop" timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // 3. Set a new timer to emit "stop typing" after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  // This runs when the form is submitted
  const handleSubmit = (e) => {
    e.preventDefault();

    // Stop any "stop typing" timer and emit "stop" immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);

    // Only send if the message isn't just empty spaces
    if (text.trim()) {
      if (pmRecipient) {
        // --- Send a Private Message ---
        // The hook expects the recipient's ID and the message text
        sendPrivateMessage(pmRecipient.id, text);
      } else {
        // --- Send a Public Message ---
        // The hook expects just the message text
        sendMessage(text);
      }

      // Clear the input field
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-3">
      <input
        type="text"
        value={text}
        onChange={handleInputChange}
        placeholder={
          pmRecipient
            ? `Whisper to ${pmRecipient.username}...`
            : 'Type your message...'
        }
        className="flex-grow bg-gray-700 text-white border border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
      >
        Send
      </button>
    </form>
  );
}

export default MessageInput;

