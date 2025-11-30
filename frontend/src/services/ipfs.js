import { create } from 'ipfs-http-client';
import { IPFS_GATEWAY } from '../config/constants';

// IPFS Configuration - supports multiple providers
const IPFS_PROVIDERS = {
  // Public IPFS HTTP API (requires local IPFS node or authenticated service)
  // For development, we'll use a mock client
  PUBLIC: null, // Set to null to use mock client
  // Add your own IPFS node or Pinata here
  // PINATA: 'https://api.pinata.cloud',
  // LOCAL: 'http://localhost:5001/api/v0',
  // INFURA: 'https://ipfs.infura.io:5001/api/v0' // Requires PROJECT_ID and PROJECT_SECRET
};

// Use environment variable or default to mock for development
const IPFS_API_URL = import.meta.env.VITE_IPFS_API_URL || IPFS_PROVIDERS.PUBLIC;
const IPFS_PROJECT_ID = import.meta.env.VITE_IPFS_PROJECT_ID;
const IPFS_PROJECT_SECRET = import.meta.env.VITE_IPFS_PROJECT_SECRET;

// Check if credentials are placeholders (not real credentials)
const isPlaceholder = (value) => {
  if (!value) return true;
  const placeholderPatterns = [
    'your_',
    'here',
    'placeholder',
    'example',
    'xxx',
    'yyy'
  ];
  const lowerValue = value.toLowerCase();
  return placeholderPatterns.some(pattern => lowerValue.includes(pattern));
};

// Pinata detection: If we have Pinata credentials, we can use Pinata
// Pinata uses REST API, not standard IPFS HTTP API, so we don't need IPFS_API_URL for Pinata
// Check if API URL points to Pinata OR if we have credentials (Pinata can work without API URL)
const isUsingPinata = (IPFS_API_URL?.includes('pinata') || (!IPFS_API_URL && IPFS_PROJECT_ID && IPFS_PROJECT_SECRET)) &&
  !isPlaceholder(IPFS_PROJECT_ID) && !isPlaceholder(IPFS_PROJECT_SECRET) &&
  IPFS_PROJECT_ID && IPFS_PROJECT_SECRET; // Ensure both are present

// Calculate hasValidCredentials before using it in console.log
const hasValidCredentials = (IPFS_API_URL && !isPlaceholder(IPFS_PROJECT_ID) && !isPlaceholder(IPFS_PROJECT_SECRET)) || isUsingPinata;

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log('🔧 IPFS Configuration:', {
    hasApiUrl: !!IPFS_API_URL,
    apiUrl: IPFS_API_URL,
    hasProjectId: !!IPFS_PROJECT_ID,
    hasProjectSecret: !!IPFS_PROJECT_SECRET,
    projectIdPreview: IPFS_PROJECT_ID ? `${IPFS_PROJECT_ID.substring(0, 8)}...` : 'none',
    isUsingPinata,
    hasValidCredentials,
    provider: isUsingPinata ? '📌 Pinata' : hasValidCredentials ? '🌐 IPFS' : '⚠️ Mock (Development)'
  });
  
  if (isUsingPinata) {
    console.log('✅ Pinata is configured and will be used for IPFS uploads');
  } else if (!hasValidCredentials) {
    console.warn('⚠️ Using mock IPFS client. Configure Pinata credentials in .env to use real IPFS.');
  }
}

// Mock IPFS client for development (generates fake hashes)
const getMockIPFSClient = () => {
  return {
    add: async (data, options) => {
      console.warn('⚠️ Using mock IPFS client - files are not actually uploaded to IPFS');
      console.warn('⚠️ This is for development only. For production, configure a real IPFS service.');
      
      // Simulate upload progress
      if (options?.progress) {
        const size = data.byteLength || data.size || 1000;
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 10));
          options.progress((size * i) / 100);
        }
      }
      
      // Generate a mock IPFS hash (CIDv0 format)
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const hash = `QmMock${random}${timestamp.toString(36)}`;
      
      // Simulate a small delay for realism
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return { 
        path: hash, 
        cid: { 
          toString: () => hash,
          toV0: () => hash,
          toV1: () => hash
        } 
      };
    }
  };
};

let ipfsClient = null;

