import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Dashboard({ token }) {
  const [stats, setStats] = useState({ clients: 0, contracts: 0, expiring: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [clientsRes, contractsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:3000/api/contracts', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const expiring = contractsRes.data.filter(c => {
          const endDate = new Date(c.end_date);
          const threeMonthsFromNow = new Date();
          threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
          return endDate <= threeMonthsFromNow && endDate >= new Date();
        }).length;
        setStats({
          clients: clientsRes.data.length,
          contracts: contractsRes.data.length,
          expiring
        });
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading) return <div className="spinner-border" role="status"><span className="sr-only">Loading...</span></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="my-4">
      <h2>Dashboard</h2>
      <div className="row">
        <div className="col-md-4">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h5 className="card-title">Total Clients</h5>
              <p className="card-text display-4">{stats.clients}</p>
              <Link to="/clients" className="btn btn-primary">View Clients</Link>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h5 className="card-title">Total Contracts</h5>
              <p className="card-text display-4">{stats.contracts}</p>
              <Link to="/contracts" className="btn btn-primary">View Contracts</Link>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h5 className="card-title">Expiring Soon</h5>
              <p className="card-text display-4">{stats.expiring}</p>
              <Link to="/contracts" className="btn btn-warning">Check Expiring</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;