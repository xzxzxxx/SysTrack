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
          arrive_time: r.arrive_time ? r.arrive_time.substring(0, 16) : '',
          depart_time: r.depart_time ? r.depart_time.substring(0, 16) : '',
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
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
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

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForStatus(form.status);
    if (errors.length) {
      setToast({ show: true, type: 'danger', message: errors.join('; ') });
      setTimeout(() => setToast({ show: false, type: '', message: '' }), 2500);
      return;
    }

    const payload = {
      service_date: form.service_date || null,
      service_code: form.service_code,
      client_id: form.client_id,
      jobnote: form.jobnote,
      location_district: form.location_district || null,
      is_warranty: !!form.is_warranty,
      sales: form.sales || null,
      product_model: form.product_model || null,
      serial_no: form.serial_no || null,
      problem_description: form.problem_description || null,
      solution_details: form.solution_details || null,
      labor_details: form.labor_details || null,
      parts_details: form.parts_details || null,
      arrive_time: form.arrive_time || null,
      depart_time: form.depart_time || null,
      completion_date: form.completion_date || null,
      remark: form.remark || null,
      service_type: form.service_type || null,
      product_type: form.product_type || null,
      support_method: form.support_method || null,
      symptom_classification: form.symptom_classification || null,
      alias: form.alias || null,
      status: form.status, // target status
      pic_ids: form.pic_ids_input
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n)),
    };

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/maintenance-records/${id}`, payload);
        setToast({ show: true, type: 'success', message: 'Record updated' });
      } else {
        const res = await api.post('/maintenance-records', payload);
        setToast({ show: true, type: 'success', message: 'Record created' });
        // Navigate to edit page after creation
        history.push(`/maintenance/${res.data.maintenance_id}`);
      }
    } catch (err) {
      setToast({ show: true, type: 'danger', message: err.response?.data?.error || 'Save failed' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast({ show: false, type: '', message: '' }), 2000);
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
                <input
                  type="text"
                  name="support_method"
                  className="form-control"
                  value={form.support_method}
                  onChange={handleChange}
                  placeholder="e.g. On-site / Remote"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Symptom Classification</label>
                <input
                  type="text"
                  name="symptom_classification"
                  className="form-control"
                  value={form.symptom_classification}
                  onChange={handleChange}
                  placeholder="e.g. Hardware / Software"
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Service Type</label>
                <input
                  type="text"
                  name="service_type"
                  className="form-control"
                  value={form.service_type}
                  onChange={handleChange}
                  placeholder="e.g. Preventive / Corrective"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Product Type</label>
                <input
                  type="text"
                  name="product_type"
                  className="form-control"
                  value={form.product_type}
                  onChange={handleChange}
                />
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
                  value={form.status}
                  onChange={handleChange}
                >
                  <option>New</option>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Closed</option>
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
                  type="datetime-local"
                  name="arrive_time"
                  className="form-control"
                  value={form.arrive_time || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Depart Time (fill to close)</label>
                <input
                  type="datetime-local"
                  name="depart_time"
                  className="form-control"
                  value={form.depart_time || ''}
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