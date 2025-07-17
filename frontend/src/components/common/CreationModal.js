import React, { useState, useEffect } from 'react';

const CreationModal = ({ show, onClose, onSave, title, fields, warningText }) => {
  const [formData, setFormData] = useState({});

  // Reset form when the modal is opened for a new creation
  useEffect(() => {
    if (show) {
      const initialState = fields.reduce((acc, field) => {
        acc[field.name] = '';
        return acc;
      }, {});
      setFormData(initialState);
    }
  }, [show, fields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Basic validation: check if the first required field is filled
    if (fields[0].required && !formData[fields[0].name]) {
      alert(`Please fill in the required field: ${fields[0].label}`);
      return;
    }
    onSave(formData);
  };

  if (!show) {
    return null;
  }

  return (
    <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {warningText && <p className="alert alert-warning small">{warningText}</p>}
            {fields.map(field => (
              <div className="mb-3" key={field.name}>
                <label htmlFor={field.name} className="form-label">
                  {field.label}
                  {field.required && <span className="text-danger">*</span>}
                </label>
                <input
                  type={field.type || 'text'}
                  className="form-control"
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  required={field.required}
                />
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreationModal;