import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import api from '../utils/api';
import { jwtDecode } from 'jwt-decode';

function Settings() {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);  // Use state for user to avoid conditional issues
    const history = useHistory(); 

    // Change password states
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // Helper to read initial months from session (default 3)
    const readInitialExpiringMonths = () => {
        const raw = sessionStorage.getItem('expiringMonthsOverride');
        const m = raw ? parseInt(raw, 10) : 3;
        return Number.isFinite(m) && m > 0 ? m : 3;
    };
    
    const [expiringMonths, setExpiringMonths] = useState(readInitialExpiringMonths());
    const [expToast, setExpToast] = useState({ show: false, type: '', message: '' });

    // Keep local UI in sync if other parts update the session override
    useEffect(() => {
        const handler = () => {
        const raw = sessionStorage.getItem('expiringMonthsOverride');
        const m = raw ? parseInt(raw, 10) : 3;
        setExpiringMonths(Number.isFinite(m) && m > 0 ? m : 3);
        };
        window.addEventListener('expiring-months-updated', handler);
        return () => window.removeEventListener('expiring-months-updated', handler);
    }, []);
    
    // Apply and reset handlers
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

    // Decode user from token (if no user prop is passed)
    const token = localStorage.getItem('token');
    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser(decoded);  // Set user state
            } catch (err) {
                console.error('Invalid token:', err);
                history.push('/login');  // Redirect if decoding fails
            }
        } else {
            history.push('/login');  // Redirect if no token
        }
    }, [history, token]);  // Run on mount and token change

    useEffect(() => {
        if (!localStorage.getItem('token') || !user) {
            return;
        }

        if (user.role === 'admin') {
            const fetchPending = async () => {
                try {
                    const response = await api.get('/auth/pending-registrations');
                    setPendingRequests(response.data);
                    setError('');
                } catch (err) {
                    setError(err.response?.data?.error || 'Failed to fetch pending registrations');
                } finally {
                    setLoading(false);
                }
            };
            fetchPending();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleApprove = async (id, approve) => {
        try {
            const response = await api.post(`/auth/approve-registration/${id}`, { approve });
            if (response.status === 200) {  // Use response to check success
                // Refresh list after action
                const updated = pendingRequests.filter(req => req.id !== id);
                setPendingRequests(updated);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Action failed');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }

        try {
            const response = await api.post('/auth/change-password', { oldPassword, newPassword });
            if (response.status === 200) {
                setPasswordSuccess('Password changed successfully');
                // Optional: Clear form
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            setPasswordError(err.response?.data?.error || 'Failed to change password');
        }
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <h2>Settings</h2>

            {/* Admin-only section: Account approval */}
            {user.role === 'admin' && (
                <>
                    <h3>Account Approvals (Admin Only)</h3>
                    {pendingRequests.length === 0 ? (
                        <p>No pending requests.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Requested At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRequests.map(req => (
                                    <tr key={req.id}>
                                        <td>{req.username}</td>
                                        <td>{req.email}</td>
                                        <td>{req.role}</td>
                                        <td>{new Date(req.requested_at).toLocaleString()}</td>
                                        <td>
                                            <button onClick={() => handleApprove(req.id, true)}>Approve</button>
                                            <button onClick={() => handleApprove(req.id, false)}>Reject</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}

            {/* Section for all users: Change password (placeholder) */}
            <h3>Change Password</h3>
            <form onSubmit={handleChangePassword}>
                <div>
                    <label>Old Password:</label>
                    <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>New Password:</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Confirm New Password:</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Change Password</button>
            </form>
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
            {passwordError && <p style={{ color: 'red' }}>Error: {passwordError}</p>}
            {passwordSuccess && <p style={{ color: 'green' }}>{passwordSuccess}</p>}
        </div>
    );
}

export default Settings;