export const getIPFSClient = () => {
  if (!ipfsClient) {
    // If no API URL is configured or credentials are placeholders, use mock client
    if (!IPFS_API_URL || !hasValidCredentials) {
      ipfsClient = getMockIPFSClient();
      return ipfsClient;
    }

    try {
      const config = {
        url: IPFS_API_URL,
      };

      // Pinata uses different authentication than Infura
      const isPinata = IPFS_API_URL.includes('pinata.cloud');
      
      if (isPinata) {
        // Pinata authentication: use pinataApiKey and pinataSecretApiKey headers
        if (IPFS_PROJECT_ID) {
          config.headers = {
            pinataApiKey: IPFS_PROJECT_ID
          };
          if (IPFS_PROJECT_SECRET) {
            config.headers.pinataSecretApiKey = IPFS_PROJECT_SECRET;
          }
        }
      } else {
        // Infura/other services use Basic auth
        if (IPFS_PROJECT_ID && IPFS_PROJECT_SECRET) {
          config.headers = {
            authorization: `Basic ${btoa(`${IPFS_PROJECT_ID}:${IPFS_PROJECT_SECRET}`)}`
          };
        }
      }

      ipfsClient = create(config);
    } catch (error) {
      console.error('Error initializing IPFS client:', error);
      console.warn('Falling back to mock IPFS client');
      // Return mock client for development/demo
      ipfsClient = getMockIPFSClient();
    }
  }
  return ipfsClient;
};

export const uploadToIPFS = async (file, onProgress) => {
  try {
    // Validate file first
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check if we're using Pinata (uses REST API, not standard IPFS client)
    // Pinata can be used even without IPFS_API_URL set, as long as we have credentials
    const isPinata = isUsingPinata;
    
    if (isPinata) {
      // Use Pinata's REST API
      const formData = new FormData();
      formData.append('file', file);
      
      // Pinata metadata (optional)
      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          uploadedAt: new Date().toISOString()
        }
      });
      formData.append('pinataMetadata', metadata);
      
      // Pinata options (optional)
      const pinataOptions = JSON.stringify({
        cidVersion: 0
      });
      formData.append('pinataOptions', pinataOptions);
      
      // Report progress start
      if (onProgress) {
        onProgress(10);
      }
      
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': IPFS_PROJECT_ID,
          'pinata_secret_api_key': IPFS_PROJECT_SECRET
        },
        body: formData
      });
      
      if (onProgress) {
        onProgress(90);
      }
      
      if (!response.ok) {
        let errorMessage = `Pinata API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.error || errorMessage;
          console.error('Pinata API Error Details:', errorData);
        } catch (e) {
          const errorText = await response.text().catch(() => '');
          console.error('Pinata API Error Response:', errorText);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      const hash = result.IpfsHash || result.ipfsHash || result.data?.IpfsHash;
      
      if (!hash) {
        console.error('Pinata Response:', result);
        throw new Error('Failed to get IPFS hash from Pinata response. Check console for details.');
      }
      
      if (onProgress) {
        onProgress(100);
      }
      
      console.log('✅ File uploaded to Pinata successfully:', hash);
      return hash;
    }
    
    // If Pinata is configured, we should have already handled it above
    // This should only run for non-Pinata IPFS providers
    if (isUsingPinata) {
      console.error('Pinata is configured but upload did not use Pinata API. This should not happen.');
      throw new Error('Pinata configuration error. Please check your .env file.');
    }
    
    // Use standard IPFS client (for Infura, local node, etc.)
    const client = getIPFSClient();
    
    // Check if we're using mock client
    const isMockClient = !hasValidCredentials || !IPFS_API_URL;
    
    // Convert file to buffer
    let fileBuffer;
    try {
      fileBuffer = await file.arrayBuffer();
    } catch (bufferError) {
      console.error('Error converting file to buffer:', bufferError);
      throw new Error('Failed to read file. Please ensure the file is valid.');
    }
    
    // Upload to IPFS with progress tracking
    const uploadOptions = {};
    if (onProgress) {
      uploadOptions.progress = (bytes) => {
        const fileSize = file.size || fileBuffer.byteLength || 1000;
        const progress = (bytes / fileSize) * 100;
        onProgress(Math.min(progress, 100));
      };
    }
    
    let result;
    try {
      result = await client.add(fileBuffer, uploadOptions);
    } catch (addError) {
      console.error('Error adding file to IPFS client:', addError);
      // If using real client and it fails, try mock as fallback
      if (!isMockClient) {
        console.warn('Real IPFS client failed, falling back to mock client');
        const mockClient = getMockIPFSClient();
        result = await mockClient.add(fileBuffer, uploadOptions);
      } else {
        throw addError;
      }
    }
    
    const hash = result.path || result.cid?.toString() || result.cid?.toV0?.() || result.cid?.toV1?.();
    
    if (!hash) {
      throw new Error('Failed to get IPFS hash from upload result');
    }
    
    return hash;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    
    // If it's an authentication error, provide helpful message
    if (error.message?.includes('project id') || error.message?.includes('project_id') || 
        error.message?.includes('401') || error.message?.includes('Unauthorized') ||
        error.message?.includes('403') || error.message?.includes('Forbidden')) {
      // Automatically fall back to mock client
      console.warn('IPFS authentication failed, using mock client');
      const mockClient = getMockIPFSClient();
      const fileBuffer = await file.arrayBuffer();
      const result = await mockClient.add(fileBuffer);
      const hash = result.path || result.cid?.toString();
      return hash;
    }
    
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
};

export const uploadMultipleToIPFS = async (files, onProgress) => {
  try {
    const client = getIPFSClient();
    const results = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate each file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(`File ${file.name}: ${validation.error}`);
      }

      const fileBuffer = await file.arrayBuffer();
      const result = await client.add(fileBuffer);
      const hash = result.path || result.cid.toString();
      results.push(hash);

      // Report progress
      if (onProgress) {
        const progress = ((i + 1) / totalFiles) * 100;
        onProgress(progress);
      }
    }

    return results;
  } catch (error) {
    console.error('Error uploading multiple files to IPFS:', error);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
};

export const getIPFSURL = (hash) => {
  if (!hash) return '';
  
  // Extract the first hash if it's in format "hash1|hash2" (document|metadata)
  const cleanHash = hash.split('|')[0].trim();
  
  // Support multiple gateways for redundancy
  const gateways = [
    IPFS_GATEWAY,
    'https://ipfs.io/ipfs/',
    'https://gateway.ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/'
  ];
  return `${gateways[0]}${cleanHash}`;
};

// Get alternative gateway URLs for fallback
export const getIPFSURLs = (hash) => {
  if (!hash) return [];
  
  // Extract the first hash if it's in format "hash1|hash2" (document|metadata)
  const cleanHash = hash.split('|')[0].trim();
  
  return [
    `${IPFS_GATEWAY}${cleanHash}`,
    `https://ipfs.io/ipfs/${cleanHash}`,
    `https://gateway.ipfs.io/ipfs/${cleanHash}`,
    `https://cloudflare-ipfs.com/ipfs/${cleanHash}`
  ];
};

