import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ClientList({ token }) {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('no_of_orders');
  const [sortOrder, setSortOrder] = useState('desc');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    if (!token) return;
    const fetchClients = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/clients', {
          headers: { Authorization: `Bearer ${token}` },
          params: { search, sortBy, sortOrder }
        });
        setClients(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch clients');
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [token, search, sortBy, sortOrder]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setLoading(true);
      try {
        await axios.delete(`http://localhost:3000/api/clients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClients(clients.filter(client => client.client_id !== id));
        setToast({ show: true, message: 'Client deleted successfully', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete client');
        setToast({ show: true, message: err.response?.data?.error || 'Failed to delete client', type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleSortChange = (e) => {
    const [newSortBy, newSortOrder] = e.target.value.split(':');
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  if (loading) return <div className="spinner-border" role="status"><span className="sr-only">Loading...</span></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container">
      <h2 className="my-4">Clients</h2>
      {toast.show && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.message}
          <button type="button" className="close" onClick={() => setToast({ show: false, message: '', type: '' })}>
            <span>&times;</span>
          </button>
        </div>
      )}
      <div className="row mb-3">
        <div className="col-md-6">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or dedicated number"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <div className="col-md-3">
          <select className="form-control" onChange={handleSortChange} value={`${sortBy}:${sortOrder}`}>
            <option value="no_of_orders:desc">Orders (High to Low)</option>
            <option value="no_of_orders:asc">Orders (Low to High)</option>
            <option value="no_of_renew:desc">Renewals (High to Low)</option>
            <option value="no_of_renew:asc">Renewals (Low to High)</option>
          </select>
        </div>
        <div className="col-md-3">
          <Link to="/clients/new" className="btn btn-primary btn-block">Add New Client</Link>
        </div>
      </div>
      {clients.length === 0 ? (
        <p>No clients found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
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
                    <Link to={`/clients/${client.client_id}/edit`} className="btn btn-sm btn-warning mr-2">Edit</Link>
                    <button
                      onClick={() => handleDelete(client.client_id)}
                      className="btn btn-sm btn-danger"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ClientList;