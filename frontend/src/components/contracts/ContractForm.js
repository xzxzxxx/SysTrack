import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useHistory, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Select from 'react-select';
import debounce from 'lodash.debounce';
import AsyncSelect from 'react-select/async';
import CreationModal from '../common/CreationModal';

// Component to create, renew, or edit contracts
function ContractForm({ token, defaultType = 'new' }) {
  // State to store form data for the contract
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
    // Pre-fill these values only when creating a new contract
    period: defaultType === 'new' ? '8*5' : '',
    response_time: defaultType === 'new' ? '4hrs' : '',
    service_time: defaultType === 'new' ? 'NBD' : '',
    spare_parts_provider: '',
    project_id: null
  });

  // State for custom input fields when "Custom" radio is selected
  const [customInputs, setCustomInputs] = useState({
    period: '',
    response_time: '',
    service_time: '',
    spare_parts_provider: '',
    preventive: ''
  });

  // State to track if "Custom" radio is selected for each field
  const [customSelected, setCustomSelected] = useState({
    period: false,
    response_time: false,
    service_time: false,
    spare_parts_provider: false,
    preventive: false
  });

  // State for dropdown data and UI feedback
  const [clients, setClients] = useState([]); // List of clients from /api/clients
  const [projects, setProjects] = useState([]); // List of projects from /api/projects
  const [error, setError] = useState(''); // Error message for API failures
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [toast, setToast] = useState({ show: false, message: '', type: '' }); // Toast for success/error messages
  const [contractType, setContractType] = useState(defaultType); // Mode: 'new', 'renew', or 'edit'
  const [contractNameSearch, setContractNameSearch] = useState(''); // Search input for contract_name
  const [jobnoteSearch, setJobnoteSearch] = useState(''); // Search input for jobnote
  const [contractOptions, setContractOptions] = useState([]); // Autocomplete options for contract_name

  // Router hooks for navigation and URL parameters
  const history = useHistory();
  const { contract_id } = useParams();

  // Debounced function to search contracts by contract_name (with optional jobnote filter)
  const fetchContractOptions = useCallback(
    debounce(async (inputValue) => {
      // Skip if no search input (neither contract_name nor jobnote)
      if (!inputValue && !jobnoteSearch) return;
      try {
        // Build query parameters for search
        const params = { contract_name: inputValue || undefined, jobnote: jobnoteSearch || undefined };
        const response = await api.get('/contracts', { params });
        // Map API response to react-select format: { value, label, contract }
        const options = response.data.data.map(contract => ({
          value: contract.contract_id,
          label: contract.contract_name || `Contract ${contract.contract_id}`,
          contract
        }));
        setContractOptions(options);
      } catch (err) {
        // Show error toast if search fails
        setToast({ show: true, message: 'Failed to fetch contracts', type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      }
    }, 300),
    [token, jobnoteSearch]
  );

  // Handle "Confirm" button click to search for exact jobnote match
  const handleJobnoteConfirm = async () => {
    if (!jobnoteSearch) {
      setToast({ show: true, message: 'Please enter a job note to search', type: 'danger' });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return;
    }
    try {
      const response = await api.get('/contracts', {
        params: { jobnote: jobnoteSearch }
      });
      if (response.data.data.length === 0) {
        setToast({ show: true, message: 'No contract found with this job note', type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
        return;
      }
      // Auto-fill form with selected contract, clearing jobnote, start_date, end_date
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

  // Fetch initial data (clients, projects, and contract for edit mode)
  useEffect(() => {
    if (!token) return;

    // Decode JWT to get user_id
    try {
      const decoded = jwtDecode(token);
      setContract(prev => ({ ...prev, user_id: decoded.userId }));
    } catch (err) {
      setError('Invalid token');
    }

    // Fetch clients for the dropdown
    const fetchClients = async () => {
      setLoading(true);
      try {
        const response = await api.get('/clients');
        setClients(response.data.data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch clients');
      } finally {
        setLoading(false);
      }
    };

    // Fetch projects for the dropdown
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await api.get('/projects', {
          params: { page: 1, limit: 1000 }
        });
        setProjects(response.data.data); // Expects { data: [{ project_id, project_name }, ...] }
      } catch (err) {
        console.error('Failed to fetch projects: Please ensure /api/projects endpoint is implemented', err);
        setError(err.response?.data?.error || 'Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    };

    // Fetch contract data for edit mode
    const fetchContract = async () => {
      if (!contract_id) return;
      setContractType('edit');
      setLoading(true);
      try {
        const response = await api.get(`/contracts/${contract_id}`);
        const contractData = response.data;
        console.log('Fetched contract data:', contractData); // Debug API response
        // Format dates to YYYY-MM-DD for <input type="date">
        const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';
        setContract({
          ...contractData,
          client_id: contractData.client_id || '',
          user_id: contractData.user_id || '',
          start_date: formatDate(contractData.start_date),
          end_date: formatDate(contractData.end_date),
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

  // Load clients async with search
  const loadClientOptions = async (inputValue, callback) => {
    if (!inputValue) return callback([]);
    try {
      const response = await api.get('/clients', {
        params: { search: inputValue, limit: 50 }
      });
      const options = response.data.data.map(client => ({
        value: client.client_id,
        label: `${client.client_name} (${client.dedicated_number})`
      }));
      callback(options);
    } catch (err) {
      setToast({ show: true, message: 'Failed to load clients', type: 'danger' });
      callback([]);
    }
  };

  // Load projects async with search
  const loadProjectOptions = async (inputValue, callback) => {
    if (!inputValue) return callback([]);
    try {
      const response = await api.get('/projects', {
        params: { search: inputValue, limit: 50 }
      });
      const options = response.data.data.map(project => ({
        value: project.project_id,
        label: project.project_name
      }));
      callback(options);
    } catch (err) {
      setToast({ show: true, message: 'Failed to load projects', type: 'danger' });
      callback([]);
    }
  };
  
  // Trigger contract_name search when typing in renew mode
  useEffect(() => {
    if (contractType === 'renew') {
      fetchContractOptions(contractNameSearch);
    }
  }, [contractNameSearch, contractType, fetchContractOptions]);

  // Handle changes to text inputs and dropdowns
  const handleChange = (e) => {
    const { name, value } = e.target;
    setContract(prev => ({ ...prev, [name]: value }));
  };

  // Handle changes to custom input fields
  const handleCustomInputChange = (e) => {
    const { name, value } = e.target;
    setCustomInputs(prev => ({ ...prev, [name]: value }));
    setContract(prev => ({ ...prev, [name]: value }));
  };

  // Handle radio button changes for predefined or custom values
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

  // Handle project dropdown changes
  const handleProjectChange = (e) => {
    const value = e.target.value === '' ? null : parseInt(e.target.value);
    setContract(prev => ({ ...prev, project_id: value }));
  };

  // Handle selection from contract_name autocomplete
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

  // Handle form submission (create or update contract)
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields
    const requiredFields = {
      client_id: 'Client',
      start_date: 'Start Date',
      end_date: 'End Date',
      jobnote: 'Job Note',
      category: 'Category',
      period: 'Period',
      response_time: 'Response Time',
      service_time: 'Service Time',
    };
    const missingFields = Object.keys(requiredFields).filter(field => !contract[field]);
    console.log('Missing fields:', missingFields); // Debug missing fields
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

    // --- Date Validation Logic ---
    const { start_date, end_date } = contract;
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const currentYear = new Date().getFullYear();

    // 1. Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setToast({ show: true, message: 'Invalid date format. Please use the date picker.', type: 'danger' });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return;
    }

    // 2. Check if the year is within a reasonable range (e.g., +/- 100 years from now)
    if (startDate.getFullYear() < currentYear - 100 || startDate.getFullYear() > currentYear + 100) {
      setToast({ show: true, message: 'Start date year is out of the acceptable range.', type: 'danger' });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return;
    }

    // 3. Check if end_date is after start_date
    if (endDate <= startDate) {
      setToast({ show: true, message: 'End date must be after the start date.', type: 'danger' });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return;
    }

    setLoading(true);
    try {
      if (contractType === 'edit') {
        // Update existing contract
        await api.put(`/contracts/${contract_id}`, contract);
        setToast({ show: true, message: 'Contract updated successfully', type: 'success' });
      } else {
        await api.post('/contracts', contract);
        setToast({ show: true, message: 'Contract created successfully', type: 'success' });
      }
      // Redirect to contracts list after success
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

  // State to manage the modal
  const [modalConfig, setModalConfig] = useState({
    show: false,
    type: null, // will be 'client' or 'project'
  });

  // Handler to close the modal
  const handleModalClose = () => {
    setModalConfig({ show: false, type: null });
  };

  // Handler to save data from the modal
  const handleModalSave = async (newData) => {
    const { type } = modalConfig;
    try {
      if (type === 'client') {
        // API call to create a new client
        const response = await api.post('/clients', newData);
        const newClient = response.data;
        // Update the contract form state with the new client's details
        setContract(prev => ({
          ...prev,
          client_id: newClient.client_id,
          client_name: newClient.client_name,
          dedicated_number: newClient.dedicated_number,
        }));
      } else if (type === 'project') {
        // API call to create a new project
        const response = await api.post('/projects', {
          ...newData,
          client_id: contract.client_id, // Important: pass the currently selected client_id
          user_id: contract.user_id
        });
        const newProject = response.data;
        // Update the contract form state with the new project's details
        setContract(prev => ({
          ...prev,
          project_id: newProject.project_id,
          project_name: newProject.project_name,
        }));
      }
      handleModalClose(); // Close modal on success
    } catch (err) {
      console.error(`Failed to create ${type}`, err);
      // You can show a toast error message here
      alert(`Error: Could not create the new ${type}.`);
    }
  };

  // Helper to render radio buttons for fields with predefined options or custom input
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

  // Show loading spinner or error message if applicable
  if (loading && !toast.show) return <div className="spinner-border" role="status"><span className="sr-only">Loading...</span></div>;
  if (error && !toast.show) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container">
      {/* Form header based on mode */}
      <h2 className="my-4">{contractType === 'edit' ? 'Edit Contract' : contractType === 'new' ? 'New Contract' : 'Renew Contract'}</h2>
      {/* Toast for success/error messages */}
      {toast.show && (
        <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
          {toast.message}
          <button type="button" className="close" onClick={() => setToast({ show: false, message: '', type: '' })}>
            <span>×</span>
          </button>
        </div>
      )}
      {/* New/Renew buttons, hidden in edit mode */}
      {contractType !== 'edit' && (
        <div className="mb-3">
          <button
            className={`btn ${contractType === 'new' ? 'btn-primary' : 'btn-outline-primary'} mr-2`}
            onClick={() => {
              setContractType('new');
              // Reset form for new contract
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
              // Reset form for renew mode
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
      {/* Search card for renew mode */}
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
                      autoComplete="off" // Disable browser autocomplete
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
      {/* Main form */}
      {/* noValidate stop hmtl validation and let js handle it */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="card mb-3">
          <div className="card-header">Basic Information</div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="client_id">Client<span className="text-danger">*</span></label>
                  <div className="input-group">
                    <AsyncSelect
                      cacheOptions
                      loadOptions={debounce(loadClientOptions, 300)} // Use your existing debounce
                      defaultOptions // Pre-load some if needed
                      placeholder="Search clients..."
                      isClearable
                      className="flex-grow-1"
                      value={
                        contract.client_id && contract.client_name ? {
                          value: contract.client_id,
                          label: `${contract.client_name} (${contract.dedicated_number || ''})`
                        } : null
                      }
                      onChange={(selected) => {
                        setContract(prev => ({
                          ...prev,
                          client_id: selected ? selected.value : '',
                          // Also update the name and number in state for consistency
                          client_name: selected ? selected.label.split(' (')[0] : '',
                          dedicated_number: selected ? selected.label.match(/\(([^)]+)\)/)?.[1] || '' : ''
                        }));
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setModalConfig({ show: true, type: 'client' })}
                    >
                      + New
                    </button>
                  </div>
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
                    autoComplete="off"
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
                  <label htmlFor="project_id">Project (Optional)</label>
                  <div className="input-group">
                    <AsyncSelect
                      cacheOptions
                      loadOptions={debounce(loadProjectOptions, 300)}
                      defaultOptions
                      placeholder="Search projects..."
                      isClearable
                      className="flex-grow-1"
                      isDisabled={!contract.client_id} // Disable if no client is selected
                      value={
                        contract.project_id && contract.project_name ? {
                          value: contract.project_id,
                          label: contract.project_name
                        } : null
                      }//for edit
                      onChange={(selected) => {
                        setContract(prev => ({
                          ...prev,
                          project_id: selected ? selected.value : null,
                          project_name: selected ? selected.label : ''
                        }));
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setModalConfig({ show: true, type: 'project' })}
                      disabled={!contract.client_id} // Disable if no client is selected
                    >
                      + New
                    </button>
                  </div>
                  {!contract.client_id && <div className="form-text">Please select a client before adding a project.</div>}
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
                {renderRadioGroup('period', <>Period<span className="text-danger">*</span></>, ['8*5', '24*5'])}
                {renderRadioGroup('response_time', <>Response Time<span className="text-danger">*</span></>, ['4hrs', '8hrs'])}
                {renderRadioGroup('service_time', <>Service Time<span className="text-danger">*</span></>, ['NBD', '48hrs'])}
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

        {/* Render the modal conditionally*/}
        {modalConfig.show && (
          <CreationModal
            show={modalConfig.show}
            onClose={handleModalClose}
            onSave={handleModalSave}
            title={modalConfig.type === 'client' ? 'Create New Client' : 'Create New Project'}
            fields={
              modalConfig.type === 'client'
                ? [
                    { name: 'client_name', label: 'Client Name', required: true },
                    { name: 'email', label: 'Email (Optional)', type: 'email' },
                  ]
                : [
                    { name: 'project_name', label: 'Project Name', required: true },
                  ]
            }
            warningText={
              modalConfig.type === 'client'
                ? "Please ensure this client does not already exist. Check for abbreviations or variations (e.g., 'ABC Ltd.' vs. 'ABC Limited')."
                : "Please ensure this project does not already exist for the selected client."
            }
          />
        )}
      </form>
    </div>
  );
}

export default ContractForm;