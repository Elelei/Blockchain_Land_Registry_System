import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { Users, UserPlus, Shield, FileCheck, Briefcase, ShoppingCart, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatAddress } from '../../utils/web3';

const UserManagement = () => {
  const { contract, account, userRole } = useWeb3();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    address: '',
    role: 'PROPERTY_OWNER_ROLE',
    roleName: 'Property Owner'
  });
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (contract && account && userRole === 'Superadmin') {
      loadUsers();
    }
  }, [contract, account, userRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const totalProperties = await contract.getTotalProperties();
      const userSet = new Set();
      const userList = [];

      // Get all unique users from properties
      for (let i = 1; i <= Number(totalProperties); i++) {
        try {
          const prop = await contract.getProperty(i);
          const owner = prop[5];
          if (owner && !userSet.has(owner.toLowerCase())) {
            userSet.add(owner.toLowerCase());
            try {
              const isRegistered = await contract.registeredUsers(owner);
              if (isRegistered) {
                const role = await contract.userRoles(owner);
                userList.push({
                  address: owner,
                  role: role || 'Property Owner',
                  isRegistered: true
                });
              }
            } catch (error) {
              // User might not be registered yet
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Also check transaction participants
      for (let i = 1; i <= Number(totalProperties); i++) {
        try {
          const txIds = await contract.getPropertyTransactions(i);
          for (const txId of txIds) {
            try {
              const tx = await contract.getTransaction(txId);
              const seller = tx[2];
              const buyer = tx[3];
              
              [seller, buyer].forEach(addr => {
                if (addr && !userSet.has(addr.toLowerCase())) {
                  userSet.add(addr.toLowerCase());
                  userList.push({
                    address: addr,
                    role: 'Buyer/Seller',
                    isRegistered: false
                  });
                }
              });
            } catch (error) {
              continue;
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Fetch roles for all users
      const usersWithRoles = await Promise.all(
        userList.map(async (user) => {
          try {
            const isRegistered = await contract.registeredUsers(user.address);
            if (isRegistered) {
              const role = await contract.userRoles(user.address);
              return {
                ...user,
                role: role || 'Unknown',
                isRegistered: true
              };
            }
            return { ...user, isRegistered: false };
          } catch (error) {
            return { ...user, isRegistered: false };
          }
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.address || !newUser.address.startsWith('0x')) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    try {
      setRegistering(true);

      // Map role names to role bytes32
      const roleMap = {
        'Superadmin': await contract.SUPERADMIN_ROLE(),
        'Government Authority': await contract.GOVERNMENT_ROLE(),
        'Property Owner': await contract.PROPERTY_OWNER_ROLE(),
        'Legal Professional': await contract.LEGAL_PROFESSIONAL_ROLE()
      };

      const roleBytes = roleMap[newUser.roleName] || await contract.PROPERTY_OWNER_ROLE();

      const tx = await contract.registerUser(
        newUser.address,
        roleBytes,
        newUser.roleName
      );

      toast.info('Transaction submitted. Waiting for confirmation...');
      await tx.wait();
      
      toast.success(`User registered as ${newUser.roleName}`);
      setShowAddUser(false);
      setNewUser({
        address: '',
        role: 'PROPERTY_OWNER_ROLE',
        roleName: 'Property Owner'
      });
      await loadUsers();
    } catch (error) {
      console.error('Error registering user:', error);
      let errorMessage = 'Failed to register user';
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  const getRoleIcon = (role) => {
    if (role?.includes('Superadmin') || role?.includes('Superadmin')) {
      return <Shield className="h-5 w-5 text-purple-600" />;
    } else if (role?.includes('Government')) {
      return <FileCheck className="h-5 w-5 text-blue-600" />;
    } else if (role?.includes('Legal')) {
      return <Briefcase className="h-5 w-5 text-green-600" />;
    } else if (role?.includes('Owner')) {
      return <Users className="h-5 w-5 text-primary-600" />;
    }
    return <ShoppingCart className="h-5 w-5 text-gray-600" />;
  };

  if (userRole !== 'Superadmin') {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Access denied. Superadmin privileges required.</p>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setShowAddUser(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Register New User
        </button>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Register New User</h2>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ethereum Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={newUser.address}
                  onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newUser.roleName}
                  onChange={(e) => setNewUser({ ...newUser, roleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="Property Owner">Property Owner</option>
                  <option value="Government Authority">Government Authority</option>
                  <option value="Legal Professional">Legal Professional</option>
                  <option value="Superadmin">Superadmin</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {registering ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Registered Users</h2>
          <p className="text-sm text-gray-600">
            Total: {users.filter(u => u.isRegistered).length} registered users
          </p>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user, index) => (
              <div
                key={`${user.address}-${index}`}
                className={`border rounded-lg p-4 ${user.isRegistered ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getRoleIcon(user.role)}
                    <div>
                      <p className="font-medium font-mono text-sm">{formatAddress(user.address)}</p>
                      <p className="text-sm text-gray-600">{user.role || 'Not registered'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user.isRegistered ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-600">Registered</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm text-yellow-600">Not Registered</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;

