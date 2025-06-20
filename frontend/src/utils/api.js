import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

export const fetchClients = async (token, search, sortBy, sortOrder) => {
  return axios.get(`${API_BASE_URL}/clients`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { search, sortBy, sortOrder }
  });
};

// Add more API calls for contracts, auth, etc. later