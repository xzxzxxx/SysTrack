import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Projects({ token }) {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axios.get('http://localhost:3000/api/projects', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        setProjects(response.data);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to fetch projects');
      })
      .finally(() => setLoading(false));
  }, [token]);

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
        projects.map(project => (
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
        ))
      )}
    </div>
  );
}

export default Projects;