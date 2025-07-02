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

  const toggleExpand = (projectId) => {
    setProjects(projects.map(project =>
      project.project_id === projectId
        ? { ...project, isExpanded: !project.isExpanded }
        : project
    ));
  };

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
            <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => toggleExpand(project.project_id)}>
              <h5 className="mb-0 d-flex justify-content-between align-items-center">
                {project.project_name} 
                <span>{project.isExpanded ? '▼' : '▶'}</span>
              </h5>
              <div className="text-muted small">
                ID: {project.project_id} | Client: {project.client_name || '-'} | User: {project.username || '-'} | Date: {new Date(project.created_at).toISOString().split('T')[0]}
              </div>
            </div>
            {project.isExpanded && project.contracts.length > 0 && (
              <div className="card-body" style={{ display: project.isExpanded ? 'block' : 'none' }}>
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Contract ID</th>
                      <th>Contract Name</th>
                      <th>Client</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.contracts.map(contract => (
                      <tr key={contract.contract_id}>
                        <td>{contract.contract_id}</td>
                        <td>{contract.contract_name || '-'}</td>
                        <td>{contract.client || '-'}</td>
                        <td>{contract.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : '-'}</td>
                        <td>{contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '-'}</td>
                        <td>
                          <span className={`badge bg-${contract.contract_status === 'New' ? 'success' : 'primary'}`} style={{ fontSize: '1rem', padding: '0.4em 0.8em' }}>
                            {contract.contract_status || '-'}
                          </span>
                        </td>
                        <td>
                          <Link to={`/contracts/${contract.contract_id}/edit`} className="btn btn-sm btn-warning mr-2">Edit</Link>
                          <button onClick={() => handleDelete(contract.contract_id)} className="btn btn-sm btn-danger">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {project.isExpanded && project.contracts.length === 0 && (
              <div className="card-body">No contracts associated with this project.</div>
            )}
          </div>
        ))
      )}
    </div>
  );

  // Placeholder for delete (to be implemented with state update)
  const handleDelete = (contract_id) => {
    // Implement delete logic similar to ContractList.js if needed
    console.log('Delete contract:', contract_id);
  };
}

export default Projects;