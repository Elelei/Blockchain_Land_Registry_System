import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import PropertyList from './components/Property/PropertyList';
import PropertyDetail from './components/Property/PropertyDetail';
import PropertyHistory from './components/Property/PropertyHistory';
import RegisterProperty from './components/Property/RegisterProperty';
import Dashboard from './components/Dashboard/Dashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import UserManagement from './components/Admin/UserManagement';
import TransactionManager from './components/Transaction/TransactionManager';

function App() {
  return (
    <Web3Provider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/properties" element={<PropertyList />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/property/:id/history" element={<PropertyHistory />} />
            <Route path="/register-property" element={<RegisterProperty />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/transactions" element={<TransactionManager />} />
          </Routes>
        </Layout>
      </Router>
    </Web3Provider>
  );
}

export default App;
