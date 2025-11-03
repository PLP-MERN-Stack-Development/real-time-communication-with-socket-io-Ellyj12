import { useState } from 'react';
import { useSocket } from '../socket/socket';
import UserList from '../components/UserList';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import TypingIndicator from '../components/TypingIndicator';

// This is the main layout of the chat application.
// It brings together all the other components.

function ChatInterface({ username }) {
  // We call the hook again here to get all the data and functions
  const {
    socket,
    messages,
    users,
    typingUsers,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    disconnect,
    privateMessages,
    clearUnread,
    myDbId,
    joinChannel,
    currentChannel,
  } = useSocket();

  // This state tracks who the user is privately messaging.
  // `null` means public chat.
  // An object (e.g., { id: '...', username: '...' }) means private.
  const [pmRecipient, setPmRecipient] = useState(null);

  const handleSetPmRecipient = (user) => {
    setPmRecipient(user);
    if (user && user.dbId) {
      clearUnread(user.dbId);
    }
  };

  // We'll use a 3-column layout.
  // Sidebar | Main Chat | (empty space)
  // We use h-screen and overflow-hidden to make it fill the page
  // without scrolling the whole page.
  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md z-10">
        <h1 className="text-xl font-bold">Welcome, {username}</h1>
        <button
          onClick={disconnect}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          Logout
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex overflow-hidden">
        {/* User List Sidebar */}
          <aside className="w-1/4 bg-gray-800 p-4 overflow-y-auto">
          <UserList
            users={users}
            myId={socket.id}
            setPmRecipient={handleSetPmRecipient}
            pmRecipient={pmRecipient}
            privateMessages={privateMessages}
          />
        </aside>

        {/* Chat Area */}
        <main className="flex-grow flex flex-col bg-gray-900">
          {/* Channel selector */}
          <div className="bg-gray-800 p-2 flex gap-2 items-center">
            {['general', 'random', 'tech'].map((ch) => (
              <button
                key={ch}
                onClick={() => { setPmRecipient(null); joinChannel(ch); }}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  currentChannel === ch ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                #{ch}
              </button>
            ))}
          </div>
          {/* Private Message Indicator */}
          {pmRecipient && (
            <div className="bg-purple-800 text-white p-2 text-center text-sm shadow-inner">
              Whispering to <strong>{pmRecipient.username}</strong>
              <button
                onClick={() => setPmRecipient(null)}
                className="ml-2 text-gray-300 hover:text-white font-bold"
              >
                [Chat Publicly]
              </button>
            </div>
          )}

          {/* Message List */}
          <div className="flex-grow p-4 overflow-y-auto">
            {/* If in a private conversation, show that conversation's messages */}
            {pmRecipient ? (
              <MessageList
                messages={privateMessages[pmRecipient.dbId]?.messages || []}
                myId={socket.id}
                myDbId={myDbId}
              />
            ) : (
              <MessageList messages={messages} myId={socket.id} myDbId={myDbId} />
            )}
          </div>

          {/* Typing Indicator */}
          <div className="h-6 px-4">
            <TypingIndicator typingUsers={typingUsers} />
          </div>

          {/* Message Input */}
          <div className="p-4 bg-gray-800">
            <MessageInput
              setTyping={setTyping}
              sendMessage={sendMessage}
              sendPrivateMessage={sendPrivateMessage}
              pmRecipient={pmRecipient}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default ChatInterface;
