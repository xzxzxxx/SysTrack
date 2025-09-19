import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import api from '../utils/api';
import { jwtDecode } from 'jwt-decode';

function Settings() {
  const history = useHistory();

  // Auth/user
  const [user, setUser] = useState(null);

  // Admin: pending registrations
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState('');
  const [actionBusyId, setActionBusyId] = useState(null);

  // Change password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwShow, setPwShow] = useState({ old: false, next: false, confirm: false });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Expiring Soon (session-only)
  const readInitialExpiringMonths = () => {
    const raw = sessionStorage.getItem('expiringMonthsOverride');
    const m = raw ? parseInt(raw, 10) : 3;
    return Number.isFinite(m) && m > 0 ? m : 3;
  };
  const [expiringMonths, setExpiringMonths] = useState(readInitialExpiringMonths());
  const [expToast, setExpToast] = useState({ show: false, type: '', message: '' });

  // Sync expiring months override updates
  useEffect(() => {
    const handler = () => {
      const raw = sessionStorage.getItem('expiringMonthsOverride');
      const m = raw ? parseInt(raw, 10) : 3;
      setExpiringMonths(Number.isFinite(m) && m > 0 ? m : 3);
    };
    window.addEventListener('expiring-months-updated', handler);
    return () => window.removeEventListener('expiring-months-updated', handler);
  }, []);

  const applySessionMonths = () => {
    sessionStorage.setItem('expiringMonthsOverride', String(expiringMonths));
    window.dispatchEvent(new CustomEvent('expiring-months-updated', { detail: { months: expiringMonths } }));
    setExpToast({ show: true, type: 'success', message: `Expiring Soon window set to ${expiringMonths} month(s) for this session.` });
    setTimeout(() => setExpToast({ show: false, type: '', message: '' }), 1800);
  };

  const resetToDefault = () => {
    sessionStorage.removeItem('expiringMonthsOverride');
    window.dispatchEvent(new CustomEvent('expiring-months-updated', { detail: { months: 3 } }));
    setExpiringMonths(3);
    setExpToast({ show: true, type: 'secondary', message: 'Reset to default 3 months.' });
    setTimeout(() => setExpToast({ show: false, type: '', message: '' }), 1200);
  };

  // Decode token -> user
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      history.push('/login');
      return;
    }
    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
    } catch (err) {
      console.error('Invalid token:', err);
      history.push('/login');
    }
  }, [history]);

  // Load pending registrations for admin
  useEffect(() => {
    const loadPending = async () => {
      if (!user) return;
      if (user.role !== 'admin') {
        setPendingLoading(false);
        return;
      }
      setPendingLoading(true);
      setPendingError('');
      try {
        const res = await api.get('/auth/pending-registrations');
        setPendingRequests(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setPendingError(err.response?.data?.error || 'Failed to fetch pending registrations');
      } finally {
        setPendingLoading(false);
      }
    };
    loadPending();
  }, [user]);

  // Approve/Reject action
  const handleApprove = async (id, approve) => {
    if (!id) return;
    const verb = approve ? 'approve' : 'reject';
    const ok = window.confirm(`Are you sure to ${verb} this request?`);
    if (!ok) return;

    setActionBusyId(id);
    try {
      const res = await api.post(`/auth/approve-registration/${id}`, { approve });
      if (res.status === 200) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setActionBusyId(null);
    }
  };

  // Change password
  const validateNewPassword = (pw) => {
    // Minimal checks; expand as needed
    if (pw.length < 8) return 'New password must be at least 8 characters';
    return '';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    const basicErr = validateNewPassword(newPassword);
    if (basicErr) {
      setPasswordError(basicErr);
      return;
    }

    setChangingPw(true);
    try {
      const res = await api.post('/auth/change-password', { oldPassword, newPassword });
      if (res.status === 200) {
        setPasswordSuccess('Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="container">
      <h2 className="my-4">Settings</h2>

      {/* Expiring Soon (Session Only) */}
      <div className="card mb-4">
        <div className="card-header">Expiring Soon (Session Only)</div>
        <div className="card-body">
          {expToast.show && <div className={`alert alert-${expToast.type}`}>{expToast.message}</div>}

          <label className="mr-2">Window (months):</label>
          <select
            aria-label="Expiring Soon months window"
            className="form-control d-inline-block"
            style={{ width: 140 }}
            value={expiringMonths}
            onChange={(e) => setExpiringMonths(parseInt(e.target.value, 10))}
          >
            {[1, 2, 3, 4, 5, 6, 9, 12].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <div className="mt-3">
            <button className="btn btn-primary mr-2" onClick={applySessionMonths}>Apply (Session Only)</button>
            <button className="btn btn-secondary" onClick={resetToDefault}>Reset to 3</button>
          </div>

          <small className="text-muted d-block mt-2">
            This override applies only in this browser tab and will reset to 3 months next time you open the app.
          </small>
        </div>
      </div>

      {/* Admin: Pending Registrations */}
      {user?.role === 'admin' && (
        <div className="card mb-4">
          <div className="card-header">Pending Registrations</div>
          <div className="card-body">
            {pendingError && <div className="alert alert-danger mb-3">Error: {pendingError}</div>}
            {pendingLoading ? (
              <div className="d-flex align-items-center">
                <div className="spinner-border mr-2" role="status" />
                <span>Loading...</span>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="alert alert-info mb-0">No pending requests.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Requested At</th>
                      <th style={{ width: 220 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((req) => (
                      <tr key={req.id}>
                        <td>{req.username}</td>
                        <td>{req.email}</td>
                        <td>{req.role}</td>
                        <td>{req.requested_at ? new Date(req.requested_at).toLocaleString() : '-'}</td>
                        <td>
                          <button
                            className="btn btn-success btn-sm mr-2"
                            disabled={actionBusyId === req.id}
                            onClick={() => handleApprove(req.id, true)}
                          >
                            {actionBusyId === req.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            disabled={actionBusyId === req.id}
                            onClick={() => handleApprove(req.id, false)}
                          >
                            {actionBusyId === req.id ? 'Rejecting...' : 'Reject'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="card mb-4">
        <div className="card-header">Change Password</div>
        <div className="card-body">
          {passwordError && <div className="alert alert-danger">Error: {passwordError}</div>}
          {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <div className="input-group">
                <input
                  type={pwShow.old ? 'text' : 'password'}
                  className="form-control"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
                <div className="input-group-append">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setPwShow((s) => ({ ...s, old: !s.old }))}
                  >
                    {pwShow.old ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="input-group">
                <input
                  type={pwShow.next ? 'text' : 'password'}
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <div className="input-group-append">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setPwShow((s) => ({ ...s, next: !s.next }))}
                  >
                    {pwShow.next ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <small className="form-text text-muted">Minimum 8 characters.</small>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="input-group">
                <input
                  type={pwShow.confirm ? 'text' : 'password'}
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <div className="input-group-append">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setPwShow((s) => ({ ...s, confirm: !s.confirm }))}
                  >
                    {pwShow.confirm ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={changingPw}>
              {changingPw ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Settings;
