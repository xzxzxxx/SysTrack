import React from 'react';

// This component now only renders the form group for filters.
// The title and container are handled by the parent component (MaintenanceRequestList).
function MaintenanceSearchFilters({ filters, onFilterChange }) {
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  return (
    // We removed the outer card and row to let the elements stack vertically by default.
    <div>
      {/* Service Code Filter */}
      <div className="mb-2">
        <label htmlFor="service_code_filter" className="form-label small">Service Code</label>
        <input
          type="text"
          id="service_code_filter"
          name="service_code"
          className="form-control form-control-sm"
          value={filters.service_code || ''}
          onChange={handleChange}
          placeholder="Search by Code..."
        />
      </div>

      {/* Client Name Filter */}
      <div className="mb-2">
        <label htmlFor="client_name_filter" className="form-label small">Client Name</label>
        <input
          type="text"
          id="client_name_filter"
          name="client_name"
          className="form-control form-control-sm"
          value={filters.client_name || ''}
          onChange={handleChange}
          placeholder="Search by Client..."
        />
      </div>

      {/* Job Note Filter */}
      <div className="mb-2">
        <label htmlFor="jobnote_filter" className="form-label small">Job Note</label>
        <input
          type="text"
          id="jobnote_filter"
          name="jobnote"
          className="form-control form-control-sm"
          value={filters.jobnote || ''}
          onChange={handleChange}
          placeholder="Search in Job Note..."
        />
      </div>

      {/* PIC (AE) Name Filter */}
      <div className="mb-2">
        <label htmlFor="ae_name_filter" className="form-label small">PIC / AE Name</label>
        <input
          type="text"
          id="ae_name_filter"
          name="ae_name"
          className="form-control form-control-sm"
          value={filters.ae_name || ''}
          onChange={handleChange}
          placeholder="Search by PIC..."
        />
      </div>
    </div>
  );
}

export default MaintenanceSearchFilters;