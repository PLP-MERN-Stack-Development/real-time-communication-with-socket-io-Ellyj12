import { useState } from 'react';
import { registerUser, loginUser } from '../utilities/API';


function AuthPage({ setAppUsername, connect }) {

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');


  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let data;
      if (isLoginMode) {
      
        data = await loginUser(username, password);
      } else {
       
        data = await registerUser(username, password);
      }

      
      localStorage.setItem('chat-token', data.token);
      localStorage.setItem('chat-username', data.username);

   
      setAppUsername(data.username);

  
      connect();

    } catch (err) {
     
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode((prevMode) => !prevMode);
    setError(null); 
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isLoginMode ? 'Login' : 'Register'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          
          {error && (
            <div className="bg-red-800 border border-red-700 text-white px-4 py-2 rounded-md mb-4 text-center">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : (isLoginMode ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-sm text-blue-400 hover:underline"
            disabled={isLoading}
          >
            {isLoginMode
              ? "Don't have an account? Register"
              : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
