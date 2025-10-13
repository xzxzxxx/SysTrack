import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import api from '../../utils/api';
import AsyncSelect from 'react-select/async';

const initialState = {
  service_date: '',
  service_code: '',
  client_id: null,
  client_name: '',
  jobnote: '',
  location_district: '',
  is_warranty: false,
  sales: '',
  product_model: '',
  serial_no: '',
  problem_description: '',
  solution_details: '',
  labor_details: '',
  parts_details: '',
  arrive_time: '',
  depart_time: '',
  completion_date: '',
  remark: '',
  service_type: '',
  product_type: '',
  support_method: '',
  symptom_classification: '',
  alias: '',
  // local-only fields
  pic_ids_input: '',
  status: 'New',
};

const STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Follow-up required', label: 'Follow-up required' },
  { value: 'Closed', label: 'Closed' },
];

// This form handles creating and editing maintenance records.
function MaintenanceRequestForm({ token }) {
  const { id } = useParams();
  const history = useHistory();
  const isEdit = Boolean(id);

  const [selectedPics, setSelectedPics] = useState([]);
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Load for edit
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/maintenance-records/${id}`);
        const r = res.data;
        setForm((prev) => ({
          ...prev,
          ...r,
          client_id: r.client_id || null,
          client_name: r.client_name || '',
          service_date: r.service_date ? r.service_date.substring(0, 10) : '',
          arrive_time: r.arrive_time ? r.arrive_time.substring(0, 5) : '',
          depart_time: r.depart_time ? r.depart_time.substring(0, 5) : '',
          completion_date: r.completion_date ? r.completion_date.substring(0, 10) : '',
          sales: r.sales_text || r.sales || '',
          pic_ids_input: Array.isArray(r.pics) ? r.pics.map((p) => p.user_id).join(',') : '',
          status: r.status || 'New',
        }));

        const picsOptions = Array.isArray(r.pics) 
          ? r.pics.map(p => ({ value: p.user_id, label: p.username }))
          : [];
        setSelectedPics(picsOptions);

      } catch (err) {
        setToast({ show: true, type: 'danger', message: err.response?.data?.error || 'Failed to load record' });
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, id]);

  // Load for clone (when creating a follow-up)
  useEffect(() => {
    if (isEdit) return; // only for new records
    
    const cloneFromId = history.location.state?.cloneFromId;
    if (!cloneFromId) return;

    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/maintenance-records/${cloneFromId}`);
        const r = res.data;
        
        // Pre-fill form with PRESERVED fields (client & problem info)
        setForm((prev) => ({
          ...prev,
          // Preserve: client and problem info
          client_id: r.client_id || null,
          client_name: r.client_name || '',
          service_code: r.service_code || '',
          jobnote: r.jobnote || '',
          location_district: r.location_district || '',
          is_warranty: r.is_warranty || false,
          sales: r.sales_text || r.sales || '',
          product_model: r.product_model || '',
          serial_no: r.serial_no || '',
          problem_description: r.problem_description || '',
          alias: r.alias ? `Follow-up of #${cloneFromId}` : `Follow-up of #${cloneFromId}`,
          
          // Clear: visit-specific fields
          service_date: '',
          arrive_time: '',
          depart_time: '',
          completion_date: '',
          solution_details: '',
          labor_details: '',
          parts_details: '',
          remark: '',
          
          // Reset status to New
          status: 'New',
          
          // Optionally preserve PICs (if same AE continues)
          pic_ids_input: Array.isArray(r.pics) ? r.pics.map((p) => p.user_id).join(',') : '',
        }));
        
        // Set PICs dropdown
        const picsOptions = Array.isArray(r.pics) 
          ? r.pics.map(p => ({ value: p.user_id, label: p.username })) 
          : [];
        setSelectedPics(picsOptions);
        
        // Show toast notification
        setToast({
          show: true,
          type: 'info',
          message: `Creating follow-up for Maintenance Request #${cloneFromId}`
        });
        
      } catch (err) {
        setToast({
          show: true,
          type: 'danger',
          message: err.response?.data?.error || 'Failed to load record for cloning'
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, history.location.state]);

  
  // Clients: query /clients with name_search, minimum 2 chars
  const loadClientOptions = async (inputValue) => {
    const q = (inputValue || '').trim();
    if (q.length < 2) return []; // reduce requests
    const resp = await api.get('/clients', {
      params: { name_search: q, limit: 20 }
    });
    const list = resp.data?.data || [];
    return list.map((c) => ({
      value: c.client_id,
      label: `${c.client_name}${c.dedicated_number ? ` (${c.dedicated_number})` : ''}`,
      raw: c
    }));
  };

  const handleClientChange = (opt) => {
    setForm((f) => ({
      ...f,
      client_id: opt ? opt.value : null,
      client_name: opt ? opt.label : '',
    }));
  };

  // PICs: query /users/lookup with search
  const loadPicOptions = async (inputValue) => {
  const q = (inputValue || '').trim();
  const resp = await api.get('/users/lookup', { params: { search: q } });
  const list = Array.isArray(resp.data) ? resp.data : [];
  return list.map((u) => ({ value: u.user_id, label: u.username, raw: u }));
};
  
  const handlePicsChange = (selectedOptions) => {
    const arr = selectedOptions || [];
    setSelectedPics(arr);
    setForm((f) => ({ ...f, pic_ids_input: arr.map(o => o.value).join(',') }));
  };

  useEffect(() => {
    return () => {
      loadClientOptions.cancel?.();
      loadPicOptions.cancel?.();
    };
  }, [loadClientOptions, loadPicOptions]);

  // Common change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = value;
    if (type === 'radio' && value === '') {
      newValue = null; // Set to null for "Not Set"
    }
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : newValue,
    }));
  };

  // Basic date/time validation
  const validateDates = () => {
    const errs = [];
    const sd = form.service_date ? new Date(form.service_date) : null;
    const ad = form.arrive_time ? new Date(form.arrive_time) : null;
    const dd = form.depart_time ? new Date(form.depart_time) : null;
    const cd = form.completion_date ? new Date(form.completion_date) : null;

    if (ad && dd && ad > dd) errs.push('Arrive time must be before depart time');
    if (sd && cd && cd < sd) errs.push('Completion date must be on/after service date');
    return errs;
  };

  // Validate for target status (same rule as backend)
  const validateForStatus = (target) => {
    const errs = [];
    if (!form.client_id) errs.push('Client is required');
    if (!form.jobnote) errs.push('Job Note is required');
    if (!form.service_code) errs.push('Service Code is required');

    switch (target) {
      case 'New':
        break;
      case 'Pending': {
        const ids = form.pic_ids_input
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (ids.length < 1) errs.push('At least one PIC is required for Pending');
        break;
      }
      case 'In Progress':
        if (!form.service_date) errs.push('Service Date is required for In Progress');
        break;
      case 'Follow-up required':
        // same as 'New' - only core fields
        break;
      case 'Closed':
        if (!form.completion_date) errs.push('Completion Date is required for Closed');
        if (!form.solution_details) errs.push('Solution Details is required for Closed');
        break;
      default:
        errs.push('Unknown status');
    }

    const dateErrs = validateDates();
    return [...errs, ...dateErrs];
  };

  // Submit handler with null conversion for radio fields
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const errs = validateForStatus(form.status);
    if (errs.length) {
      setLoading(false);
      alert(errs.join('\n'));
      return;
    }  

    // Convert empty radio fields to null
    const payload = { ...form };
    ['service_type', 'product_type', 'symptom_classification', 'support_method'].forEach((field) => {
      if (payload[field] === '' || payload[field] === undefined) {
        payload[field] = null;
      }
    });

    // ensure time-only values; optional: coerce '' to null
    ['arrive_time', 'depart_time'].forEach((k) => {
      if (!payload[k]) {
        payload[k] = null; // send null when empty
      } else {
        // keep 'HH:MM' as-is; PG time without time zone accepts it
        // If backend requires seconds, uncomment:
        // if (/^\d{2}:\d{2}$/.test(payload[k])) payload[k] = payload[k] + ':00';
      }
    });

    // map pic_ids_input -> pic_ids:int[]
    const picIds = String(payload.pic_ids_input || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(n => Number(n))
      .filter(n => Number.isInteger(n));
    payload.pic_ids = picIds;
    delete payload.pic_ids_input;

    try {
      if (isEdit) {
        await api.put(`/maintenance-records/${id}`, payload);
      } else {
        await api.post('/maintenance-records', payload);
      }
      history.push('/maintenance');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error saving maintenance record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid my-4">
      <form onSubmit={handleSubmit}>
        <div className="card shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center bg-light">
            <h4 className="mb-0">
              {isEdit ? `Edit Maintenance Record #${form.maintenance_id || id}` : 'Create New Maintenance Request'}
            </h4>
            <span className={`badge fs-6 rounded-pill bg-${form.status === 'Closed' ? 'success' : 'info'}`}>
              Status: {form.status}
            </span>
          </div>

          <div className="card-body p-4">
            {toast.show && <div className={`alert alert-${toast.type}`}>{toast.message}</div>}

            {/* --- Section 1: Core Request Information --- */}
            <h5 className="mt-2 border-bottom pb-2 mb-3">Core Request Information</h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Client</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions={false}              // load only after typing
                  loadOptions={loadClientOptions}     // Promise-based
                  isClearable
                  value={
                    form.client_id
                      ? { value: form.client_id, label: form.client_name || String(form.client_id) }
                      : null
                  }
                  onChange={handleClientChange}
                  placeholder="Type at least 2 letters to search clients..."
                  getOptionLabel={(opt) => opt.label} // enforce label rendering
                  getOptionValue={(opt) => String(opt.value)}
                  noOptionsMessage={() => 'No matching clients'}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Alias</label>
                <input
                  type="text"
                  name="alias"
                  className="form-control"
                  value={form.alias}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Job Note (from contract)</label>
                <input
                  type="text"
                  name="jobnote"
                  className="form-control"
                  value={form.jobnote}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Sales</label>
                <input
                  type="text"
                  name="sales"
                  className="form-control"
                  value={form.sales}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Service Code</label>
                <input
                  type="text"
                  name="service_code"
                  className="form-control"
                  value={form.service_code}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Location District</label>
                <input
                  type="text"
                  name="location_district"
                  className="form-control"
                  value={form.location_district}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 mb-3">
                <label className="form-label">Problem Description</label>
                <textarea
                  name="problem_description"
                  className="form-control"
                  rows="3"
                  value={form.problem_description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 mb-3">
                <div className="form-check">
                  <input
                    type="checkbox"
                    name="is_warranty"
                    className="form-check-input"
                    id="is_warranty"
                    checked={form.is_warranty}
                    onChange={handleChange}
                  />
                  <label className="form-check-label" htmlFor="is_warranty">Is Warranty?</label>
                </div>
              </div>
            </div>

            {/* --- Section 2: Maintenance Subject & Classification --- */}
            <h5 className="mt-3 border-bottom pb-2 mb-3">Maintenance Subject & Classification</h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Product Model</label>
                <input
                  type="text"
                  name="product_model"
                  className="form-control"
                  value={form.product_model}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Serial No.</label>
                <input
                  type="text"
                  name="serial_no"
                  className="form-control"
                  value={form.serial_no}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Support Method</label>
                <div className="form-check">
                  <input
                    type="radio"
                    id="support_method-Onsite"
                    name="support_method"
                    value="Onsite"
                    checked={form.support_method === "Onsite"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="support_method-Onsite" className="form-check-label">Onsite</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="support_method-Remote"
                    name="support_method"
                    value="Remote"
                    checked={form.support_method === "Remote"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="support_method-Remote" className="form-check-label">Remote</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="support_method-none"
                    name="support_method"
                    value=""
                    checked={form.support_method === "" || form.support_method === null || form.support_method === undefined}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="support_method-none" className="form-check-label">Not Set</label>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Symptom Classification</label>
                <div className="form-check">
                  <input
                    type="radio"
                    id="symptom_classification-Software"
                    name="symptom_classification"
                    value="Software"
                    checked={form.symptom_classification === "Software"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="symptom_classification-Software" className="form-check-label">Software</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="symptom_classification-Hardware"
                    name="symptom_classification"
                    value="Hardware"
                    checked={form.symptom_classification === "Hardware"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="symptom_classification-Hardware" className="form-check-label">Hardware</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="symptom_classification-none"
                    name="symptom_classification"
                    value=""
                    checked={form.symptom_classification === "" || form.symptom_classification === null || form.symptom_classification === undefined}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="symptom_classification-none" className="form-check-label">Not Set</label>
                </div>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Service Type</label>
                <div className="form-check">
                  <input
                    type="radio"
                    id="service_type-Preventive"
                    name="service_type"
                    value="Preventive"
                    checked={form.service_type === "Preventive"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="service_type-Preventive" className="form-check-label">Preventive</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="service_type-Maintenance"
                    name="service_type"
                    value="Maintenance"
                    checked={form.service_type === "Maintenance"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="service_type-Maintenance" className="form-check-label">Maintenance</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="service_type-Installation/ Training"
                    name="service_type"
                    value="Installation/ Training"
                    checked={form.service_type === "Installation/ Training"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="service_type-Installation/ Training" className="form-check-label">Installation/ Training</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="service_type-Technical Support"
                    name="service_type"
                    value="Technical Support"
                    checked={form.service_type === "Technical Support"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="service_type-Technical Support" className="form-check-label">Technical Support</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="service_type-none"
                    name="service_type"
                    value=""
                    checked={form.service_type === "" || form.service_type === null || form.service_type === undefined}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="service_type-none" className="form-check-label">Not Set</label>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Product Type</label>
                <div className="form-check">
                  <input
                    type="radio"
                    id="product_type-Emb"
                    name="product_type"
                    value="Emb"
                    checked={form.product_type === "Emb"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="product_type-Emb" className="form-check-label">Emb</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="product_type-Ser"
                    name="product_type"
                    value="Ser"
                    checked={form.product_type === "Ser"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="product_type-Ser" className="form-check-label">Ser</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="product_type-DS"
                    name="product_type"
                    value="DS"
                    checked={form.product_type === "DS"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="product_type-DS" className="form-check-label">DS</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="product_type-Other"
                    name="product_type"
                    value="Other"
                    checked={form.product_type === "Other"}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="product_type-Other" className="form-check-label">Other</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    id="product_type-none"
                    name="product_type"
                    value=""
                    checked={form.product_type === "" || form.product_type === null || form.product_type === undefined}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="product_type-none" className="form-check-label">Not Set</label>
                </div>
              </div>
            </div>

            {/* --- Section 3: Internal Assignment & Scheduling --- */}
            <h5 className="mt-3 border-bottom pb-2 mb-3">Internal Assignment & Scheduling</h5>
            <div className="row">
              <div className="col-md-12 mb-3">
                <label className="form-label">Assign PIC(s) / AE</label>
                <AsyncSelect
                  isMulti
                  cacheOptions
                  defaultOptions
                  loadOptions={loadPicOptions}        // Promise-based
                  isClearable
                  value={selectedPics}
                  onChange={handlePicsChange}
                  placeholder="Search users by name..."
                  getOptionLabel={(opt) => opt.label}
                  getOptionValue={(opt) => String(opt.value)}
                  noOptionsMessage={() => 'No matching users'}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Service Date</label>
                <input
                  type="date"
                  name="service_date"
                  className="form-control"
                  value={form.service_date || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Completion Date</label>
                <input
                  type="date"
                  name="completion_date"
                  className="form-control"
                  value={form.completion_date || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  name="status"
                  value={form.status || 'New'}
                  onChange={handleChange}
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 mb-3" />
            </div>

            {/* --- Section 4: Service Report & Closure --- */}
            <h5 className="mt-3 border-bottom pb-2 mb-3">Service Report & Closure</h5>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Arrive Time</label>
                <input
                  type="time"
                  name="arrive_time"
                  step="60" // minutes precision
                  value={form.arrive_time || ''} // 'HH:MM'
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Depart Time (fill to close)</label>
                <input
                  type="time"
                  name="depart_time"
                  step="60" // minutes precision
                  value={form.depart_time || ''} // 'HH:MM'
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 mb-3">
                <label className="form-label">Solution / Completed Task</label>
                <textarea
                  name="solution_details"
                  className="form-control"
                  rows="4"
                  value={form.solution_details}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Labor Details</label>
                <input
                  type="text"
                  name="labor_details"
                  className="form-control"
                  value={form.labor_details}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Parts Details</label>
                <input
                  type="text"
                  name="parts_details"
                  className="form-control"
                  value={form.parts_details}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12 mb-3">
                <label className="form-label">Remarks</label>
                <textarea
                  name="remark"
                  className="form-control"
                  rows="2"
                  value={form.remark}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="card-footer text-end bg-light">
            <button
              type="button"
              className="btn btn-secondary me-3"
              onClick={() => history.push('/maintenance')}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary px-4" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default MaintenanceRequestForm;