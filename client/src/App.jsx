import { useState, useEffect } from 'react';
import { useSocket } from './socket/socket';
import AuthPage from './components/authPage'; // IMPORT AuthPage
import ChatInterface from './components/ChatInterface';

function App() {

  const { isConnected, connect, disconnect } = useSocket();


  const [username, setUsername] = useState('');


  useEffect(() => {
   
    const token = localStorage.getItem('chat-token');
    const storedUsername = localStorage.getItem('chat-username');

    if (token && storedUsername) {
      
      setUsername(storedUsername);
      
      connect();
    }
    
  }, []);

  
  const handleLogout = () => {
    disconnect();
    
    setUsername('');
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white">
      {!isConnected ? (
        
        <AuthPage setAppUsername={setUsername} connect={connect} />
      ) : (
        
        <ChatInterface username={username} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;

