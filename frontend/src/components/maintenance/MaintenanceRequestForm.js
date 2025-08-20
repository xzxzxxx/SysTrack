import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import api from '../../utils/api';
import AsyncSelect from 'react-select/async';
import debounce from 'lodash.debounce';

// This form handles creating and editing maintenance records.
function MaintenanceRequestForm({ token }) {
  const { id } = useParams(); // Gets the 'id' from the URL, e.g., /maintenance/123/edit
  const history = useHistory();
  const isEditMode = !!id; // If there is an ID, we are in edit mode.

  // State to hold all the form data
  const [record, setRecord] = useState({
    service_date: new Date().toISOString().split('T')[0],
    status: 'New',
    client_id: null,
    client: null, // This will hold the client object { value, label } for the select component
    job_note: '',
    // ... add all other fields from your database schema here
    pics: [], // This will hold the assigned PICs { value, label } objects
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // This will run when the component mounts, especially for edit mode
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      api.get(`/maintenance-records/${id}`)
        .then(response => {
          // Format data for the form state
          const data = response.data;
          setRecord({
            ...data,
            service_date: data.service_date ? new Date(data.service_date).toISOString().split('T')[0] : '',
            // Ensure pics is an array, ready for the AsyncSelect component
            pics: data.pics ? data.pics.map(p => ({ value: p.user_id, label: p.username })) : [],
          });
        })
        .catch(err => {
          setError('Failed to fetch maintenance record.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, isEditMode]);

  // Handler for changes in most standard input fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRecord(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Create loader functions for the AsyncSelect components
  const loadClientOptions = useCallback(debounce(async (inputValue, callback) => {
    try {
      const response = await api.get('/clients/lookup', { params: { search: inputValue } });
      const options = response.data.map(c => ({ value: c.client_id, label: c.client_name }));
      callback(options);
    } catch (err) {
      callback([]);
    }
  }, 300), []);

  const loadPicOptions = useCallback(debounce(async (inputValue, callback) => {
    try {
      const response = await api.get('/users/lookup', { params: { search: inputValue } });
      const options = response.data.map(u => ({ value: u.user_id, label: u.username }));
      callback(options);
    } catch (err) {
      callback([]);
    }
  }, 300), []);

  // Create specific handlers for the select components
  const handleClientChange = (selectedOption) => {
    setRecord(prev => ({
      ...prev,
      client: selectedOption,
      client_id: selectedOption ? selectedOption.value : null
    }));
  };

  const handlePicsChange = (selectedOptions) => {
    setRecord(prev => ({ ...prev, pics: selectedOptions || [] }));
  };

  // Handler for form submission (both create and update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // The data payload to send to the API
    const payload = {
      ...record,
      client_id: record.client?.value,
      pic_ids: record.pics.map(p => p.value), // Convert PIC objects to an array of IDs
    };
    delete payload.pics; // Clean up the object before sending
    delete payload.client;

    try {
      if (isEditMode) {
        await api.put(`/maintenance-records/${id}`, payload);
        setToast({ show: true, message: 'Record updated successfully!', type: 'success' });
      } else {
        await api.post('/maintenance-records', payload);
        setToast({ show: true, message: 'Record created successfully!', type: 'success' });
      }
      // Redirect back to the list page after a short delay
      setTimeout(() => history.push('/maintenance'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) return <div>Loading record...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container-fluid mt-4">
      <h3>{isEditMode ? `Edit Maintenance Record #${record.maintenance_id}` : 'Create New Maintenance Request'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header">
            <h4>Record Details (Status: <span className="badge bg-info">{record.status}</span>)</h4>
          </div>
          <div className="card-body">
            {toast.show && <div className={`alert alert-${toast.type}`}>{toast.message}</div>}
            
            <div className="row">
              {/* Client Selection */}
              <div className="col-md-6 mb-3">
                <label htmlFor="client_id" className="form-label">Client</label>
                <AsyncSelect
                  id="client_id"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadClientOptions}
                  value={record.client}
                  onChange={handleClientChange}
                  placeholder="Type to search for a client..."
                  isClearable
                />
              </div>

              {/* PICs Selection */}
              <div className="col-md-6 mb-3">
                <label htmlFor="pics" className="form-label">PIC(s) / AE</label>
                <AsyncSelect
                  id="pics"
                  isMulti // This enables multi-select
                  cacheOptions
                  defaultOptions
                  loadOptions={loadPicOptions}
                  value={record.pics}
                  onChange={handlePicsChange}
                  placeholder="Type to search for PICs..."
                />
              </div>

              {/* Service Date */}
              <div className="col-md-4 mb-3">
                <label htmlFor="service_date" className="form-label">Service Date</label>
                <input
                  type="date"
                  id="service_date"
                  name="service_date"
                  className="form-control"
                  value={record.service_date}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Job Note */}
              <div className="col-md-8 mb-3">
                <label htmlFor="job_note" className="form-label">Job Note</label>
                <input
                  type="text"
                  id="job_note"
                  name="job_note"
                  className="form-control"
                  value={record.job_note}
                  onChange={handleChange}
                  placeholder="Brief description of the job"
                />
              </div>

              {/* Add more form fields here based on your schema... */}

            </div>
          </div>
          <div className="card-footer text-end">
            <button type="button" className="btn btn-secondary me-2" onClick={() => history.push('/maintenance')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default MaintenanceRequestForm;