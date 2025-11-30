import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, NETWORK_CHAIN_ID, RPC_URL } from '../config/constants';

// Contract ABI - this will be generated after compilation
// For now, using minimal ABI with main functions
export const LAND_REGISTRY_ABI = [
  // Core Functions
  "function registerProperty(string,string,string,string,address,uint256,string) returns (uint256)",
  "function registerUser(address,bytes32,string)",
  "function approveProperty(uint256,bool)",
  "function listPropertyForSale(uint256,uint256)",
  "function requestToPurchase(uint256,uint256,string) payable",
  "function processPurchaseRequest(uint256,bool)",
  "function completePurchase(uint256)",
  "function updatePropertyDocuments(uint256,string)",
  "function removeFromSale(uint256)",
  // Documentation-aligned Functions
  "function addSuperAdmin(address,string[],string)",
  "function getSuperadminVillages(address) view returns (string[])",
  "function viewRequest(uint256) view returns (uint256[])",
  "function landInfoOwner(uint256) view returns (tuple(uint256,string,string,string,string,address,uint256,string,string,uint8,uint256,uint256,bool),uint256[])",
  "function landInfoUser(uint256) view returns (tuple(uint256,string,string,string,string,address,uint256,string,string,uint8,uint256,uint256,bool))",
  "function viewAssets(address) view returns (uint256[])",
  "function makeAvailable(uint256,uint256)",
  "function requestToLandOwner(uint256,uint256,string) payable",
  "function processRequest(uint256,bool)",
  "function buyProperty(uint256)",
  // View Functions
  "function getProperty(uint256) view returns (tuple(uint256,string,string,string,string,address,uint256,string,string,uint8,uint256,uint256,bool))",
  "function getOwnerProperties(address) view returns (uint256[])",
  "function getTransaction(uint256) view returns (tuple(uint256,uint256,address,address,uint256,uint8,uint256,uint256,string))",
  "function getPropertyTransactions(uint256) view returns (uint256[])",
  "function getTotalProperties() view returns (uint256)",
  "function registeredUsers(address) view returns (bool)",
  "function userRoles(address) view returns (string)",
  "function properties(uint256) view returns (uint256,string,string,string,string,address,uint256,string,string,uint8,uint256,uint256,bool)",
  "function transactions(uint256) view returns (uint256,uint256,address,address,uint256,uint8,uint256,uint256,string)",
  "function paused() view returns (bool)",
  "function SUPERADMIN_ROLE() view returns (bytes32)",
  "function GOVERNMENT_ROLE() view returns (bytes32)",
  "function PROPERTY_OWNER_ROLE() view returns (bytes32)",
  "function LEGAL_PROFESSIONAL_ROLE() view returns (bytes32)",
  // Events
  "event PropertyRegistered(uint256 indexed,address indexed,string,uint256)",
  "event PropertyStatusChanged(uint256 indexed,uint8,uint8)",
  "event PropertyListedForSale(uint256 indexed,address indexed,uint256)",
  "event PurchaseRequested(uint256 indexed,uint256 indexed,address indexed,address,uint256)",
  "event PurchaseApproved(uint256 indexed,uint256 indexed,address indexed)",
  "event PurchaseRejected(uint256 indexed,uint256 indexed,address indexed)",
  "event OwnershipTransferred(uint256 indexed,address indexed,address indexed,uint256)",
  "event UserRegistered(address indexed,string)",
  "event DocumentsUpdated(uint256 indexed,string)"
];

let provider = null;
let signer = null;
let contract = null;

// Helper function to retry RPC calls with exponential backoff
const retryRpcCall = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

// Helper function to check if RPC endpoint is available
const checkRpcEndpoint = async () => {
  try {
    const directProvider = new ethers.JsonRpcProvider(RPC_URL);
    await directProvider.getBlockNumber();
    return true;
  } catch (error) {
    console.warn('RPC endpoint check failed:', error);
    return false;
  }
};

