import React from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { Shield, FileCheck, TrendingUp, Lock, Search, Users } from 'lucide-react';

const Home = () => {
  const { isConnected, connect, isConnecting } = useWeb3();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Blockchain Land Registry System
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Secure, transparent, and fraud-resistant property registration and transaction management
          powered by Ethereum blockchain technology.
        </p>
        {!isConnected ? (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="px-8 py-3 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Get Started'}
          </button>
        ) : (
          <div className="flex justify-center space-x-4">
            <Link
              to="/properties"
              className="px-8 py-3 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700"
            >
              Browse Properties
            </Link>
            <Link
              to="/dashboard"
              className="px-8 py-3 bg-gray-600 text-white text-lg font-semibold rounded-lg hover:bg-gray-700"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <Shield className="h-12 w-12 text-primary-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Fraud Prevention</h3>
          <p className="text-gray-600">
            Immutable blockchain records prevent property fraud and duplicate registrations.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <FileCheck className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Transparency</h3>
          <p className="text-gray-600">
            All property records and transactions are publicly verifiable on the blockchain.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <TrendingUp className="h-12 w-12 text-blue-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Efficient Transactions</h3>
          <p className="text-gray-600">
            Streamlined property transfer process with secure payment and ownership verification.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <Lock className="h-12 w-12 text-red-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Secure Storage</h3>
          <p className="text-gray-600">
            Property documents stored on IPFS with cryptographic integrity verification.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <Search className="h-12 w-12 text-purple-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Easy Search</h3>
          <p className="text-gray-600">
            Advanced search and filtering to find properties quickly and efficiently.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <Users className="h-12 w-12 text-indigo-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
          <p className="text-gray-600">
            Secure access control for property owners, buyers, and administrators.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">1</span>
            </div>
            <h3 className="font-semibold mb-2">Connect Wallet</h3>
            <p className="text-sm text-gray-600">
              Connect your MetaMask wallet to access the system
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">2</span>
            </div>
            <h3 className="font-semibold mb-2">Register Property</h3>
            <p className="text-sm text-gray-600">
              Submit property details for admin approval
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">3</span>
            </div>
            <h3 className="font-semibold mb-2">List for Sale</h3>
            <p className="text-sm text-gray-600">
              Approved properties can be listed for sale
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">4</span>
            </div>
            <h3 className="font-semibold mb-2">Complete Transaction</h3>
            <p className="text-sm text-gray-600">
              Secure purchase and automatic ownership transfer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
