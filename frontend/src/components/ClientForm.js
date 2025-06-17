import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useHistory, useParams } from 'react-router-dom';

function ClientForm({ token }) {
  const [client, setClient] = useState({
    client_name: '',
    dedicated_number: '',
    no_of_orders: 0,
    no_of_renew: 0
  });
  const [error, setError] = useState('');
  const history = useHistory();
  const { id } = useParams();

  useEffect(() => {
    if (id && token) {
      const fetchClient = async () => {
        try {
          const response = await axios.get(`http://localhost:3000/api/clients/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setClient(response.data);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to fetch client');
        }
      };
      fetchClient();
    }
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setClient(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (id) {
        await axios.put(`http://localhost:3000/api/clients/${id}`, client, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://localhost:3000/api/clients', client, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      history.push('/clients');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save client');
    }
  };

  return (
    <div>
      <h2>{id ? 'Edit Client' : 'New Client'}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="client_name"
          placeholder="Client Name"
          value={client.client_name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="dedicated_number"
          placeholder="Dedicated Number"
          value={client.dedicated_number}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="no_of_orders"
          placeholder="Number of Orders"
          value={client.no_of_orders}
          onChange={handleChange}
          min="0"
          required
        />
        <input
          type="number"
          name="no_of_renew"
          placeholder="Number of Renewals"
          value={client.no_of_renew}
          onChange={handleChange}
          min="0"
          required
        />
        <button type="submit">Save</button>
      </form>
    </div>
  );
}

export default ClientForm;