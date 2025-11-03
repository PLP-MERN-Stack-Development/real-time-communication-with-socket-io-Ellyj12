import { useState, useEffect } from 'react';
import { useSocket } from './socket/socket';
import AuthPage from './components/authPage'; // IMPORT AuthPage
import ChatInterface from './components/ChatInterface';

function App() {
  // Get connection status and functions from our hook
  // We add 'disconnect' here for our logout button
  const { isConnected, connect, disconnect } = useSocket();

  // We still store username, but it can be set by AuthPage or localStorage
  const [username, setUsername] = useState('');

  // --- NEW: Auto-login on page load ---
  useEffect(() => {
    // Check if a token and username exist in storage
    const token = localStorage.getItem('chat-token');
    const storedUsername = localStorage.getItem('chat-username');

    if (token && storedUsername) {
      // If they exist, set the username in our state...
      setUsername(storedUsername);
      // ...and try to connect. The hook will handle sending the token.
      connect();
    }
    // We only want this to run once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW: Create a wrapper for the disconnect function to pass to the UI
  const handleLogout = () => {
    disconnect();
    // We also clear the username state, which guarantees
    // the AuthPage will be shown next.
    setUsername('');
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white">
      {!isConnected ? (
        // --- UPDATED: Render AuthPage instead of JoinChat ---
        <AuthPage setAppUsername={setUsername} connect={connect} />
      ) : (
        // --- UPDATED: Pass the handleLogout function down ---
        <ChatInterface username={username} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;

