import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ token, logout }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <Link className="navbar-brand" to="/">SysTrack</Link>
      <button
        className="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav ml-auto">
          <li className="nav-item">
            <Link className="nav-link" to="/">Dashboard</Link>
          </li>
          {token ? (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/clients">Clients</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/contracts">Contracts</Link>
              </li>
              <li className="nav-item">
                <button className="nav-link btn btn-link" onClick={logout}>Logout</button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/login">Login</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/register">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;