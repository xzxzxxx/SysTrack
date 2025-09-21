import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// helper to read session override (default 3)
const readSessionExpiringMonths = () => {
  const raw = sessionStorage.getItem('expiringMonthsOverride');
  const m = raw ? parseInt(raw, 10) : 3;
  return Number.isFinite(m) && m > 0 ? m : 3;
};

function Dashboard({ token }) {
  const [stats, setStats] = useState({ clients: 0, activePending: 0, expiring: 0, openMaintenance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // expiring months for title
  const [expMonths, setExpMonths] = useState(readSessionExpiringMonths());

  // [{ ym, active_count, pending_count, total_count }]
  const [apTrend, setApTrend] = useState([]);

  useEffect(() => {
    // listen for session override updates from Settings
    const handler = (e) => {
      setExpMonths(readSessionExpiringMonths());
    };
    window.addEventListener('expiring-months-updated', handler);
    return () => window.removeEventListener('expiring-months-updated', handler);
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Please log in to view dashboard');
      return;
    }
    const fetchStats = async () => {
      setLoading(true);
      try {
        const clientsRes = await api.get('/clients', { params: { limit: 1 } });
        const activePendingRes = await api.get('/contracts', { params: { statuses: 'Active,Pending', limit: 1 } });
        const expiringRes = await api.get('/contracts', { params: { statuses: 'Expiring Soon', limit: 1 } });

        let allTotal = 0, closedTotal = 0;
        try {
          const allMaintRes = await api.get('/maintenance-records', { params: { limit: 1 } });
          allTotal = allMaintRes.data?.total || 0;
        } catch {}
        try {
          const closedMaintRes = await api.get('/maintenance-records', { params: { statuses: 'Closed', limit: 1 } });
          closedTotal = closedMaintRes.data?.total || 0;
        } catch {}
        const openMaintenance = Math.max(0, allTotal - closedTotal);

        setStats({
          clients:        clientsRes.data?.total || 0,
          activePending:  activePendingRes.data?.total || 0,
          expiring:       expiringRes.data?.total || 0,
          openMaintenance
        });

        const trendRes = await api.get('/contracts/stats/active-pending-by-month', { params: { months: 12 } });
        setApTrend(trendRes.data || []);

      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const monthsLabel = `${expMonths} month${expMonths === 1 ? '' : 's'}`;
  const latest = apTrend.length ? apTrend[apTrend.length - 1].total_count : 0;

  if (!token) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">Please <Link to="/login">log in</Link> to view the dashboard.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <h2 className="my-4">Dashboard</h2>
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center justify-content-between">
          <span>Active + Pending (Last 12 months)</span>
          <small className="text-muted">Latest total: {latest}</small>
        </div>
        <div className="card-body" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={apTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ym" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              {/* Total-only mini bar */}
              <Bar dataKey="total_count" name="Active+Pending" fill="#0d6efd" />
              {/* If you prefer stacked composition, uncomment below:
              <Bar dataKey="active_count" stackId="a" name="Active" fill="#198754" />
              <Bar dataKey="pending_count" stackId="a" name="Pending" fill="#fd7e14" />
              */}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="row">
        <div className="col-md-4 col-12 mb-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Total Clients</h5>
              <p className="card-text display-4">{stats.clients}</p>
              <Link to="/clients" className="btn btn-primary">View Clients</Link>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-12 mb-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Active + Pending</h5>
              <p className="card-text display-4">{stats.activePending}</p>
              <Link to="/contracts" className="btn btn-primary">View Contracts</Link>
            </div>
          </div>
        </div>
        {/* Expiring Soon card with dynamic months in title */}
        <div className="col-md-3 col-12 mb-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Expiring Soon ({monthsLabel})</h5>
              <p className="card-text display-4">{stats.expiring}</p>
              <Link to="/contracts?status=expiringsoon" className="btn btn-primary">Check Expiring Soon</Link>
              <Link to="/contracts/notify" className="btn btn-light ml-2">Notify Team</Link>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-12 mb-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Open Maintenance</h5>
              <p className="card-text display-4">{stats.openMaintenance}</p>
              <Link to="/maintenance" className="btn btn-primary">View Requests</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;