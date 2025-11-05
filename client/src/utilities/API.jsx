// This is the base URL of our Node.js server
const BASE_URL = 'http://localhost:5000'; // Make sure this matches your server's port


const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};


export const registerUser = async (username, password) => {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(response);
};

export const loginUser = async (username, password) => {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(response);
};
