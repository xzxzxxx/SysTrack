import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './navbar/Navbar';
import './DefaultLayout.css';

function Layout({ token, logout, children, layoutType = 'sidebar' }) {
  const [isOpen, setIsOpen] = useState(true);

  // --- Inactivity Timeout Logic ---

  // Use useRef to store the timer ID. This prevents re-renders when the ID changes.
  const timeoutIdRef = useRef(null);

  // The logout function is wrapped in useCallback to ensure it has a stable identity
  // This prevents the effect from re-running unnecessarily.
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const resetTimeout = useCallback(() => {
    // Clear the previous timer
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    // Set a new timer
    timeoutIdRef.current = setTimeout(() => {
      alert('You have been logged out due to inactivity.');
      handleLogout();
    }, 15 * 60 * 1000); // 15mins
  }, [handleLogout]);

  useEffect(() => {
    // A list of events that indicate user activity
    const activityEvents = [
      'mousemove',
      'mousedown',
      'click',
      'scroll',
      'keypress',
      'keydown',
    ];

    // This effect runs only when the user is logged in (token exists)
    if (token) {
      // Set the initial timer when the component mounts or user logs in
      resetTimeout();

      // Add event listeners to reset the timer on any user activity
      activityEvents.forEach(event => {
        window.addEventListener(event, resetTimeout);
      });
    }

    // --- Cleanup Function ---
    // This is crucial. It runs when the component unmounts (e.g., user logs out).
    return () => {
      // Clear the timer to prevent the logout function from being called after unmount
      clearTimeout(timeoutIdRef.current);
      // Remove all the event listeners to prevent memory leaks
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
    };
  }, [token, resetTimeout]);

  // --- END of Inactivity Timeout Logic ---

  return (
    <div className="layout-container">
      {layoutType === 'sidebar' && (
        <Navbar isOpen={isOpen} setIsOpen={setIsOpen} logout={logout} />
      )}
      <main className={`main-content ${isOpen ? 'open' : 'closed'}`}>
        {children}
      </main>
    </div>
  );
}

export default Layout;