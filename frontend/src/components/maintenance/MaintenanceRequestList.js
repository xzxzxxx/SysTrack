import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useHistory } from 'react-router-dom';
import api from '../../utils/api';
import debounce from 'lodash.debounce';
import MaintenanceSearchFilters from './MaintenanceSearchFilters'; // Import the new search component
import Pagination from '../common/Pagination';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import useColumnFilter from '../../utils/useColumnFilter';
import './MaintenanceRequestList.css';

// The main component for displaying and managing maintenance records
function MaintenanceRequestList({ token }) {
  // State for data and UI control
  const history = useHistory();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  // State for filtering
  const [selectedStatuses, setSelectedStatuses] = useState(['New', 'Pending', 'In Progress']);
  const statusOptions = ['New', 'Pending', 'In Progress', 'Closed'];

  // This object will hold all our search query values, e.g., { service_code: 'abc', client_name: 'xyz' }
  const [filters, setFilters] = useState({});

  // State for sorting (to be implemented later, but let's add the state now)
  const [sortConfigs, setSortConfigs] = useState([{ key: 'maintenance_id', direction: 'desc' }]);

  const columns = [
    { key: 'maintenance_id', label: 'ID', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'service_date', label: 'Service Date', sortable: true },
    { key: 'service_code', label: 'Service Code', sortable: true },
    { key: 'client_name', label: 'Client', sortable: true },
    { key: 'alias', label: 'Alias' },
    { key: 'client_code', label: 'Client Code' },
    { key: 'jobnote', label: 'Job Note' },
    { key: 'is_warranty', label: 'Warranty' },
    { key: 'sales', label: 'Sales' },
    { key: 'product_model', label: 'Product Model' },
    { key: 'serial_no', label: 'Serial No.' },
    { key: 'problem_description', label: 'Problem Description' },
    { key: 'solution_details', label: 'Solution Details' },
    { key: 'pics', label: 'PICs' },
    { key: 'labor_details', label: 'Labor Details' },
    { key: 'parts_details', label: 'Parts Details' },
    { key: 'arrive_time', label: 'Arrive Time' },
    { key: 'depart_time', label: 'Depart Time' },
    { key: 'completion_date', label: 'Completion Date' },
    { key: 'remark', label: 'Remark' },
    { key: 'service_type', label: 'Service Type' },
    { key: 'product_type', label: 'Product Type' },
    { key: 'support_method', label: 'Support Method' },
    { key: 'symptom_classification', label: 'Symptom Classification' },
    { key: 'creator_username', label: 'Created By', sortable: true },
    { key: 'created_at', label: 'Created At', sortable: true },
    { key: 'updated_at', label: 'Updated At', sortable: true },
  ];


  // useColumnFilter hook
  const { visibleColumns, toggleColumn, resetColumns, order, reorderColumns } = useColumnFilter(columns, 'maintenance_columns_v1');

  const statusColors = {
    'New': 'bg-primary',
    'Pending': 'bg-secondary',
    'In Progress': 'bg-warning text-dark',
    'Closed': 'bg-success',
  };

  // Debounced API fetch function
  const fetchRecords = useCallback(debounce(async (page, statuses, currentFilters, sortCfgs) => {
    if (!token) return;
    setLoading(true);
    
    // Construct parameters for the API call
    const params = {
      page,
      limit: itemsPerPage,
      ...currentFilters, // Spread the filter object directly into params
    };

    if (statuses.length > 0) {
      params.statuses = statuses.join(',');
    }
    
    // Add sorting parameters (to be used later)
    sortCfgs.forEach((config, index) => {
      params[`sort_by_${index + 1}`] = config.key;
      params[`sort_dir_${index + 1}`] = config.direction;
    });

    try {
      const response = await api.get('/maintenance-records', { params });
      setRecords(response.data.data);
      setTotalItems(response.data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch maintenance records.');
    } finally {
      setLoading(false);
    }
  }, 300), [token]);

  // useEffect to trigger fetch when dependencies change
  useEffect(() => {
    fetchRecords(currentPage, selectedStatuses, filters, sortConfigs);
  }, [currentPage, selectedStatuses, filters, sortConfigs, fetchRecords]);

  // Handler for when any search filter input changes
  const handleFilterChange = (field, value) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [field]: value
    }));
    setCurrentPage(1); // Reset to page 1 on new search
  };

  const handleStatusToggle = (statusToToggle) => {
    setSelectedStatuses(prev => 
      prev.includes(statusToToggle) 
        ? prev.filter(s => s !== statusToToggle) 
        : [...prev, statusToToggle]
    );
    setCurrentPage(1);
  };

  // Drag and drop handlers
  const onDragEnd = (result) => {
    if (!result.destination) return;
    reorderColumns(result.source.index, result.destination.index);
  };
  
  // Create a handler function for sorting
  const handleSort = (clickedKey, event) => {
    setSortConfigs(prevConfigs => {
      const isMultiSort = event.shiftKey;
      if (isMultiSort) {
        const newConfigs = [...prevConfigs];
        const existingIndex = newConfigs.findIndex(c => c.key === clickedKey);
        if (existingIndex > -1) {
          if (newConfigs[existingIndex].direction === 'asc') {
            newConfigs[existingIndex].direction = 'desc';
          } else {
            newConfigs.splice(existingIndex, 1);
          }
        } else if (newConfigs.length < 2) {
          newConfigs.push({ key: clickedKey, direction: 'asc' });
        }
        return newConfigs.length > 0 ? newConfigs : [{ key: 'maintenance_id', direction: 'desc' }];
      } else {
        const currentSort = prevConfigs.length > 0 && prevConfigs[0];
        if (currentSort && currentSort.key === clickedKey) {
          return [{ key: clickedKey, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' }];
        }
        return [{ key: clickedKey, direction: 'asc' }];
      }
    });
    setCurrentPage(1);
  };

  // Create a handler function to pass to the Pagination component
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };
  
  // Placeholder for the table rendering (we will build this out next)
  return (
    <div className="container-fluid mt-4">
      <h2 className="mb-4">Maintenance Requests</h2>
      <div className="row">
        {/* Left Sidebar for Filters */}
        <div className="col-md-2 col-12 mb-3">
          <button 
            className="btn btn-primary w-100 mb-2"
            onClick={() => history.push('/maintenance/new')}
          >
            Add New Request
          </button>
          <hr />
          <h5>Search Filters</h5>
          <MaintenanceSearchFilters filters={filters} onFilterChange={handleFilterChange} />
          <hr />
          <h5>Select Columns</h5>
          <div className="filter-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {columns.map(col => (
              <div className="form-check" key={col.key}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`col-${col.key}`}
                  checked={visibleColumns[col.key] || false}
                  onChange={() => toggleColumn(col.key)}
                />
                <label className="form-check-label" htmlFor={`col-${col.key}`}>
                  {col.label}
                </label>
              </div>
            ))}
            <button className="btn btn-secondary w-100 mt-2" onClick={resetColumns}>
              Reset Columns
            </button>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="col-md-10 col-12">
          {error && <div className="alert alert-danger">{error}</div>}
          
          {/* Status Filter Bar */}
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
          
          {/* The Data Table with Draggable Headers */}
          <div className="table-responsive">
            {loading ? (
              <div className="d-flex justify-content-center my-5"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>
            ) : records.length === 0 ? (
              <p>No maintenance records found.</p>
            ) : (
              <table className="table table-striped">
                <DragDropContext onDragEnd={onDragEnd}>
                  <thead className="thead-light">
                    <Droppable droppableId="columnHeaders" direction="horizontal">
                      {(provided) => (
                        <tr ref={provided.innerRef} {...provided.droppableProps}>
                          {order.map((key, index) => {
                            const column = columns.find(c => c.key === key);
                            if (!column || !visibleColumns[key]) return null;

                            const sortConfig = sortConfigs.find(c => c.key === key);
                            const sortIndex = sortConfig ? sortConfigs.indexOf(sortConfig) + 1 : -1;

                            return (
                              <Draggable key={key} draggableId={key} index={index}>
                                {(provided) => (
                                  <th
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    style={{ ...provided.draggableProps.style, whiteSpace: 'nowrap' }}
                                  >
                                    <div className="d-flex align-items-center justify-content-between">
                                      {/* Clickable area for sorting */}
                                      <span
                                        onClick={column.sortable ? (e) => handleSort(key, e) : undefined}
                                        className={column.sortable ? 'clickable-header' : ''}
                                        style={{ flexGrow: 1 }}
                                      >
                                        {column.label}
                                        {column.sortable && (
                                          <span className={`ms-2 sort-arrow ${sortConfig ? 'sort-arrow-active' : ''}`}>
                                            {sortConfig?.direction === 'asc' ? '▲' : '▼'}
                                            {sortConfig && <small className="badge rounded-pill bg-light text-dark ms-1">{sortIndex}</small>}
                                          </span>
                                        )}
                                      </span>
                                      {/* Drag handle */}
                                      <span {...provided.dragHandleProps} className="ms-2 drag-handle">⠿</span>
                                    </div>
                                  </th>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          <th style={{ cursor: 'default' }}>Actions</th>
                        </tr>
                      )}
                    </Droppable>
                  </thead>
                </DragDropContext>
                <tbody>
                  {records.map(record => (
                    <tr key={record.maintenance_id}>
                      {order.map(key => 
                        visibleColumns[key] && (
                          <td key={key}>
                            {
                              key === 'status' ? (
                                <span className={`badge ${statusColors[record.status] || 'bg-light text-dark'}`}>
                                  {record.status}
                                </span>
                              ) : key === 'pics' ? (
                                // This correctly displays the list of PICs from our API
                                record.pics?.map(pic => pic.username).join(', ') || '-'
                              ) : key === 'is_warranty' ? (
                                record.is_warranty ? 'Yes' : 'No'
                              ) : ['service_date', 'created_at'].includes(key) ? (
                                record[key] ? new Date(record[key]).toLocaleDateString() : '-'
                              ) : (
                                record[key] || '-'
                              )
                            }
                          </td>
                        )
                      )}
                      <td>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => history.push(`/maintenance/${record.maintenance_id}/edit`)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
            </span>
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaintenanceRequestList