import React, { useState } from 'react';
import api from '../../utils/api';
import { useHistory, Link } from 'react-router-dom';
import './Login.css';

function Login({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data;
      setToken(token);
      localStorage.setItem('token', token);
      history.push('/clients');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center login-bg">
      <div className="row w-100" style={{ maxWidth: 900 }}>
        <div className="col-md-6 d-none d-md-flex login-image justify-content-center align-items-center">
          {/* Optional: Add a logo or illustration here */}
          <img src="/branding/logo.svg" alt="Brand" className="img-fluid"/>
        </div>
        <div className="col-md-6 col-12 d-flex align-items-center">
          <div className="w-100 p-4 login-card shadow-lg">
            <h2 className="mb-4 text-center">Welcome Back!</h2>
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email address</label>
                <input type="email" 
                  className="form-control" 
                  id="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  autoFocus 
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input type="password"
                  className="form-control" 
                  id="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required
                />
              </div>
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}
              <button type="submit" className="btn btn-primary w-100 mt-3">Login</button>
            </form>
            <div className="text-muted text-center mt-3">
              Don't have an account? <Link to="/register">Register here</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;