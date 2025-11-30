import contractAddress from './contract-address.json';

export const CONTRACT_ADDRESS = contractAddress.address || '0x0000000000000000000000000000000000000000';
export const NETWORK_CHAIN_ID = 1337; // Hardhat local network
export const RPC_URL = 'http://127.0.0.1:8545';

// IPFS Configuration (using public gateway for demo)
export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// User Roles
export const ROLES = {
  SUPERADMIN: 'Superadmin',
  GOVERNMENT: 'Government Authority',
  PROPERTY_OWNER: 'Property Owner',
  LEGAL_PROFESSIONAL: 'Legal Professional',
  BUYER: 'Buyer'
};

// Property Status
export const PROPERTY_STATUS = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
  3: 'Listed for Sale',
  4: 'Sale in Progress',
  5: 'Sold' // Note: After sale, status is set back to Approved (1) so new owner can list again
};

// Transaction Status
export const TRANSACTION_STATUS = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
  3: 'Completed',
  4: 'Cancelled'
};
