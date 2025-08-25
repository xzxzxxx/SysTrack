import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import api from '../../utils/api';
import AsyncSelect from 'react-select/async';
import debounce from 'lodash.debounce';

// Helper component for rendering radio button groups
const RadioButtonGroup = ({ name, label, options, value, onChange }) => (
  <div className="mb-3">
    <label className="form-label">{label}</label>
    <div>
      {options.map(opt => (
        <div className="form-check form-check-inline" key={opt}>
          <input
            className="form-check-input"
            type="radio"
            name={name}
            id={`${name}-${opt}`}
            value={opt}
            checked={value === opt}
            onChange={onChange}
          />
          <label className="form-check-label" htmlFor={`${name}-${opt}`}>{opt}</label>
        </div>
      ))}
    </div>
  </div>
);

// This form handles creating and editing maintenance records.
function MaintenanceRequestForm({ token }) {
  const { id } = useParams(); // Gets the 'id' from the URL, e.g., /maintenance/123/edit
  const history = useHistory();
  const isEditMode = !!id; // If there is an ID, we are in edit mode.

  // State to hold all the form data
  const [record, setRecord] = useState({
    service_date: null,
    client_id: null,
    client: null,
    alias: '',
    jobnote: '',
    problem_description: '',
    is_warranty: false,
    product_model: '',
    serial_no: '',
    support_method: 'Onsite',
    symptom_classification: 'Hardware',
    pics: [],
    sales_text: '',
    arrive_time: null,
    depart_time: null,
    service_type: 'Maintenance',
    product_type: 'Other',
    solution_details: '',
    completion_date: null,
    labor_details: '',
    parts_details: '',
    remark: '',
    status: 'New',
  });

  // All option lists for radio buttons
  const serviceTypeOptions = ['Installation/Training', 'Preventive', 'Maintenance', 'Technical Support'];
  const productTypeOptions = ['Emb', 'Ser', 'DS', 'Sys', 'Other'];
  const supportMethodOptions = ['Remote', 'Onsite'];
  const symptomClassificationOptions = ['Hardware', 'Software'];

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

  // Standard input change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRecord(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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

  // The core logic for form submission and status transition
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let nextStatus = record.status;
    let payload = { ...record };

    // --- Workflow Logic: Determine the next status ---
    if (record.status === 'New' && record.pics.length > 0) {
      nextStatus = 'Pending';
    }
    if (['New', 'Pending'].includes(record.status) && record.service_date) {
      nextStatus = 'In Progress';
    }
    
    // Check for closure condition
    const attemptToClose = !!record.depart_time;
    if (attemptToClose) {
      // --- Validation for closing a record ---
      const requiredFieldsForClosure = ['service_date', 'client_id', 'jobnote', 'problem_description', 'solution_details', 'depart_time'];
      const missingFields = requiredFieldsForClosure.filter(field => !record[field]);
      
      if (missingFields.length > 0) {
        setError(`Cannot close record. Please fill in the following required fields: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }
      nextStatus = 'Closed';
    }
    
    payload.status = nextStatus;
    
    // Prepare payload for the API
    payload.client_id = record.client?.value;
    payload.pic_ids = record.pics.map(p => p.value);
    delete payload.client;
    delete payload.pics;
    
    try {
      if (isEditMode) {
        await api.put(`/maintenance-records/${id}`, payload);
        setToast({ show: true, message: 'Record updated successfully!', type: 'success' });
      } else {
        await api.post('/maintenance-records', payload);
        setToast({ show: true, message: 'Record created successfully!', type: 'success' });
      }
      setTimeout(() => history.push('/maintenance'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && isEditMode) return <div className="d-flex justify-content-center my-5"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;

  return (
    <div className="container-fluid my-4">
      <form onSubmit={handleSubmit}>
        <div className="card shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center bg-light">
            <h4 className="mb-0">{isEditMode ? `Edit Maintenance Record #${record.maintenance_id}` : 'Create New Maintenance Request'}</h4>
            <span className={`badge fs-6 rounded-pill bg-${record.status === 'Closed' ? 'success' : 'info'}`}>
              Status: {record.status}
            </span>
          </div>
          <div className="card-body p-4">
            {error && <div className="alert alert-danger" onClick={() => setError('')}>{error}</div>}
            {toast.show && <div className={`alert alert-${toast.type}`}>{toast.message}</div>}

            {/* --- Section 1: Core Request Information --- */}
            <h5 className="mt-2 border-bottom pb-2 mb-3">Core Request Information</h5>
            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">Client</label><AsyncSelect cacheOptions loadOptions={loadClientOptions} value={record.client} onChange={handleClientChange} required /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Alias</label><input type="text" name="alias" className="form-control" value={record.alias} onChange={handleChange} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Job Note (from contract)</label><input type="text" name="jobnote" className="form-control" value={record.jobnote} onChange={handleChange} required /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Sales</label><input type="text" name="sales_text" className="form-control" value={record.sales_text} onChange={handleChange} /></div>
              <div className="col-12 mb-3"><label className="form-label">Problem Description</label><textarea name="problem_description" className="form-control" value={record.problem_description} onChange={handleChange} rows="3" required></textarea></div>
              <div className="col-12 mb-3"><div className="form-check"><input type="checkbox" name="is_warranty" className="form-check-input" checked={record.is_warranty} onChange={handleChange} /><label className="form-check-label">Is Warranty?</label></div></div>
            </div>

            {/* --- Section 2: Maintenance Subject & Classification --- */}
            <h5 className="mt-3 border-bottom pb-2 mb-3">Maintenance Subject & Classification</h5>
            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">Product Model</label><input type="text" name="product_model" className="form-control" value={record.product_model} onChange={handleChange} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Serial No.</label><input type="text" name="serial_no" className="form-control" value={record.serial_no} onChange={handleChange} /></div>
              <div className="col-md-6"><RadioButtonGroup name="support_method" label="Support Method" options={supportMethodOptions} value={record.support_method} onChange={handleChange} /></div>
              <div className="col-md-6"><RadioButtonGroup name="symptom_classification" label="Symptom Classification" options={symptomClassificationOptions} value={record.symptom_classification} onChange={handleChange} /></div>
              <div className="col-md-6"><RadioButtonGroup name="service_type" label="Service Type" options={serviceTypeOptions} value={record.service_type} onChange={handleChange} /></div>
              <div className="col-md-6"><RadioButtonGroup name="product_type" label="Product Type" options={productTypeOptions} value={record.product_type} onChange={handleChange} /></div>
            </div>

            {/* --- Section 3: Internal Assignment & Scheduling --- */}
            <h5 className="mt-3 border-bottom pb-2 mb-3">Internal Assignment & Scheduling</h5>
            <div className="row">
              <div className="col-md-12 mb-3"><label className="form-label">Assign PIC(s) / AE</label><AsyncSelect isMulti cacheOptions loadOptions={loadPicOptions} value={record.pics} onChange={handlePicsChange} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Service Date</label><input type="date" name="service_date" className="form-control" value={record.service_date || ''} onChange={handleChange} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Completion Date</label><input type="date" name="completion_date" className="form-control" value={record.completion_date || ''} onChange={handleChange} /></div>
            </div>

            {/* --- Section 4: Service Report & Closure --- */}
            <h5 className="mt-3 border-bottom pb-2 mb-3">Service Report & Closure</h5>
            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">Arrive Time</label><input type="time" name="arrive_time" className="form-control" value={record.arrive_time || ''} onChange={handleChange} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Depart Time (fill to close)</label><input type="time" name="depart_time" className="form-control" value={record.depart_time || ''} onChange={handleChange} /></div>
              <div className="col-12 mb-3"><label className="form-label">Solution / Completed Task</label><textarea name="solution_details" className="form-control" value={record.solution_details} onChange={handleChange} rows="4"></textarea></div>
              <div className="col-md-6 mb-3"><label className="form-label">Labor Details</label><input type="text" name="labor_details" className="form-control" value={record.labor_details} onChange={handleChange} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Parts Details</label><input type="text" name="parts_details" className="form-control" value={record.parts_details} onChange={handleChange} /></div>
              <div className="col-12 mb-3"><label className="form-label">Remarks</label><textarea name="remark" className="form-control" value={record.remark} onChange={handleChange} rows="2"></textarea></div>
            </div>

          </div>
          <div className="card-footer text-end bg-light">
            <button type="button" className="btn btn-secondary me-3" onClick={() => history.push('/maintenance')}>Cancel</button>
            <button type="submit" className="btn btn-primary px-4" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default MaintenanceRequestForm;