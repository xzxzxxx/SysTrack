import React from 'react';

// This component renders the search inputs for the maintenance list.
// It receives the current filter values and a handler to call when any filter changes.
function MaintenanceSearchFilters({ filters, onFilterChange }) {
  
  // A helper function to handle input changes and call the parent's handler.
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h5 className="card-title">Search Filters</h5>
        <div className="row">
          <div className="col-md-3 mb-2">
            <label htmlFor="service_code_filter" className="form-label">Service Code</label>
            <input
              type="text"
              id="service_code_filter"
              name="service_code"
              className="form-control form-control-sm"
              value={filters.service_code || ''}
              onChange={handleChange}
              placeholder="Search by Service Code..."
            />
          </div>
          <div className="col-md-3 mb-2">
            <label htmlFor="client_name_filter" className="form-label">Client Name</label>
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
          <div className="col-md-3 mb-2">
            <label htmlFor="job_note_filter" className="form-label">Job Note</label>
            <input
              type="text"
              id="job_note_filter"
              name="job_note"
              className="form-control form-control-sm"
              value={filters.job_note || ''}
              onChange={handleChange}
              placeholder="Search in Job Note..."
            />
          </div>
          {/* You can add more filter inputs here for other fields like location, AE, etc. */}
        </div>
      </div>
    </div>
  );
}

export default MaintenanceSearchFilters;