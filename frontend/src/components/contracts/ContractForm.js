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
    t1: '',
    t2: '',
    t3: '',
    preventive: '',
    report: '',
    other: '',
    contract_status: '',
    remarks: '',
    period: '',
    response_time: '',
    service_time: '',
    spare_parts_provider: ''
  });
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const history = useHistory();
  const { contract_id } = useParams();

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
      if (!contract_id) return;
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:3000/api/contracts/${contract_id}`, {
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
  }, [contract_id, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContract(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (contract_id) {
        await axios.put(`http://localhost:3000/api/contracts/${contract_id}`, contract, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setToast({ show: true, message: 'Contract updated successfully', type: 'success' });
      } else {
        await axios.post('http://localhost:3000/api/contracts', contract, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setToast({ show: true, message: 'Contract created successfully', type: 'success' });
      }
      setTimeout(() => {
        setToast({ show: false, message: '', type: '' });
        history.push('/contracts');
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save contract';
      setError(errorMsg);
      setToast({ show: true, message: errorMsg, type: 'danger' });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !toast.show) return <div className="spinner-border" role="status"><span className="sr-only">Loading...</span></div>;
  if (error && !toast.show) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container">
      <h2 className="my-4">{contract_id ? 'Edit Contract' : 'New Contract'}</h2>
      {toast.show && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.message}
          <button type="button" className="close" onClick={() => setToast({ show: false, message: '', type: '' })}>
            <span>&times;</span>
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="card mb-3">
          <div className="card-header">Basic Information</div>
          <div className="card-body">
            <div className="form-group">
              <label>Client</label>
              <select name="client_id" className="form-control" value={contract.client_id} onChange={handleChange} required>
                <option value="">Select Client</option>
                {clients.map(client => (
                  <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="start_date"
                className="form-control"
                value={contract.start_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="end_date"
                className="form-control"
                value={contract.end_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Contract Status</label>
              <input
                type="text"
                name="contract_status"
                className="form-control"
                placeholder="e.g., Active, Expired"
                value={contract.contract_status}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        <div className="card mb-3">
          <div className="card-header">Details</div>
          <div className="card-body">
            <div className="form-group">
              <label>Client Name</label>
              <input
                type="text"
                name="client"
                className="form-control"
                placeholder="Client Name"
                value={contract.client}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Alias</label>
              <input
                type="text"
                name="alias"
                className="form-control"
                placeholder="Alias"
                value={contract.alias}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                name="project_name"
                className="form-control"
                placeholder="Project Name"
                value={contract.project_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                className="form-control"
                placeholder="Location"
                value={contract.location}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                name="category"
                className="form-control"
                placeholder="Category"
                value={contract.category}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Job Note</label>
              <input
                type="text"
                name="jobnote"
                className="form-control"
                placeholder="Job Note"
                value={contract.jobnote}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Sales</label>
              <input
                type="text"
                name="sales"
                className="form-control"
                placeholder="Sales"
                value={contract.sales}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>T1</label>
              <input
                type="text"
                name="t1"
                className="form-control"
                placeholder="T1"
                value={contract.t1}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>T2</label>
              <input
                type="text"
                name="t2"
                className="form-control"
                placeholder="T2"
                value={contract.t2}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>T3</label>
              <input
                type="text"
                name="t3"
                className="form-control"
                placeholder="T3"
                value={contract.t3}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Preventive</label>
              <input
                type="text"
                name="preventive"
                className="form-control"
                placeholder="Preventive"
                value={contract.preventive}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Report</label>
              <input
                type="text"
                name="report"
                className="form-control"
                placeholder="Report"
                value={contract.report}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Other</label>
              <input
                type="text"
                name="other"
                className="form-control"
                placeholder="Other"
                value={contract.other}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Period</label>
              <input
                type="text"
                name="period"
                className="form-control"
                placeholder="Period"
                value={contract.period}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Response Time</label>
              <input
                type="text"
                name="response_time"
                className="form-control"
                placeholder="Response Time"
                value={contract.response_time}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Service Time</label>
              <input
                type="text"
                name="service_time"
                className="form-control"
                placeholder="Service Time"
                value={contract.service_time}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Spare Parts Provider</label>
              <input
                type="text"
                name="spare_parts_provider"
                className="form-control"
                placeholder="Spare Parts Provider"
                value={contract.spare_parts_provider}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Remarks</label>
              <textarea
                name="remarks"
                className="form-control"
                placeholder="Remarks"
                value={contract.remarks}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}

export default ContractForm;