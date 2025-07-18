import React, { useState } from 'react';
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

// A simple component to handle routes that require authentication
const PrivateRoute = ({ children, token, logout, ...rest }) => {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        token ? (
          <Layout token={token} logout={logout}>
            {children}
          </Layout>
        ) : (
          <Redirect to={{ pathname: '/login', state: { from: location } }} />
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

  return (
    <Router>
      <Switch>
        {/* Public routes that don't need the main layout */}
        <Route path="/login">
          <Login setToken={setToken} />
        </Route>
        <Route path="/register">
          <Register />
        </Route>

        {/* --- All Authenticated Routes Go Here --- */}
        <PrivateRoute path="/dashboard" token={token} logout={logout}>
          <Dashboard token={token} />
        </PrivateRoute>
        <PrivateRoute path="/clients/new" token={token} logout={logout}>
          <ClientForm token={token} />
        </PrivateRoute>
        <PrivateRoute path="/clients/:id/edit" token={token} logout={logout}>
          <ClientForm token={token} />
        </PrivateRoute>
        <PrivateRoute path="/clients" token={token} logout={logout}>
          <ClientList token={token} />
        </PrivateRoute>
        <PrivateRoute path="/contracts/notify" token={token} logout={logout}>
          <NotificationReview token={token} />
        </PrivateRoute>
        <PrivateRoute path="/contracts/new" token={token} logout={logout}>
          <ContractForm token={token} defaultType="new" />
        </PrivateRoute>
        <PrivateRoute path="/contracts/renew" token={token} logout={logout}>
          <ContractForm token={token} defaultType="renew" />
        </PrivateRoute>
        <PrivateRoute path="/contracts/:contract_id/edit" token={token} logout={logout}>
          <ContractForm token={token} />
        </PrivateRoute>
        <PrivateRoute path="/contracts" token={token} logout={logout}>
          <ContractList token={token} />
        </PrivateRoute>
        <PrivateRoute path="/projects" token={token} logout={logout}>
          <Projects token={token} />
        </PrivateRoute>

        {/* Redirect root path to the dashboard */}
        <Route path="/">
          {token ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
