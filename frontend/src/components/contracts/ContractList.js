import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import debounce from 'lodash.debounce';
import SearchBar from '../common/SearchBar';

function ContractList({ token }) {
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const fetchContracts = useCallback(
    debounce(async (searchTerm) => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/contracts', {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchTerm }
        });
        setContracts(response.data);
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to fetch contracts';
        setError(errorMsg);
        setToast({ show: true, message: errorMsg, type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } finally {
        setLoading(false);
      }
    }, 300),
    [token]
  );

  useEffect(() => {
    fetchContracts(search);
  }, [search, fetchContracts]);

  const handleDelete = async (contract_id) => {
    if (window.confirm('Are you sure you want to delete this contract?')) {
      setLoading(true);
      try {
        await axios.delete(`http://localhost:3000/api/contracts/${contract_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContracts(contracts.filter(contract => contract.contract_id !== contract_id));
        setToast({ show: true, message: 'Contract deleted successfully', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to delete contract';
        setError(errorMsg);
        setToast({ show: true, message: errorMsg, type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
  };

  const showDetails = (contract) => {
    setSelectedContract(contract);
  };

  const hideDetails = () => {
    setSelectedContract(null);
  };

  return (
    <div className="container">
      <h2 className="my-4">Contracts</h2>
      {toast.show && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.message}
          <button type="button" className="close" onClick={() => setToast({ show: false, message: '', type: '' })}>
            <span>&times;</span>
          </button>
        </div>
      )}
      <div className="row mb-3">
        <div className="col-md-9">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search by contract ID, client code, or project name"
            isSearching={loading}
          />
        </div>
        <div className="col-md-3">
          <Link to="/contracts/new" className="btn btn-primary btn-block">Add New Contract</Link>
        </div>
      </div>
      {error && !loading && !toast.show && <div className="alert alert-danger">{error}</div>}
      {contracts.length === 0 && !loading ? (
        <p>No contracts found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Contract ID</th>
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
                <tr key={contract.contract_id}>
                  <td data-label="Contract ID">{contract.contract_id}</td>
                  <td data-label="Client Code">{contract.client_code}</td>
                  <td data-label="Project Name">{contract.project_name || '-'}</td>
                  <td data-label="Start Date">{contract.start_date}</td>
                  <td data-label="End Date">{contract.end_date}</td>
                  <td data-label="Status">
                    <span className={`badge badge-${contract.contract_status === 'active' ? 'success' : 'secondary'}`}>
                      {contract.contract_status || '-'}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <button className="btn btn-sm btn-primary mr-2" onClick={() => showDetails(contract)}>Details</button>
                    <Link to={`/contracts/${contract.contract_id}/edit`} className="btn btn-sm btn-warning mr-2">Edit</Link>
                    <button
                      onClick={() => handleDelete(contract.contract_id)}
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

      {/* Details Modal */}
      {selectedContract && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Contract Details</h5>
                <button type="button" className="close" onClick={hideDetails}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p><strong>Contract ID:</strong> {selectedContract.contract_id}</p>
                <p><strong>Client Code:</strong> {selectedContract.client_code}</p>
                <p><strong>Renew Code:</strong> {selectedContract.renew_code || '-'}</p>
                <p><strong>Client:</strong> {selectedContract.client || '-'}</p>
                <p><strong>Alias:</strong> {selectedContract.alias || '-'}</p>
                <p><strong>Project Name:</strong> {selectedContract.project_name || '-'}</p>
                <p><strong>Location:</strong> {selectedContract.location || '-'}</p>
                <p><strong>Category:</strong> {selectedContract.category || '-'}</p>
                <p><strong>Start Date:</strong> {selectedContract.start_date}</p>
                <p><strong>End Date:</strong> {selectedContract.end_date}</p>
                <p><strong>Status:</strong> {selectedContract.contract_status || '-'}</p>
                <p><strong>Job Note:</strong> {selectedContract.jobnote || '-'}</p>
                <p><strong>Sales:</strong> {selectedContract.sales || '-'}</p>
                <p><strong>T1:</strong> {selectedContract.t1 || '-'}</p>
                <p><strong>T2:</strong> {selectedContract.t2 || '-'}</p>
                <p><strong>T3:</strong> {selectedContract.t3 || '-'}</p>
                <p><strong>Preventive:</strong> {selectedContract.preventive || '-'}</p>
                <p><strong>Report:</strong> {selectedContract.report || '-'}</p>
                <p><strong>Other:</strong> {selectedContract.other || '-'}</p>
                <p><strong>Remarks:</strong> {selectedContract.remarks || '-'}</p>
                <p><strong>Period:</strong> {selectedContract.period || '-'}</p>
                <p><strong>Response Time:</strong> {selectedContract.response_time || '-'}</p>
                <p><strong>Service Time:</strong> {selectedContract.service_time || '-'}</p>
                <p><strong>Spare Parts Provider:</strong> {selectedContract.spare_parts_provider || '-'}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={hideDetails}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractList;