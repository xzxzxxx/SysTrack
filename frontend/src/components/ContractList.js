import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ContractList({ token }) {
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchContracts = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/contracts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContracts(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch contracts');
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, [token]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contract?')) {
      setLoading(true);
      try {
        await axios.delete(`http://localhost:3000/api/contracts/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContracts(contracts.filter(contract => contract.id !== id));
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete contract');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Contracts</h2>
      <Link to="/contracts/new">Add New Contract</Link>
      {contracts.length === 0 ? (
        <p>No contracts found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Client Code</th>
              <th>Project Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map(contract => (
              <tr key={contract.id}>
                <td data-label="Client Code">{contract.client_code}</td>
                <td data-label="Project Name">{contract.project_name || '-'}</td>
                <td data-label="Start Date">{contract.start_date}</td>
                <td data-label="End Date">{contract.end_date}</td>
                <td data-label="Status">{contract.contract_status || '-'}</td>
                <td data-label="Actions">
                  <Link to={`/contracts/${contract.id}/edit`}>Edit</Link> | 
                  <button onClick={() => handleDelete(contract.id)} disabled={loading}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ContractList;