import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../../contexts/Web3Context';
import { CheckCircle, XCircle, Loader2, FileCheck, AlertCircle, Users } from 'lucide-react';
import { PROPERTY_STATUS } from '../../config/constants';
import { formatEther } from '../../utils/web3';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const { contract, account } = useWeb3();
  const [pendingProperties, setPendingProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    if (contract && account) {
      loadPendingProperties();
    }
  }, [contract, account]);

  const loadPendingProperties = async () => {
    try {
      setLoading(true);
      const totalProperties = await contract.getTotalProperties();
      const propertyPromises = [];

      for (let i = 1; i <= Number(totalProperties); i++) {
        propertyPromises.push(contract.getProperty(i));
      }

      const propertyData = await Promise.all(propertyPromises);
      
      const allProperties = propertyData.map((prop, index) => ({
        id: prop[0],
        state: prop[1],
        district: prop[2],
        village: prop[3],
        surveyNumber: prop[4],
        owner: prop[5],
        marketValue: prop[6],
        propertyId: prop[7],
        ipfsHash: prop[8],
        status: Number(prop[9]),
        registeredAt: prop[10],
        lastUpdated: prop[11],
        isActive: prop[12]
      }));

      const pending = allProperties.filter(p => p.isActive && p.status === 0);
      setPendingProperties(pending);

      // Calculate stats
      setStats({
        total: allProperties.filter(p => p.isActive).length,
        pending: pending.length,
        approved: allProperties.filter(p => p.status === 1).length,
        rejected: allProperties.filter(p => p.status === 2).length
      });
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (propertyId, approve) => {
    try {
      const tx = await contract.approveProperty(propertyId, approve);
      await tx.wait();
      toast.success(approve ? 'Property approved' : 'Property rejected');
      await loadPendingProperties();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process approval');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <Link
          to="/admin/users"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Users className="h-5 w-5 mr-2" />
          Manage Users
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileCheck className="h-8 w-8 text-primary-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Pending Property Approvals</h2>
        
        {pendingProperties.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No pending properties to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingProperties.map((property) => {
              const isOwnProperty = property.owner.toLowerCase() === account?.toLowerCase();
              return (
                <div 
                  key={property.id.toString()} 
                  className={`border rounded-lg p-4 ${isOwnProperty ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{property.propertyId}</h3>
                        {isOwnProperty && (
                          <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded">
                            Your Property
                          </span>
                        )}
                      </div>
                      {isOwnProperty && (
                        <div className="mb-3 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                          ⚠️ <strong>Warning:</strong> This property is registered under your account. 
                          It's recommended to use a different account for property registration to maintain separation of duties.
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Location</p>
                          <p>{property.village}, {property.district}, {property.state}</p>
                        </div>
                        <div>
                          <p className="font-medium">Market Value</p>
                          <p>{formatEther(property.marketValue)} ETH</p>
                        </div>
                        <div>
                          <p className="font-medium">Owner</p>
                          <p className="font-mono text-xs">{property.owner}</p>
                        </div>
                        <div>
                          <p className="font-medium">Survey Number</p>
                          <p>{property.surveyNumber}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleApproval(property.id, true)}
                        disabled={isOwnProperty}
                        className={`px-4 py-2 rounded-lg flex items-center ${
                          isOwnProperty 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        title={isOwnProperty ? "Cannot approve your own property" : "Approve property"}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(property.id, false)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
