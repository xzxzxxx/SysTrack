import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import Layout from './components/common/DefaultLayout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ClientList from './components/clients/ClientList';
import ClientForm from './components/clients/ClientForm';
import ContractList from './components/contracts/ContractList';
import ContractForm from './components/contracts/ContractForm';
import Dashboard from './components/dashboard/Dashboard';
import Projects from './components/projects/Projects';
import NotificationReview from './components/contracts/NotificationReview';
import MaintenanceRequestList from './components/maintenance/MaintenanceRequestList';
import MaintenanceRequestForm from './components/maintenance/MaintenanceRequestForm';
import Settings from './components/Settings';

// A simple component to handle routes that require authentication
const PrivateRoute = ({ children, token, logout, ...rest }) => {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        token ? (
          // If the user is logged in, render the main Layout and the page content
          <Layout token={token} logout={logout}>
            {children}
          </Layout>
        ) : (
          // If not logged in, redirect them to the login page
          <Redirect
            to={{
              pathname: '/login',
              state: { from: location } // This saves the page they were trying to access
            }}
          />
        )
      }
    />
  );
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
  };

  // Add this useEffect hook to validate the token on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decodedToken = jwtDecode(storedToken);
        const currentTime = Date.now() / 1000; // Get current time in seconds
        // If the token's expiration time is in the past, log the user out
        if (decodedToken.exp < currentTime) {
          console.log('Token has expired, logging out.');
          logout();
        }
      } catch (error) {
        // If the token is malformed or invalid, log the user out
        console.error('Invalid token found in storage.', error);
        logout();
      }
    }
  }, []); // The empty dependency array ensures this runs only once on mount

  useEffect(() => {
    const handleTokenUpdate = () => {
      console.log('Token update event received. Updating state.');
      setToken(localStorage.getItem('token') || '');
    };

    // Listen for the custom event dispatched from the API interceptor
    window.addEventListener('token-updated', handleTokenUpdate);

    // Cleanup: remove the event listener when the component unmounts
    return () => {
      window.removeEventListener('token-updated', handleTokenUpdate);
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <Router>
      <Switch>
        {/* Public routes - they do NOT use the PrivateRoute or Layout */}
        <Route path="/login">
          <Login setToken={setToken} />
        </Route>
        <Route path="/register">
          <Register />
        </Route>

        {/* Private routes - they are all protected by PrivateRoute */}
        <PrivateRoute path="/" token={token} logout={logout}>
          <Switch>
            <Route path="/dashboard">
              <Dashboard token={token} />
            </Route>
            <Route path="/clients/new">
              <ClientForm token={token} />
            </Route>
            <Route path="/clients/:id/edit">
              <ClientForm token={token} />
            </Route>
            <Route path="/clients">
              <ClientList token={token} />
            </Route>
            <Route path="/contracts/renew/:id">
              <ContractForm token={token} isRenew={true} />
            </Route>
            <Route path="/contracts/:id/edit">
              <ContractForm token={token} />
            </Route>
            <Route path="/contracts/new">
              <ContractForm token={token} />
            </Route>
            <Route path="/contracts/notify">
              <NotificationReview token={token} />
            </Route>
            <Route path="/contracts">
              <ContractList token={token} />
            </Route>
            <Route path="/projects">
              <Projects token={token} />
            </Route>
            <Route path="/maintenance/new">
              <MaintenanceRequestForm token={token} />
            </Route>
            <Route path="/maintenance/:id/edit">
              <MaintenanceRequestForm token={token} />
            </Route>
            <Route path="/maintenance">
              <MaintenanceRequestList token={token} />
            </Route>
            <Route path="/settings">
            <Settings token={token} />
            </Route>
            
            <Redirect from="/" to={token ? "/dashboard" : "/login"} />
          </Switch>
        </PrivateRoute>
      </Switch>
    </Router>
  );
}

export default App;