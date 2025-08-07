import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { Link, useLocation, useHistory } from 'react-router-dom';
import debounce from 'lodash.debounce';
import SearchBar from '../common/SearchBar';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import useColumnFilter from '../../utils/useColumnFilter';
import './ContractList.css';

// Component to display and manage a list of contracts
function ContractList({ token }) {
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showNoContractsPopup, setShowNoContractsPopup] = useState(false);
  const itemsPerPage = 50;

  const location = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(location.search);
  const projectId = searchParams.get('project_id');

  // statuses filter
  const [selectedStatuses, setSelectedStatuses] = useState(['Active']);
  const statusOptions = ['Active', 'Pending', 'Expiring Soon', 'Expired'];

  // Define all columns with groups for organized filtering
  // Groups (PIC and SLA) help categorize related columns for user convenience
  const columns = [
    { key: 'contract_id', label: 'Contract ID' },
    { key: 'client_id', label: 'Client ID' },
    { key: 'client_code', label: 'Client Code' },
    { key: 'renew_code', label: 'Renew Code' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'client_name', label: 'Client' },
    { key: 'alias', label: 'Alias' },
    { key: 'jobnote', label: 'Job Note' },
    { key: 'sales', label: 'Sales' },
    { key: 'contract_name', label: 'Contract Name' },
    { key: 'location', label: 'Location' },
    { key: 'category', label: 'Category' },
    { key: 'contract_status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
    { key: 't1', label: 'T1', group: 'PIC' },
    { key: 't2', label: 'T2', group: 'PIC' },
    { key: 't3', label: 'T3', group: 'PIC' },
    { key: 'period', label: 'Period', group: 'SLA' },
    { key: 'response_time', label: 'Response Time', group: 'SLA' },
    { key: 'service_time', label: 'Service Time', group: 'SLA' },
    { key: 'spare_parts_provider', label: 'Spare Parts Provider', group: 'SLA' },
    { key: 'preventive', label: 'Preventive', group: 'SLA' },
    { key: 'report', label: 'Report', group: 'SLA' },
    { key: 'other', label: 'Other', group: 'SLA' },
    { key: 'user_id', label: 'User ID' },
    { key: 'created_at', label: 'Created At' },
    { key: 'project_name', label: 'Project Name' },
  ];

  const { visibleColumns, toggleColumn, resetColumns, order, reorderColumns } = useColumnFilter(columns, 'contract_columns_v2');

  const statusColors = {
    'Active': 'bg-success',
    'Expiring Soon': 'bg-warning',
    'Expired': 'bg-danger',
    'Pending': 'bg-secondary'
  };

  const fetchContracts = useCallback(
    debounce(async (searchTerm, page, statuses) => {
      if (!token) return;
      setLoading(true);
      try {
        const params = { search: searchTerm, page, limit: itemsPerPage };
        if (projectId) {
          params.project_id = projectId;
        }
        if (statuses.length > 0) {
          // Join the array into a comma-separated string, e.g., "Active,Expired"
          params.statuses = statuses.join(','); 
        }

        const response = await api.get('/contracts', { params });
        const data = response.data.data;
        if (projectId && data.length === 0) {
          setShowNoContractsPopup(true);
        } else {
          setContracts(data);
          setTotalItems(response.data.total);
        }
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to fetch contracts';
        setError(errorMsg);
        setToast({ show: true, message: errorMsg, type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } finally {
        setLoading(false);
      }
    }, 300),
    [token, projectId]
  );

  useEffect(() => {
    fetchContracts(search, currentPage, selectedStatuses);
  }, [search, currentPage, fetchContracts, selectedStatuses]);

  const handleDelete = async (contract_id) => {
    if (window.confirm('Are you sure you want to delete this contract?')) {
      setLoading(true);
      try {
        await api.delete(`/contracts/${contract_id}`);
        setContracts(contracts.filter(contract => contract.contract_id !== contract_id));
        setTotalItems(prev => prev - 1);
        setToast({ show: true, message: 'Contract deleted successfully', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to delete contract';
        setError(errorMsg);
        setToast({ show: true, message: errorMsg, type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleReturnToContracts = () => {
    setShowNoContractsPopup(false);
    history.push('/contracts');
  };

  const handleStatusToggle = (statusToToggle) => {
    // Logic to add or remove status from the selected list
    setSelectedStatuses(prevStatuses => {
      if (prevStatuses.includes(statusToToggle)) {
        // If status is already selected, remove it
        return prevStatuses.filter(status => status !== statusToToggle);
      } else {
        // Otherwise, add it
        return [...prevStatuses, statusToToggle];
      }
    });
    // Reset to page 1 when filter changes
    setCurrentPage(1);
  };

  // Handle drag-and-drop reordering of column headers
  // This function updates the order array when a column is dragged and dropped
  const onDragEnd = (result) => {
    if (!result.destination) return; // Exit if dropped outside droppable area
    reorderColumns(result.source.index, result.destination.index);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h2 className="my-4">Contracts</h2>
        </div>
      </div>
      <div className="row">
        <div className="col-md-2 col-12 mb-3">
          <Link to="/contracts/new" className="btn btn-primary w-100 mb-2">
            Add New Contract
          </Link>
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search by Contract Name, Client, Job Note, or Location..."
            isSearching={loading}
            className="w-100 mb-2"
          />
          <hr />
          <h5>Select Columns</h5>
          <div className="filter-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {/* Render checkboxes for columns without a group */}
            {/* These are general columns not categorized under PIC or SLA */}
            {columns
              .filter(col => !col.group)
              .map(col => (
                <div className="form-check" key={col.key}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={col.key}
                    checked={visibleColumns[col.key] || false} // Default to false if undefined
                    onChange={() => toggleColumn(col.key)}
                  />
                  <label className="form-check-label" htmlFor={col.key}>
                    {col.label}
                  </label>
                </div>
              ))}

            {/* Render checkboxes for PIC group columns */}
            {/* PIC stands for Personnel In Charge, grouping related team columns */}
            <strong className="d-block mt-2">PIC</strong>
            {columns
              .filter(col => col.group === 'PIC')
              .map(col => (
                <div className="form-check ml-2" key={col.key}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={col.key}
                    checked={visibleColumns[col.key] || false}
                    onChange={() => toggleColumn(col.key)}
                  />
                  <label className="form-check-label" htmlFor={col.key}>
                    {col.label}
                  </label>
                </div>
              ))}

            {/* Render checkboxes for SLA group columns */}
            {/* SLA stands for Service Level Agreement, grouping service-related columns */}
            <strong className="d-block mt-2">SLA</strong>
            {columns
              .filter(col => col.group === 'SLA')
              .map(col => (
                <div className="form-check ml-2" key={col.key}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={col.key}
                    checked={visibleColumns[col.key] || false}
                    onChange={() => toggleColumn(col.key)}
                  />
                  <label className="form-check-label" htmlFor={col.key}>
                    {col.label}
                  </label>
                </div>
              ))}

            <button className="btn btn-secondary w-100 mt-2" onClick={resetColumns}>
              Reset to All
            </button>
          </div>
        </div>
        <div className="col-md-10 col-12">
          {toast.show && (
            <div className={`alert alert-${toast.type} alert-dismissible fade show`} role="alert">
              {toast.message}
              <button
                type="button"
                className="close"
                onClick={() => setToast({ show: false, message: '', type: '' })}
              >
                <span>×</span>
              </button>
            </div>
          )}
          {error && !loading && !toast.show && <div className="alert alert-danger">{error}</div>}
          {contracts.length === 0 && !loading && !showNoContractsPopup && <p>No contracts found.</p>}
          {/* START: New Status Filter Bar */}
          <div className="status-filter-bar mb-3">
            {statusOptions.map(status => (
              <button
                key={status}
                onClick={() => handleStatusToggle(status)}
                className={`status-filter-item ${selectedStatuses.includes(status) ? 'active' : ''}`}
              >
                {status}
              </button>
            ))}
          </div>
          {/* END: New Status Filter Bar */}
          {contracts.length > 0 && (
            <div className="table">
              <table className="table table-striped">
                <DragDropContext onDragEnd={onDragEnd}>
                  <thead>
                    <Droppable droppableId="columnHeaders" direction="horizontal">
                      {(provided) => (
                        <tr ref={provided.innerRef} {...provided.droppableProps}>
                          {/* Render draggable column headers based on order array */}
                          {/* Only visible columns are shown, reordered by user drag */}
                          {order.map((key, index) => (
                            visibleColumns[key] && (
                              <Draggable key={key} draggableId={key} index={index}>
                                {(provided) => (
                                  <th
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    key={key}
                                    scope="col"
                                    style={{
                                      ...provided.draggableProps.style,
                                      whiteSpace: 'nowrap', // Prevent header text from wrapping
                                      minWidth: key === 'contract_name' ? '250px' : key === 'remarks' ? '200px' : 'auto',
                                      cursor: 'move', // Indicates draggable column
                                      backgroundColor: '#f8f9fa', // Light background for visibility
                                      padding: '8px',
                                    }}
                                  >
                                    {columns.find(col => col.key === key).label}
                                  </th>
                                )}
                              </Draggable>
                            )
                          ))}
                          {provided.placeholder}
                          {/* Actions column remains fixed and non-draggable */}
                          <th scope="col" style={{ cursor: 'default' }}>Actions</th>
                        </tr>
                      )}
                    </Droppable>
                  </thead>
                </DragDropContext>
                <tbody>
                  {/* Render table rows based on reordered and filtered columns */}
                  {contracts.map(contract => (
                    <tr key={contract.contract_id}>
                      {order.map((key) => (
                        visibleColumns[key] && (
                          <td
                            key={key}
                            data-label={columns.find(col => col.key === key).label}
                            style={{
                              minWidth: key === 'contract_name' ? '250px' : key === 'remarks' ? '200px' : 'auto',
                            }}
                          >
                            {['start_date', 'end_date', 'created_at'].includes(key) ? (
                              contract[key] ? new Date(contract[key]).toISOString().split('T')[0] : '-'
                            ) : key === 'contract_status' ? (
                              <span className={`badge ${statusColors[contract.contract_status] || 'bg-light text-dark'}`}>
                                {contract.contract_status || '-'}
                              </span>
                            ) : key === 'project_name' ? (
                              contract.project_name || '-'
                            ) : (
                              contract[key] || '-'
                            )}
                          </td>
                        )
                      ))}
                      <td data-label="Actions">
                        <Link
                          to={`/contracts/${contract.contract_id}/edit`}
                          className="btn btn-sm btn-warning mr-2"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(contract.contract_id)}
                          className="btn btn-sm btn-danger"
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {loading && (
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          )}
          {showNoContractsPopup && (
            <div className="modal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">No Contracts Found</h5>
                    <button type="button" className="close" onClick={() => setShowNoContractsPopup(false)}>
                      <span>&times;</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <p>No contracts are associated with this project.</p>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-primary" onClick={handleReturnToContracts}>
                      Return to Contracts
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span>
              Showing {startItem} to {endItem} of {totalItems} entries
            </span>
            <nav>
              <ul className="pagination">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <li
                    key={page}
                    className={`page-item ${currentPage === page ? 'active' : ''}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractList;