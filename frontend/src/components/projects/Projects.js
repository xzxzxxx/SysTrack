import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { Link } from 'react-router-dom';
import SearchBar from '../common/SearchBar';
import debounce from 'lodash.debounce';

// Component to display a paginated list of projects
function Projects({ token }) {
  const [projects, setProjects] = useState([]); // List of projects for current page
  const [error, setError] = useState(''); // Error message for API failures
  const [initialLoading, setInitialLoading] = useState(true);
  const [page, setPage] = useState(1); // Current page number
  const [limit] = useState(10); // Number of projects per page
  const [total, setTotal] = useState(0); // Total number of projects
  const [search, setSearch] = useState('');
  

  // This is the same pattern used in ContractList.js
  const fetchProjects = useCallback(
    debounce(async (searchTerm, pageNum, isInitialLoad) => {
      if (isInitialLoad) {
        setInitialLoading(true);
      }
      try {
        const response = await api.get('/projects', {
          params: {
            page: pageNum,
            limit,
            search: searchTerm,
          },
        });
        setProjects(response.data.data);
        setTotal(response.data.total);
        setError(''); // Clear previous errors on a successful search
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch projects');
      } finally {
        if (isInitialLoad) {
          setInitialLoading(false);
        }
      }
    }, 500), // 500ms delay after the user stops typing
    [token, limit] // Dependencies for useCallback
  );

  // This useEffect now calls our new debounced function
  useEffect(() => {
    fetchProjects(search, page, true);
  }, [page, fetchProjects]);

  // It does NOT set the loading state, providing a smoother experience.
  useEffect(() => {
    // We check if it's not the initial state to avoid a double fetch on mount
    if (!initialLoading) {
      fetchProjects(search, 1); // Always reset to page 1 on search
    }
  }, [search, fetchProjects, initialLoading]);


  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  // Handle page navigation
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleSearchChange = (newSearchTerm) => {
    // Only update the search term. The useEffect will handle the rest.
    setSearch(newSearchTerm);
  };

  // Show loading spinner or error message if applicable
  if (initialLoading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h2 className="my-4">Projects</h2>
        </div>
      </div>
      <SearchBar
        value={search}
        onChange={handleSearchChange}
        placeholder="Search by project name or client..."
      />
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {projects.length === 0 ? (
        <p>No projects found.</p>
      ) : (
        <>
          {projects.map(project => (
            <div key={project.project_id} className="card mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">{project.project_name}</h5>
                  <div className="text-muted small">
                    ID: {project.project_id} | Client: {project.client_name || '-'} | User: {project.username || '-'} | Date: {new Date(project.created_at).toISOString().split('T')[0]} | Total : {project.contract_count || '-' }
                  </div>
                </div>
                <Link
                  to={`/contracts?project_id=${project.project_id}`}
                  className="btn btn-primary btn-sm"
                >
                  View Contracts
                </Link>
              </div>
            </div>
          ))}
          {/* Pagination controls */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <button
              className="btn btn-outline-primary"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages} (Total: {total} projects)
            </span>
            <button
              className="btn btn-outline-primary"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Projects;