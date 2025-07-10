import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useHistory, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Select from 'react-select';
import debounce from 'lodash.debounce';

function ContractForm({ token, defaultType = 'new' }) {
  const [contract, setContract] = useState({
    client_id: '',
    user_id: '',
    start_date: '',
    end_date: '',
    client: '',
    alias: '',
    jobnote: '',
    sales: '',
    contract_name: '',
    location: '',
    category: '',
    t1: '',
    t2: '',
    t3: '',
    preventive: '',
    report: '',
    other: '',
    remarks: '',
    period: '',
    response_time: '',
    service_time: '',
    spare_parts_provider: '',
    project_id: null
  });
  // State for custom input fields
  const [customInputs, setCustomInputs] = useState({
    period: '',
    response_time: '',
    service_time: '',
    spare_parts_provider: '',
    preventive: ''
  });
  // State to track if "Custom" is selected for each field
  const [customSelected, setCustomSelected] = useState({
    period: false,
    response_time: false,
    service_time: false,
    spare_parts_provider: false,
    preventive: false
  });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  //new, renew, edit
  const [contractType, setContractType] = useState(defaultType);
  const [contractNameSearch, setContractNameSearch] = useState('');
  const [jobnoteSearch, setJobnoteSearch] = useState('');
  const [contractOptions, setContractOptions] = useState([]);
  const history = useHistory();
  const { contract_id } = useParams();

  // Debounced search for contract_name
  const fetchContractOptions = useCallback(
    debounce(async (inputValue) => {
      if (!inputValue && !jobnoteSearch) return;
      try {
        const params = { contract_name: inputValue || undefined, jobnote: jobnoteSearch || undefined };
        const response = await axios.get('http://localhost:3000/api/contracts', {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        const options = response.data.data.map(contract => ({
          value: contract.contract_id,
          label: contract.contract_name || `Contract ${contract.contract_id}`,
          contract
        }));
        setContractOptions(options);
      } catch (err) {
        setToast({ show: true, message: 'Failed to fetch contracts', type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      }
    }, 300),
    [token, jobnoteSearch]
  );

  // Search for exact jobnote match
  const handleJobnoteConfirm = async () => {
    if (!jobnoteSearch) {
      setToast({ show: true, message: 'Please enter a job note to search', type: 'danger' });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return;
    }
    try {
      const response = await axios.get('http://localhost:3000/api/contracts', {
        headers: { Authorization: `Bearer ${token}` },
        params: { jobnote: jobnoteSearch }
      });
      if (response.data.data.length === 0) {
        setToast({ show: true, message: 'No contract found with this job note', type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
        return;
      }
      const selectedContract = response.data.data[0];
      setContract({
        ...selectedContract,
        jobnote: '',
        start_date: '',
        end_date: ''
      });
      setCustomInputs({
        period: selectedContract.period && !['8*5', '24*5'].includes(selectedContract.period) ? selectedContract.period : '',
        response_time: selectedContract.response_time && !['4hrs', '8hrs'].includes(selectedContract.response_time) ? selectedContract.response_time : '',
        service_time: selectedContract.service_time && !['NBD', '48hrs'].includes(selectedContract.service_time) ? selectedContract.service_time : '',
        spare_parts_provider: selectedContract.spare_parts_provider && !['cwc', 'client'].includes(selectedContract.spare_parts_provider) ? selectedContract.spare_parts_provider : '',
        preventive: selectedContract.preventive && !['Bi-monthly', 'Quarterly', 'Yearly', 'Twice a Year'].includes(selectedContract.preventive) ? selectedContract.preventive : ''
      });
      setCustomSelected({
        period: selectedContract.period && !['8*5', '24*5'].includes(selectedContract.period),
        response_time: selectedContract.response_time && !['4hrs', '8hrs'].includes(selectedContract.response_time),
        service_time: selectedContract.service_time && !['NBD', '48hrs'].includes(selectedContract.service_time),
        spare_parts_provider: selectedContract.spare_parts_provider && !['cwc', 'client'].includes(selectedContract.spare_parts_provider),
        preventive: selectedContract.preventive && !['Bi-monthly', 'Quarterly', 'Yearly', 'Twice a Year'].includes(selectedContract.preventive)
      });
      setToast({ show: true, message: 'Contract loaded successfully', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    } catch (err) {
      setToast({ show: true, message: err.response?.data?.error || 'Failed to fetch contract', type: 'danger' });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    }
  };

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
        setClients(response.data.data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch clients');
      } finally {
        setLoading(false);
      }
    };

    // Fetch projects
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjects(response.data); // Handles [{ project_id, project_name }, ...]
      } catch (err) {
        console.error('Failed to fetch projects: Please ensure /api/projects endpoint is implemented', err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch contract if editing
    const fetchContract = async () => {
      if (!contract_id) return;
      setContractType('edit');
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:3000/api/contracts/${contract_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const contractData = response.data;
        setContract({
          ...contractData,
          // Ensure all non-null fields are populated
          client_id: contractData.client_id || '',
          user_id: contractData.user_id || '',
          start_date: contractData.start_date || '',
          end_date: contractData.end_date || '',
          client: contractData.client || '',
          alias: contractData.alias || '',
          jobnote: contractData.jobnote || '',
          sales: contractData.sales || '',
          contract_name: contractData.contract_name || '',
          location: contractData.location || '',
          category: contractData.category || '',
          t1: contractData.t1 || '',
          t2: contractData.t2 || '',
          t3: contractData.t3 || '',
          preventive: contractData.preventive || '',
          report: contractData.report || '',
          other: contractData.other || '',
          remarks: contractData.remarks || '',
          period: contractData.period || '',
          response_time: contractData.response_time || '',
          service_time: contractData.service_time || '',
          spare_parts_provider: contractData.spare_parts_provider || '',
          project_id: contractData.project_id || null
        });
        setCustomInputs({
          period: contractData.period && !['8*5', '24*5'].includes(contractData.period) ? contractData.period : '',
          response_time: contractData.response_time && !['4hrs', '8hrs'].includes(contractData.response_time) ? contractData.response_time : '',
          service_time: contractData.service_time && !['NBD', '48hrs'].includes(contractData.service_time) ? contractData.service_time : '',
          spare_parts_provider: contractData.spare_parts_provider && !['cwc', 'client'].includes(contractData.spare_parts_provider) ? contractData.spare_parts_provider : '',
          preventive: contractData.preventive && !['Bi-monthly', 'Quarterly', 'Yearly', 'Twice a Year'].includes(contractData.preventive) ? contractData.preventive : ''
        });
        setCustomSelected({
          period: contractData.period && !['8*5', '24*5'].includes(contractData.period),
          response_time: contractData.response_time && !['4hrs', '8hrs'].includes(contractData.response_time),
          service_time: contractData.service_time && !['NBD', '48hrs'].includes(contractData.service_time),
          spare_parts_provider: contractData.spare_parts_provider && !['cwc', 'client'].includes(contractData.spare_parts_provider),
          preventive: contractData.preventive && !['Bi-monthly', 'Quarterly', 'Yearly', 'Twice a Year'].includes(contractData.preventive)
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch contract');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
    fetchProjects();
    fetchContract();
  }, [contract_id, token]);

  useEffect(() => {
    if (contractType === 'renew') {
      fetchContractOptions(contractNameSearch);
    }
  }, [contractNameSearch, contractType, fetchContractOptions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContract(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomInputChange = (e) => {
    const { name, value } = e.target;
    setCustomInputs(prev => ({ ...prev, [name]: value }));
    setContract(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    if (value === 'custom') {
      setCustomSelected(prev => ({ ...prev, [name]: true }));
      setContract(prev => ({ ...prev, [name]: customInputs[name] || '' }));
    } else {
      setCustomSelected(prev => ({ ...prev, [name]: false }));
      setContract(prev => ({ ...prev, [name]: value }));
      setCustomInputs(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleProjectChange = (e) => {
    const value = e.target.value === '' ? null : parseInt(e.target.value);
    setContract(prev => ({ ...prev, project_id: value }));
  };

  const handleContractSelect = (option) => {
    if (!option) return;
    const selectedContract = option.contract;
    setContract({
      ...selectedContract,
      jobnote: '',
      start_date: '',
      end_date: ''
    });
    setCustomInputs({
      period: selectedContract.period && !['8*5', '24*5'].includes(selectedContract.period) ? selectedContract.period : '',
      response_time: selectedContract.response_time && !['4hrs', '8hrs'].includes(selectedContract.response_time) ? selectedContract.response_time : '',
      service_time: selectedContract.service_time && !['NBD', '48hrs'].includes(selectedContract.service_time) ? selectedContract.service_time : '',
      spare_parts_provider: selectedContract.spare_parts_provider && !['cwc', 'client'].includes(selectedContract.spare_parts_provider) ? selectedContract.spare_parts_provider : '',
      preventive: selectedContract.preventive && !['Bi-monthly', 'Quarterly', 'Yearly', 'Twice a Year'].includes(selectedContract.preventive) ? selectedContract.preventive : ''
    });
    setCustomSelected({
      period: selectedContract.period && !['8*5', '24*5'].includes(selectedContract.period),
      response_time: selectedContract.response_time && !['4hrs', '8hrs'].includes(selectedContract.response_time),
      service_time: selectedContract.service_time && !['NBD', '48hrs'].includes(selectedContract.service_time),
      spare_parts_provider: selectedContract.spare_parts_provider && !['cwc', 'client'].includes(selectedContract.spare_parts_provider),
      preventive: selectedContract.preventive && !['Bi-monthly', 'Quarterly', 'Yearly', 'Twice a Year'].includes(selectedContract.preventive)
    });
    setToast({ show: true, message: 'Contract loaded successfully', type: 'success' });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Client-side validation for required fields
    const requiredFields = {
      client_id: 'Client',
      start_date: 'Start Date',
      end_date: 'End Date',
      jobnote: 'Job Note',
      category: 'Category'
    };
    const missingFields = Object.keys(requiredFields).filter(field => !contract[field]);
    if (missingFields.length > 0) {
      setToast({
        show: true,
        message: `Please fill in the following required fields: ${missingFields.map(field => requiredFields[field]).join(', ')}`,
        type: 'danger'
      });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return;
    }

    // In renew mode, ensure at least one search field was used
    if (contractType === 'renew' && !contractNameSearch && !jobnoteSearch) {
      setToast({
        show: true,
        message: 'Please search by contract name or job note to renew a contract',
        type: 'danger'
      });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return;
    }

    setLoading(true);
    try {
      if (contractType === 'edit') {
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

  // Helper to render radio buttons for a field
  const renderRadioGroup = (name, label, options) => (
    <div className="form-group">
      <label>{label}{name === 'category' && <span className="text-danger">*</span>}</label>
      {options.map(option => (
        <div className="form-check" key={option}>
          <input
            type="radio"
            name={name}
            value={option}
            className="form-check-input"
            checked={contract[name] === option}
            onChange={handleRadioChange}
          />
          <label className="form-check-label">{option}</label>
        </div>
      ))}
      {['period', 'response_time', 'service_time', 'spare_parts_provider', 'preventive'].includes(name) && (
        <div className="form-check">
          <input
            type="radio"
            name={name}
            value="custom"
            className="form-check-input"
            checked={customSelected[name]}
            onChange={handleRadioChange}
          />
          <label className="form-check-label">Custom</label>
          {customSelected[name] && (
            <input
              type="text"
              name={name}
              className="form-control mt-2"
              placeholder={`Custom ${label}`}
              value={customInputs[name]}
              onChange={handleCustomInputChange}
            />
          )}
        </div>
      )}
    </div>
  );

  if (loading && !toast.show) return <div className="spinner-border" role="status"><span className="sr-only">Loading...</span></div>;
  if (error && !toast.show) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container">
      <h2 className="my-4">{contractType === 'edit' ? 'Edit Contract' : contractType === 'new' ? 'New Contract' : 'Renew Contract'}</h2>
      {toast.show && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.message}
          <button type="button" className="close" onClick={() => setToast({ show: false, message: '', type: '' })}>
            <span>×</span>
          </button>
        </div>
      )}
      {/* button for new and renew contracts, hidden when edit */}
      {contractType !== 'edit' && (
        <div className="mb-3">
          <button
            className={`btn ${contractType === 'new' ? 'btn-primary' : 'btn-outline-primary'} mr-2`}
            onClick={() => {
              setContractType('new');
              setContract({
                client_id: '',
                user_id: contract.user_id,
                start_date: '',
                end_date: '',
                client: '',
                alias: '',
                jobnote: '',
                sales: '',
                contract_name: '',
                location: '',
                category: '',
                t1: '',
                t2: '',
                t3: '',
                preventive: '',
                report: '',
                other: '',
                remarks: '',
                period: '',
                response_time: '',
                service_time: '',
                spare_parts_provider: '',
                project_id: null
              });
              setCustomInputs({
                period: '',
                response_time: '',
                service_time: '',
                spare_parts_provider: '',
                preventive: ''
              });
              setCustomSelected({
                period: false,
                response_time: false,
                service_time: false,
                spare_parts_provider: false,
                preventive: false
              });
              setContractNameSearch('');
              setJobnoteSearch('');
            }}
          >
            Create New Contract
          </button>
          <button
            className={`btn ${contractType === 'renew' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => {
              setContractType('renew');
              setContract({
                client_id: '',
                user_id: contract.user_id,
                start_date: '',
                end_date: '',
                client: '',
                alias: '',
                jobnote: '',
                sales: '',
                contract_name: '',
                location: '',
                category: '',
                t1: '',
                t2: '',
                t3: '',
                preventive: '',
                report: '',
                other: '',
                remarks: '',
                period: '',
                response_time: '',
                service_time: '',
                spare_parts_provider: '',
                project_id: null
              });
              setCustomInputs({
                period: '',
                response_time: '',
                service_time: '',
                spare_parts_provider: '',
                preventive: ''
              });
              setCustomSelected({
                period: false,
                response_time: false,
                service_time: false,
                spare_parts_provider: false,
                preventive: false
              });
              setContractNameSearch('');
              setJobnoteSearch('');
            }}
          >
            Renew Existing Contract
          </button>
        </div>
      )}
      {contractType === 'renew' && (
        <div className="card mb-3">
          <div className="card-header">Search Contract to Renew</div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label>Search by Contract Name</label>
                  <Select
                    options={contractOptions}
                    onInputChange={(value) => setContractNameSearch(value)}
                    onChange={handleContractSelect}
                    placeholder="Type contract name..."
                    isClearable
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label>Search by Job Note<span className="text-danger">*</span></label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter exact job note"
                      value={jobnoteSearch}
                      onChange={(e) => setJobnoteSearch(e.target.value)}
                    />
                    <div className="input-group-append">
                      <button
                        className="btn btn-primary"
                        onClick={handleJobnoteConfirm}
                        disabled={!jobnoteSearch}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="card mb-3">
          <div className="card-header">Basic Information</div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label>Client<span className="text-danger">*</span></label>
                  <select name="client_id" className="form-control" value={contract.client_id} onChange={handleChange} required>
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date<span className="text-danger">*</span></label>
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
                  <label>Job Note<span className="text-danger">*</span></label>
                  <input
                    type="text"
                    name="jobnote"
                    className="form-control"
                    placeholder="Job Note"
                    value={contract.jobnote}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="col-md-6">
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
                  <label>End Date<span className="text-danger">*</span></label>
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
                  <label>Contract Name</label>
                  <input
                    type="text"
                    name="contract_name"
                    className="form-control"
                    placeholder="Contract Name"
                    value={contract.contract_name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card mb-3">
          <div className="card-header">Details</div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label>Project</label>
                  <select
                    name="project_id"
                    className="form-control"
                    value={contract.project_id || ''}
                    onChange={handleProjectChange}
                  >
                    <option value="">No Group</option>
                    {projects.map(project => (
                      <option key={project.project_id} value={project.project_id}>{project.project_name}</option>
                    ))}
                  </select>
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
                {renderRadioGroup('category', 'Category', ['SVR', 'DSS', 'EMB'])}
              </div>
              <div className="col-md-6">
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
              </div>
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
        <div className="card mb-3">
          <div className="card-header">SLA</div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                {renderRadioGroup('period', 'Period', ['8*5', '24*5'])}
                {renderRadioGroup('response_time', 'Response Time', ['4hrs', '8hrs'])}
                {renderRadioGroup('service_time', 'Service Time', ['NBD', '48hrs'])}
              </div>
              <div className="col-md-6">
                {renderRadioGroup('spare_parts_provider', 'Spare Parts Provider', ['cwc', 'client'])}
                {renderRadioGroup('preventive', 'Preventive', ['Bi-monthly', 'Quarterly', 'Yearly', 'Twice a Year'])}
              </div>
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : contractType === 'edit' ? 'Update' : 'Save'}
        </button>
      </form>
    </div>
  );
}

export default ContractForm;