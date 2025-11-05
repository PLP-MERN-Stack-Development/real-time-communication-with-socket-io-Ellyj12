import  { useState, useRef } from 'react';


function MessageInput({ setTyping, sendMessage, sendPrivateMessage, pmRecipient }) {

  const [text, setText] = useState('');

 
  const typingTimeoutRef = useRef(null);


  const handleInputChange = (e) => {
    setText(e.target.value);

   
    setTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

  
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

 
  const handleSubmit = (e) => {
    e.preventDefault();

    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);

    if (text.trim()) {
      if (pmRecipient) {

        sendPrivateMessage(pmRecipient.id, text);
      } else {
     
        sendMessage(text);
      }

  
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

