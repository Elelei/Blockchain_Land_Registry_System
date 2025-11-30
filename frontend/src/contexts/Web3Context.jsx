import React, { createContext, useContext, useState, useEffect } from 'react';
import { connectWallet, getContract } from '../utils/web3';
import { toast } from 'react-toastify';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const connect = async () => {
    try {
      setIsConnecting(true);
      
      // Add a small delay to ensure MetaMask is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await connectWallet();
      setAccount(result.address);
      setContract(result.contract);
      setProvider(result.provider);

      // Get user role (non-blocking - if it fails, just default to Property Owner)
      try {
        const userRoleStr = await result.contract.userRoles(result.address);
        setUserRole(userRoleStr || 'Property Owner');
      } catch (error) {
        console.warn('Could not fetch user role:', error);
        setUserRole('Property Owner');
      }

      toast.success('Wallet connected successfully!');
      return result;
    } catch (error) {
      console.error('Connection error:', error);
      
      // Provide more helpful error messages
      let errorMessage = error.message || error.reason || 'Failed to connect wallet';
      
      // Check for specific error patterns
      if (errorMessage.includes('too many errors') || errorMessage.includes('RPC endpoint')) {
        errorMessage = 'Blockchain node connection issue. Please ensure the Hardhat node is running and try again.';
      } else if (errorMessage.includes('network')) {
        errorMessage = 'Network connection issue. Please check your MetaMask network settings.';
      } else if (errorMessage.includes('contract not deployed') || errorMessage.includes('No contract found')) {
        errorMessage = 'Smart contracts not deployed. Please deploy contracts first.';
      }
      
      toast.error(errorMessage, { autoClose: 5000 });
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setContract(null);
    setProvider(null);
    setUserRole(null);
    toast.info('Wallet disconnected');
  };

  useEffect(() => {
    // Check if already connected
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0) {
            await connect();
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          connect();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  const value = {
    account,
    contract,
    provider,
    isConnecting,
    userRole,
    connect,
    disconnect,
    isConnected: !!account
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
