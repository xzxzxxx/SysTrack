import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useHistory, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function ContractForm({ token }) {
  const [contract, setContract] = useState({
    client_id: '',
    user_id: '',
    start_date: '',
    end_date: '',
    client: '',
    alias: '',
    jobnote: '',
    sales: '',
    project_name: '',
    location: '',
    category: '',
    contract_status: '',
    remarks: ''
  });
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const history = useHistory();
  const { id } = useParams();

  useEffect(() => {
    if (!token) return;

    // Decode JWT to get user_id
    try {
      const decoded = jwtDecode(token);
      setContract(prev => ({ ...prev, user_id: decoded.userId }));
    } catch (err) {
      setError('Invalid token');
    }

    // Fetch clients
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

    // Fetch contract if editing
    const fetchContract = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:3000/api/contracts/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContract(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch contract');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
    fetchContract();
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContract(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (id) {
        await axios.put(`http://localhost:3000/api/contracts/${id}`, contract, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://localhost:3000/api/contracts', contract, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      history.push('/contracts');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>{id ? 'Edit Contract' : 'New Contract'}</h2>
      <form onSubmit={handleSubmit}>
        <select name="client_id" value={contract.client_id} onChange={handleChange} required>
          <option value="">Select Client</option>
          {clients.map(client => (
            <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
          ))}
        </select>
        <input
          type="date"
          name="start_date"
          value={contract.start_date}
          onChange={handleChange}
          required
        />
        <input
          type="date"
          name="end_date"
          value={contract.end_date}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="client"
          placeholder="Client Name"
          value={contract.client}
          onChange={handleChange}
        />
        <input
          type="text"
          name="alias"
          placeholder="Alias"
          value={contract.alias}
          onChange={handleChange}
        />
        <input
          type="text"
          name="jobnote"
          placeholder="Job Note"
          value={contract.jobnote}
          onChange={handleChange}
        />
        <input
          type="text"
          name="sales"
          placeholder="Sales"
          value={contract.sales}
          onChange={handleChange}
        />
        <input
          type="text"
          name="project_name"
          placeholder="Project Name"
          value={contract.project_name}
          onChange={handleChange}
        />
        <input
          type="text"
          name="location"
          placeholder="Location"
          value={contract.location}
          onChange={handleChange}
        />
        <input
          type="text"
          name="category"
          placeholder="Category"
          value={contract.category}
          onChange={handleChange}
        />
        <input
          type="text"
          name="contract_status"
          placeholder="Contract Status"
          value={contract.contract_status}
          onChange={handleChange}
        />
        <textarea
          name="remarks"
          placeholder="Remarks"
          value={contract.remarks}
          onChange={handleChange}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}

export default ContractForm;