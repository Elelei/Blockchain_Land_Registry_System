import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import OwnerDashboard from './OwnerDashboard';
import BuyerDashboard from './BuyerDashboard';
import AdminDashboard from '../Admin/AdminDashboard';

const Dashboard = () => {
  const { userRole, isConnected, contract, account } = useWeb3();
  const [hasProperties, setHasProperties] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUserProperties = async () => {
      if (contract && account && userRole !== 'Superadmin') {
        try {
          const propertyIds = await contract.getOwnerProperties(account);
          setHasProperties(propertyIds.length > 0);
        } catch (error) {
          console.error('Error checking properties:', error);
        } finally {
          setChecking(false);
        }
      } else {
        setChecking(false);
      }
    };

    checkUserProperties();
  }, [contract, account, userRole]);

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <p className="text-gray-500 text-lg">Please connect your wallet to view the dashboard</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Superadmin sees Admin Dashboard at /dashboard
  if (userRole === 'Superadmin') {
    return <AdminDashboard />;
  }

  // For other users, show personal properties dashboard
  return hasProperties ? <OwnerDashboard /> : <BuyerDashboard />;
};

export default Dashboard;
