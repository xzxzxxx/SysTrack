import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ token, logout }) {
  return (
    <nav style={{ background: '#007bff', padding: '10px', color: 'white' }}>
      <Link to="/" style={{ color: 'white', marginRight: '10px' }}>Home</Link>
      {token ? (
        <>
          <Link to="/clients" style={{ color: 'white', marginRight: '10px' }}>Clients</Link>
          <Link to="/contracts" style={{ color: 'white', marginRight: '10px' }}>Contracts</Link>
          <button onClick={logout} style={{ color: 'white', background: 'none', border: 'none' }}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login" style={{ color: 'white', marginRight: '10px' }}>Login</Link>
          <Link to="/register" style={{ color: 'white' }}>Register</Link>
        </>
      )}
    </nav>
  );
}

export default Navbar;