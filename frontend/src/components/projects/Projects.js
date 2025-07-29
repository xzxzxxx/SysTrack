import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Link } from 'react-router-dom';

// Component to display a paginated list of projects
function Projects({ token }) {
  const [projects, setProjects] = useState([]); // List of projects for current page
  const [error, setError] = useState(''); // Error message for API failures
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [page, setPage] = useState(1); // Current page number
  const [limit] = useState(10); // Number of projects per page
  const [total, setTotal] = useState(0); // Total number of projects

  // Fetch projects when token, page, or limit changes
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.get('/projects', {
      params: { page, limit } // Send pagination parameters
    })
      .then(response => {
        setProjects(response.data.data); // Set projects from response.data.data
        setTotal(response.data.total); // Set total count
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to fetch projects');
      })
      .finally(() => setLoading(false));
  }, [token, page, limit]);

  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  // Handle page navigation
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Show loading spinner or error message if applicable
  if (loading) return <div className="spinner-border" role="status"><span className="sr-only">Loading...</span></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h2 className="my-4">Projects</h2>
        </div>
      </div>
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
                    ID: {project.project_id} | Client: {project.client_name || '-'} | User: {project.username || '-'} | Date: {new Date(project.created_at).toISOString().split('T')[0]}
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