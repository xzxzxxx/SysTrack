import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import ClientList from './components/clients/ClientList';
import ClientForm from './components/ClientForm';
import ContractList from './components/ContractList';
import ContractForm from './components/ContractForm';
import Dashboard from './components/Dashboard';
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
        <Navbar token={token} logout={logout} />
        <div className="container">
          <Switch>
            <Route path="/login">
              <Login setToken={setToken} />
            </Route>
            <Route path="/register">
              <Register />
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
            <Route path="/contracts/new">
              <ContractForm token={token} />
            </Route>
            <Route path="/contracts/:id/edit">
              <ContractForm token={token} />
            </Route>
            <Route path="/contracts">
              <ContractList token={token} />
            </Route>
            <Route path="/">
              <Dashboard token={token} />
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  );
}

export default App;