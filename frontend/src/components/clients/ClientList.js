import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import debounce from 'lodash.debounce';
import SearchBar from '../common/SearchBar';
import useColumnFilter from '../../utils/useColumnFilter';

function ClientList({ token }) {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('no_of_orders');
  const [sortOrder, setSortOrder] = useState('desc');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  const columns = [
    { key: 'client_id', label: 'ID' },
    { key: 'client_name', label: 'Name' },
    { key: 'dedicated_number', label: 'Dedicated Number' },
    { key: 'no_of_orders', label: 'Orders' },
    { key: 'no_of_renew', label: 'Renewals' },
  ];

  const { visibleColumns, toggleColumn, resetColumns } = useColumnFilter(columns, 'client_columns');

  const fetchClients = useCallback(
    debounce(async (searchTerm, sortByVal, sortOrderVal, page) => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/clients', {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: searchTerm, sortBy: sortByVal, sortOrder: sortOrderVal, page, limit: itemsPerPage }
        });
        setClients(response.data.data);
        setTotalItems(response.data.total);
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to fetch clients';
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
    fetchClients(search, sortBy, sortOrder, currentPage);
  }, [search, sortBy, sortOrder, currentPage, fetchClients]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setLoading(true);
      try {
        await axios.delete(`http://localhost:3000/api/clients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClients(clients.filter(client => client.client_id !== id));
        setTotalItems(prev => prev - 1);
        setToast({ show: true, message: 'Client deleted successfully', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to delete client';
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

  const handleSortChange = (e) => {
    const [newSortBy, newSortOrder] = e.target.value.split(':');
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
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
          <h2 className="my-4">Clients</h2>
        </div>
      </div>
      <div className="row">
        {/* Sidebar */}
        <div className="col-md-3 col-12 mb-3">
          <Link to="/clients/new" className="btn btn-primary w-100 mb-2">
            Add New Client
          </Link>
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search by name, dedicated number, or ID"
            isSearching={loading}
            className="w-100 mb-2"
          />
          <select
            className="form-control w-100 mb-2"
            onChange={handleSortChange}
            value={`${sortBy}:${sortOrder}`}
          >
            <option value="no_of_orders:desc">Orders (High to Low)</option>
            <option value="no_of_orders:asc">Orders (Low to High)</option>
            <option value="no_of_renew:desc">Renewals (High to Low)</option>
            <option value="no_of_renew:asc">Renewals (Low to High)</option>
          </select>
          <hr />
          <h5>Select Columns</h5>
          <div className="filter-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {columns.map(col => (
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
            <button className="btn btn-secondary w-100 mt-2" onClick={resetColumns}>
              Reset to All
            </button>
          </div>
        </div>
        {/* Main Content */}
        <div className="col-md-9 col-12">
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
          {clients.length === 0 && !loading ? (
            <p>No clients found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    {columns.map(col => (
                      visibleColumns[col.key] && (
                        <th key={col.key} scope="col">
                          {col.label}
                        </th>
                      )
                    ))}
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => (
                    <tr key={client.client_id}>
                      {columns.map(col => (
                        visibleColumns[col.key] && (
                          <td key={col.key} data-label={col.label}>
                            {client[col.key] || '-'}
                          </td>
                        )
                      ))}
                      <td data-label="Actions">
                        <Link
                          to={`/clients/${client.client_id}/edit`}
                          className="btn btn-sm btn-warning mr-2"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(client.client_id)}
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

export default ClientList;