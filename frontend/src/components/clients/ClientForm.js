import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useHistory, useParams } from 'react-router-dom';

function ClientForm({ token }) {
  const [client, setClient] = useState({ client_name: '', email: '' });
  const [error, setError] = useState('');
  const history = useHistory();
  const { id } = useParams();

  useEffect(() => {
    if (id && token) {
      const fetchClient = async () => {
        try {
          const response = await api.get(`/clients/${id}`);
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
        await api.put(`/clients/${id}`, client);
      } else {
        await api.post('/clients', client);
      }
      history.push('/clients');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save client');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="client_name">Client Name</label>
        <input
          type="text"
          className="form-control"
          id="client_name"
          name="client_name"
          value={client.client_name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="email">Email (Optional)</label>
        <input
          type="email"
          className="form-control"
          id="email"
          name="email"
          value={client.email}
          onChange={handleChange}
        />
      </div>
      <button type="submit" className="btn btn-primary">
        {id ? 'Update Client' : 'Create Client'}
      </button>
      {error && <div className="alert alert-danger mt-3">{error}</div>}
    </form>
  );
}

export default ClientForm;