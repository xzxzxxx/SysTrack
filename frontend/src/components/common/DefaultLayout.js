import React, { useState } from 'react';
import Navbar from './navbar/Navbar';
import './DefaultLayout.css';

function Layout({ token, logout, children, layoutType = 'sidebar' }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {layoutType === 'sidebar' && (
        <Navbar token={token} logout={logout} isOpen={isOpen} setIsOpen={setIsOpen} />
      )}
      <main className={`main-content ${layoutType === 'sidebar' && isOpen ? 'open' : ''}`}>
        {children}
      </main>
    </>
  );
}

export default Layout;