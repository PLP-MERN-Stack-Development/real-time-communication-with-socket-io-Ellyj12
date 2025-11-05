import { useState } from 'react';


function JoinChat({ setUsername, connect }) {

  const [localUser, setLocalUser] = useState('');

  
  const handleSubmit = (e) => {
    e.preventDefault(); 
    const trimmedUser = localUser.trim();

    if (trimmedUser) {
  
      setUsername(trimmedUser);
  
      connect(trimmedUser);
    }
  };

  return (
  
    <div className="w-full h-full flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6">
          Join Real-Time Chat
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Enter your display name
            </label>
            <input
              type="text"
              id="username"
              value={localUser}
              onChange={(e) => setLocalUser(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Alice"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out"
          >
            Join Chat
          </button>
        </form>
      </div>
    </div>
  );
}

export default JoinChat;