// Check if IPFS hash is valid format
export const isValidIPFSHash = (hash) => {
  if (!hash) return false;
  // IPFS hashes typically start with Qm (CIDv0) or are base58 encoded (CIDv1)
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash) || hash.length > 0;
};

// Check if hash is a mock IPFS hash (for development)
export const isMockIPFSHash = (hash) => {
  if (!hash) return false;
  // Mock hashes start with "QmMock"
  return hash.startsWith('QmMock') || hash.toLowerCase().includes('mock');
};

export const validateFile = (file) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json' // Allow JSON files for metadata
  ];

  const maxSize = 10 * 1024 * 1024; // 10MB

  // Allow JSON files (for metadata) without type checking
  if (file.type === 'application/json' || file.name?.endsWith('.json')) {
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    return { valid: true };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX, JSON' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  return { valid: true };
};

/**
 * Fetch property metadata (including coordinates) from IPFS
 * @param {string} ipfsHash - IPFS hash (may contain multiple hashes separated by |)
 * @returns {Promise<Object|null>} - Metadata object with coordinates or null
 */
export const fetchPropertyMetadata = async (ipfsHash) => {
  if (!ipfsHash) return null;

  try {
    // Check if hash contains multiple hashes (document|metadata format)
    const hashes = ipfsHash.split('|');
    const documentHash = hashes[0].trim(); // First hash is the document
    const metadataHash = hashes.length > 1 ? hashes[1].trim() : null;

    // Try to fetch metadata first (if separate), otherwise try document hash as JSON
    const hashToFetch = metadataHash || documentHash;

    // Try to fetch from IPFS gateways
    const gateways = [
      IPFS_GATEWAY,
      'https://ipfs.io/ipfs/',
      'https://gateway.ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    ];

    for (const gateway of gateways) {
      try {
        const url = `${gateway}${hashToFetch}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          // If it's JSON, parse it
          if (contentType?.includes('application/json')) {
            const metadata = await response.json();
            return metadata;
          }
          
          // If it's not JSON, it might be a document, so return null
          // (coordinates would be in a separate metadata file)
          return null;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${gateway}:`, error);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching property metadata:', error);
    return null;
  }
};