export const connectWallet = async () => {
  try {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed. Please install MetaMask extension to connect your wallet.');
    }

    // Validate contract address
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      throw new Error('Contract not deployed. Please deploy the contract first.');
    }

    // Check if RPC endpoint is available first (using direct connection)
    const rpcAvailable = await checkRpcEndpoint();
    if (!rpcAvailable) {
      throw new Error(
        `Cannot connect to blockchain node at ${RPC_URL}.\n\n` +
        `Please ensure the Hardhat node is running:\n` +
        `  npm run start:blockchain\n\n` +
        `Then refresh this page and try again.`
      );
    }

    // Request account access
    let accounts;
    try {
      accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('Please connect your MetaMask account. The connection request was rejected.');
      }
      throw new Error(`Failed to connect to MetaMask: ${error.message}`);
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask and try again.');
    }

    // Check network
    let chainId;
    try {
      chainId = await window.ethereum.request({ method: 'eth_chainId' });
    } catch (error) {
      throw new Error(`Failed to get network chain ID: ${error.message}`);
    }

    const chainIdDecimal = parseInt(chainId, 16);

    if (chainIdDecimal !== NETWORK_CHAIN_ID) {
      try {
        // Try to switch network first
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${NETWORK_CHAIN_ID.toString(16)}` }],
        });
      } catch (switchError) {
        // If network doesn't exist (error code 4902), add it
        if (switchError.code === 4902 || switchError.code === -32603) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${NETWORK_CHAIN_ID.toString(16)}`,
                chainName: 'Hardhat Local',
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: [RPC_URL],
                blockExplorerUrls: []
              }]
            });
            // Wait for network to be added
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (addError) {
            throw new Error(`Failed to add network. Please add Hardhat Local network manually in MetaMask:\n\nNetwork Name: Hardhat Local\nRPC URL: ${RPC_URL}\nChain ID: ${NETWORK_CHAIN_ID}\nCurrency Symbol: ETH\n\nThen refresh the page and try again.`);
          }
        } else if (switchError.code === 4001) {
          throw new Error('Please approve the network switch in MetaMask to continue.');
        } else {
          throw new Error(`Failed to switch network: ${switchError.message || 'Unknown error'}`);
        }
      }
    }

    // Wait a bit for network switch to complete and verify
    if (chainIdDecimal !== NETWORK_CHAIN_ID) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Verify network switch
      const newChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const newChainIdDecimal = parseInt(newChainId, 16);
      if (newChainIdDecimal !== NETWORK_CHAIN_ID) {
        throw new Error(`Network switch failed. Please ensure you're on Hardhat Local network (Chain ID: ${NETWORK_CHAIN_ID})`);
      }
    }

    // Create provider and signer
    provider = new ethers.BrowserProvider(window.ethereum, {
      name: 'Hardhat Local',
      chainId: NETWORK_CHAIN_ID
    });
    
    // Add a small delay to let the provider initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    signer = await provider.getSigner();

    // Verify contract address is valid using direct RPC provider first (to avoid MetaMask RPC errors)
    // This prevents the "too many errors" issue by checking directly
    let code;
    let contractVerified = false;
    
    try {
      // First, try direct RPC provider (most reliable)
      const directProvider = new ethers.JsonRpcProvider(RPC_URL, {
        name: 'Hardhat Local',
        chainId: NETWORK_CHAIN_ID
      });
      
      // Add timeout for the provider
      code = await Promise.race([
        retryRpcCall(
          () => directProvider.getCode(CONTRACT_ADDRESS),
          3,
          500
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Contract check timeout')), 10000)
        )
      ]);
      
      if (code && code !== '0x' && code !== '0x0' && code.length > 2) {
        contractVerified = true;
      }
    } catch (error) {
      console.warn('Direct RPC check failed:', error.message);
      
      // Fallback: Try through MetaMask provider (but with fewer retries to avoid errors)
      try {
        code = await Promise.race([
          retryRpcCall(
            () => provider.getCode(CONTRACT_ADDRESS),
            2,
            1000
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Contract check timeout')), 8000)
          )
        ]);
        
        if (code && code !== '0x' && code !== '0x0' && code.length > 2) {
          contractVerified = true;
        }
      } catch (metaMaskError) {
        console.error('MetaMask provider check also failed:', metaMaskError.message);
        // Continue anyway - sometimes the contract exists but the check fails
        // We'll let the contract creation attempt to fail gracefully if needed
      }
    }

    // Only throw error if we're certain the contract doesn't exist
    if (!contractVerified && (!code || code === '0x' || code === '0x0' || code.length <= 2)) {
      // Double-check with a simple RPC call
      try {
        const directProvider = new ethers.JsonRpcProvider(RPC_URL);
        const finalCheck = await directProvider.getCode(CONTRACT_ADDRESS);
        if (!finalCheck || finalCheck === '0x' || finalCheck === '0x0') {
          throw new Error(
            `No contract found at address ${CONTRACT_ADDRESS}.\n\n` +
            `This usually means the Hardhat node was restarted (contracts are lost on restart).\n\n` +
            `To fix this, run in your terminal:\n` +
            `  cd contracts\n` +
            `  npm run deploy -- --network localhost\n\n` +
            `Or from the root directory:\n` +
            `  npm run deploy:local\n\n` +
            `Then refresh this page and try connecting again.`
          );
        }
      } catch (finalError) {
      throw new Error(
        `No contract found at address ${CONTRACT_ADDRESS}.\n\n` +
        `This usually means the Hardhat node was restarted (contracts are lost on restart).\n\n` +
        `To fix this, run in your terminal:\n` +
          `  cd contracts\n` +
          `  npm run deploy -- --network localhost\n\n` +
          `Or from the root directory:\n` +
        `  npm run deploy:local\n\n` +
        `Then refresh this page and try connecting again.`
      );
      }
    }

    contract = new ethers.Contract(CONTRACT_ADDRESS, LAND_REGISTRY_ABI, signer);

    return {
      address: accounts[0],
      provider,
      signer,
      contract
    };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    
    // Provide user-friendly error messages
    if (error.message) {
      throw error;
    }
    throw new Error(`Wallet connection failed: ${error.message || 'Unknown error'}`);
  }
};

export const getProvider = () => {
  if (!provider) {
    if (typeof window.ethereum !== 'undefined') {
      provider = new ethers.BrowserProvider(window.ethereum, {
        name: 'Hardhat Local',
        chainId: NETWORK_CHAIN_ID
      });
    } else {
      provider = new ethers.JsonRpcProvider(RPC_URL, {
        name: 'Hardhat Local',
        chainId: NETWORK_CHAIN_ID
      });
    }
  }
  return provider;
};

export const getContract = async () => {
  if (!contract) {
    const provider = getProvider();
    if (typeof window.ethereum !== 'undefined') {
      signer = await provider.getSigner();
    } else {
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        signer = await provider.getSigner(accounts[0]);
      } else {
        throw new Error('No accounts available');
      }
    }
    contract = new ethers.Contract(CONTRACT_ADDRESS, LAND_REGISTRY_ABI, signer);
  }
  return contract;
};

export const formatEther = (value) => {
  return ethers.formatEther(value);
};

export const parseEther = (value) => {
  return ethers.parseEther(value.toString());
};

export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
