import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../../contexts/Web3Context';
import { Plus, Package, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import PropertyCard from '../Property/PropertyCard';
import { formatEther } from '../../utils/web3';

const OwnerDashboard = () => {
  const { contract, account } = useWeb3();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    forSale: 0,
    totalValue: 0
  });

  useEffect(() => {
    if (contract && account) {
      loadProperties();
    }
  }, [contract, account]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const propertyIds = await contract.getOwnerProperties(account);
      const propertyPromises = propertyIds.map(id => contract.getProperty(id));
      const propertyData = await Promise.all(propertyPromises);

      const formatted = propertyData.map(prop => ({
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

      setProperties(formatted);

      // Calculate stats
      const totalValue = formatted.reduce((sum, p) => sum + BigInt(p.marketValue), BigInt(0));
      const forSale = formatted.filter(p => p.status === 3).length;

      setStats({
        total: formatted.length,
        forSale,
        totalValue
      });
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-gray-900">My Properties</h1>
        <Link
          to="/register-property"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Register New Property
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-primary-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">For Sale</p>
              <p className="text-2xl font-bold text-gray-900">{stats.forSale}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatEther(stats.totalValue)} ETH
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">No properties registered yet</p>
          <Link
            to="/register-property"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Register Your First Property
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Property List</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard key={property.id.toString()} property={property} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
