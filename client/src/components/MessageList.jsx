import { useRef, useEffect } from 'react';



function MessageList({ messages, myId, myDbId }) {

  const bottomRef = useRef(null);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  return (
    <>
      {messages.map((msg) => {
       
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

   
  const isMe = msg.senderDbId && myDbId ? msg.senderDbId === myDbId : msg.senderId === myId;
        const isPrivate = msg.isPrivate;

        
        const bubbleClass = isMe
          ? 'bg-blue-600 text-white rounded-br-none' 
          : 'bg-gray-700 text-gray-200 rounded-bl-none'; 

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
         
              {!isMe && (
                <strong className="text-sm block">
                  {msg.sender}
                  {isPrivate && ' (whisper)'}
                </strong>
              )}
            
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

      <div ref={bottomRef} />
    </>
  );
}

export default MessageList;

