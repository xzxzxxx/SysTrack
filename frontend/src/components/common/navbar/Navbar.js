import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ token, logout, isOpen, setIsOpen }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const revealButton = (
    <button
      className="sidebar-reveal btn-black"
      onClick={() => setIsOpen(true)}
      onMouseEnter={(e) => (e.target.style.opacity = '0.5')}
      onMouseLeave={(e) => (e.target.style.opacity = '0')}
      style={{ opacity: 0 }} // Start with it invisible
    >
      &#9654;
    </button>
  );

  return (
    <>
      {!isOpen && revealButton}
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <Link className="navbar-brand" to="/">SysTrack</Link>
        </div>
        <ul className="navbar-nav">
          <li className="nav-item ps-4">
            <Link className="nav-link" to="/">Dashboard</Link>
          </li>
          <li className="nav-item ps-4">
            <Link className="nav-link" to="/clients">Clients</Link>
          </li>
          <li className="nav-item ps-4">
            <Link className="nav-link" to="/contracts">Contracts</Link>
          </li>
          <li className="nav-item ps-4">
            <Link className="nav-link" to="/projects">Projects</Link>
          </li>
          <li className="nav-item ps-4">
            <Link className="nav-link" to="/notifications">Notify Renewals</Link>
          </li>
          <li className="nav-item ps-4">
            <Link className="nav-link" to="/maintenance">Maintenance Records</Link>
          </li>
        </ul>
        <div className="sidebar-footer">
          {/* Only show user menu if logged in (has token) */}
          {token && (
            <div className="user-placeholder">
              <button
                className="users-icon btn"
                onClick={toggleUserMenu}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-people" viewBox="0 0 16 16">
                  <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10c-1.668.837-2.914 2.379-3.62 4h6.557c-.71-1.616-2.047-3.169-3.672-4.104-.23-.179-.436-.34-.6-.484z"/>
                </svg>
              </button>
              {userMenuOpen && (
                <div className="user-menu">
                  <Link className="dropdown-item" to="/settings">Settings</Link>
                  <div className="dropdown-item" onClick={logout}>Logout</div>
                </div>
              )}
            </div>
          )}
          <button
            className="toggle-icon btn"
            onClick={() => setIsOpen(!isOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-list" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

export default Navbar;