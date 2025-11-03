import React, { useRef, useEffect } from 'react';

// This component renders the scrolling list of messages.
// It receives:
// - messages: The array of message objects from the hook.
// - myId: The current user's socket ID, to style their own messages.

function MessageList({ messages, myId, myDbId }) {
  // We use a ref to point to an empty div at the bottom of the list.
  const bottomRef = useRef(null);

  // This effect runs every time the 'messages' array changes.
  // It smoothly scrolls the 'bottomRef' into view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // We use a React Fragment (<>) instead of a div.
  // This lets the parent component (ChatInterface.jsx) control the
  // list's layout (like spacing, padding, etc.) directly.
  return (
    <>
      {messages.map((msg) => {
        // --- System Messages (Join/Left) ---
        if (msg.system) {
          return (
            <div
              key={msg.id}
              className="text-center text-sm text-gray-500 italic"
            >
              {msg.message}
            </div>
          );
        }

        // --- User Chat Messages ---
  // Prefer comparing DB ids for reliability (socket ids change).
  const isMe = msg.senderDbId && myDbId ? msg.senderDbId === myDbId : msg.senderId === myId;
        const isPrivate = msg.isPrivate;

        // Conditional classes for styling
        const bubbleClass = isMe
          ? 'bg-blue-600 text-white rounded-br-none' // My message
          : 'bg-gray-700 text-gray-200 rounded-bl-none'; // Their message

        const alignmentClass = isMe ? 'self-end' : 'self-start';

        const privateClass = isPrivate
          ? 'border-l-4 border-purple-500'
          : '';

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${alignmentClass} max-w-xs md:max-w-md`}
          >
            <div
              className={`py-2 px-4 rounded-lg shadow-md ${bubbleClass} ${privateClass}`}
            >
              {/* Show sender name if it's not me */}
              {!isMe && (
                <strong className="text-sm block">
                  {msg.sender}
                  {isPrivate && ' (whisper)'}
                </strong>
              )}
              {/* Message content */}
              <p>{msg.message}</p>
              {/* Timestamp */}
              <span className="text-xs text-gray-400 block text-right mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        );
      })}

      {/* This empty div is the target for our auto-scroll */}
      <div ref={bottomRef} />
    </>
  );
}

export default MessageList;

