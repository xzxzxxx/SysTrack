import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Layout from './components/common/DefaultLayout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ClientList from './components/clients/ClientList';
import ClientForm from './components/clients/ClientForm';
import ContractList from './components/contracts/ContractList';
import ContractForm from './components/contracts/ContractForm';
import Dashboard from './components/dashboard/Dashboard';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
  };

  return (
    <Router>
      <div className="App">
        <Switch>
          <Route path="/login">
            <Layout token={token} logout={logout} layoutType="full">
              <Login setToken={setToken} />
            </Layout>
          </Route>
          <Route path="/register">
            <Layout token={token} logout={logout} layoutType="full">
              <Register />
            </Layout>
          </Route>
          <Route path="/clients/new">
            <Layout token={token} logout={logout}>
              <ClientForm token={token} />
            </Layout>
          </Route>
          <Route path="/clients/:id/edit">
            <Layout token={token} logout={logout}>
              <ClientForm token={token} />
            </Layout>
          </Route>
          <Route path="/clients">
            <Layout token={token} logout={logout}>
              <ClientList token={token} />
            </Layout>
          </Route>
          <Route path="/contracts/new">
            <Layout token={token} logout={logout}>
              <ContractForm token={token} />
            </Layout>
          </Route>
          <Route path="/contracts/:id/edit">
            <Layout token={token} logout={logout}>
              <ContractForm token={token} />
            </Layout>
          </Route>
          <Route path="/contracts">
            <Layout token={token} logout={logout}>
              <ContractList token={token} />
            </Layout>
          </Route>
          <Route path="/">
            <Layout token={token} logout={logout}>
              <Dashboard token={token} />
            </Layout>
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;