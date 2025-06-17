import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ClientList({ token }) {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchClients = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/clients', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClients(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch clients');
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [token]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setLoading(true);
      try {
        await axios.delete(`http://localhost:3000/api/clients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClients(clients.filter(client => client.client_id !== id));
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete client');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Clients</h2>
      <Link to="/clients/new">Add New Client</Link>
      {clients.length === 0 ? (
        <p>No clients found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Dedicated Number</th>
              <th>Orders</th>
              <th>Renewals</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.client_id}>
                <td data-label="Name">{client.client_name}</td>
                <td data-label="Dedicated Number">{client.dedicated_number}</td>
                <td data-label="Orders">{client.no_of_orders}</td>
                <td data-label="Renewals">{client.no_of_renew}</td>
                <td data-label="Actions">
                  <Link to={`/clients/${client.client_id}/edit`}>Edit</Link> | 
                  <button onClick={() => handleDelete(client.client_id)} disabled={loading}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ClientList;