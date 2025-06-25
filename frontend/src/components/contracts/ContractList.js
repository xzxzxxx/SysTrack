import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import debounce from 'lodash.debounce';
import SearchBar from '../common/SearchBar';
import useColumnFilter from '../../utils/useColumnFilter';

function ContractList({ token }) {
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  const columns = [
    { key: 'contract_id', label: 'Contract ID' },
    { key: 'client_id', label: 'Client ID' },
    { key: 'client_code', label: 'Client Code' },
    { key: 'renew_code', label: 'Renew Code' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'client', label: 'Client' },
    { key: 'alias', label: 'Alias' },
    { key: 'jobnote', label: 'Job Note' },
    { key: 'sales', label: 'Sales' },
    { key: 'project_name', label: 'Project Name' },
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
  ];

  const { visibleColumns, toggleColumn, resetColumns } = useColumnFilter(columns, 'contract_columns');

  const fetchContracts = useCallback(
    debounce(async (searchTerm, page) => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/contracts', {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchTerm, page, limit: itemsPerPage }
        });
        setContracts(response.data.data);
        setTotalItems(response.data.total);
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to fetch contracts';
        setError(errorMsg);
        setToast({ show: true, message: errorMsg, type: 'danger' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } finally {
        setLoading(false);
      }
    }, 300),
    [token]
  );

  useEffect(() => {
    fetchContracts(search, currentPage);
  }, [search, currentPage, fetchContracts]);

  const handleDelete = async (contract_id) => {
    if (window.confirm('Are you sure you want to delete this contract?')) {
      setLoading(true);
      try {
        await axios.delete(`http://localhost:3000/api/contracts/${contract_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
        {/* Sidebar */}
        <div className="col-md-2 col-12 mb-3">
          <Link to="/contracts/new" className="btn btn-primary w-100 mb-2">
            Add New Contract
          </Link>
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search by contract ID, client code, or project name"
            isSearching={loading}
            className="w-100 mb-2"
          />
          <hr />
          <h5>Select Columns</h5>
          <div className="filter-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {columns
              .filter(col => !col.group)
              .map(col => (
                <div className="form-check" key={col.key}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={col.key}
                    checked={visibleColumns[col.key]}
                    onChange={() => toggleColumn(col.key)}
                  />
                  <label className="form-check-label" htmlFor={col.key}>
                    {col.label}
                  </label>
                </div>
              ))}
            <strong className="d-block mt-2">PIC</strong>
            {columns
              .filter(col => col.group === 'PIC')
              .map(col => (
                <div className="form-check ml-2" key={col.key}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={col.key}
                    checked={visibleColumns[col.key]}
                    onChange={() => toggleColumn(col.key)}
                  />
                  <label className="form-check-label" htmlFor={col.key}>
                    {col.label}
                  </label>
                </div>
              ))}
            <strong className="d-block mt-2">SLA</strong>
            {columns
              .filter(col => col.group === 'SLA')
              .map(col => (
                <div className="form-check ml-2" key={col.key}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={col.key}
                    checked={visibleColumns[col.key]}
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
        {/* Main Content */}
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
          {contracts.length === 0 && !loading ? (
            <p>No contracts found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    {columns.map(col => (
                      visibleColumns[col.key] && (
                        <th
                          key={col.key}
                          scope="col"
                          style={{
                            minWidth: col.key === 'project_name' ? '250px' : col.key === 'remarks' ? '200px' : 'auto',
                          }}
                        >
                          {col.label}
                        </th>
                      )
                    ))}
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(contract => (
                    <tr key={contract.contract_id}>
                      {columns.map(col => (
                        visibleColumns[col.key] && (
                          <td
                            key={col.key}
                            data-label={col.label}
                            style={{
                              minWidth: col.key === 'project_name' ? '250px' : col.key === 'remarks' ? '200px' : 'auto',
                            }}
                          >
                            {['start_date', 'end_date', 'created_at'].includes(col.key) ? (
                              contract[col.key] ? new Date(contract[col.key]).toISOString().split('T')[0] : '-'
                            ) : col.key === 'contract_status' ? (
                              <span
                                className={`badge badge-${
                                  contract.contract_status === 'New' ? 'success' : 'primary'
                                }`}
                              >
                                {contract.contract_status || '-'}
                              </span>
                            ) : (
                              contract[col.key] || '-'
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