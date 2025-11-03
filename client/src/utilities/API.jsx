// This is the base URL of our Node.js server
const BASE_URL = 'http://localhost:5000'; // Make sure this matches your server's port

/**
 * A helper function to handle API responses.
 * @param {Response} response - The fetch response object.
 * @returns {Promise<object>} - The JSON data from the response.
 * @throws {Error} - Throws an error if the response is not ok.
 */
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    // If the server sent an error message, use it. Otherwise, use a default.
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};

/**
 * Registers a new user.
 * @param {string} username - The username.
 * @param {string} password - The password.
 * @returns {Promise<object>} - The user object and token.
 */
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

/**
 * Logs in an existing user.
 * @param {string} username - The username.
 * @param {string} password - The password.
 * @returns {Promise<object>} - The user object and token.
 */
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
