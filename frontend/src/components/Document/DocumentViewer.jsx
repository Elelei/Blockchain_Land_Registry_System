import React, { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, X, Loader2, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { getIPFSURLs, isMockIPFSHash } from '../../services/ipfs';

const DocumentViewer = ({ ipfsHash, fileName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentGateway, setCurrentGateway] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [urls] = useState(() => getIPFSURLs(ipfsHash));

  // Reset state when ipfsHash changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setCurrentGateway(0);
    setRetryCount(0);
  }, [ipfsHash]);

  const handleImageError = () => {
    if (currentGateway < urls.length - 1) {
      setCurrentGateway(currentGateway + 1);
      setLoading(true);
    } else {
      setError('Failed to load document from all gateways');
      setLoading(false);
    }
  };

  const handleImageLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setCurrentGateway(0);
    setRetryCount(prev => prev + 1);
  };

  const handleDownload = () => {
    if (isMockIPFSHash(ipfsHash)) {
      // For development: Create a placeholder file to download
      const blob = new Blob(['This is a development placeholder file.\n\n' +
        'The actual document was not uploaded to IPFS.\n' +
        'To upload real documents, configure IPFS credentials in frontend/.env\n\n' +
        `Mock IPFS Hash: ${ipfsHash}\n` +
        `File Name: ${fileName || 'document'}\n` +
        `Uploaded: ${new Date().toLocaleString()}`], 
        { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName ? `${fileName}.txt` : 'document-placeholder.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }
    const link = document.createElement('a');
    link.href = urls[currentGateway];
    link.download = fileName || 'document';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    if (isMockIPFSHash(ipfsHash)) {
      // For development: Show info in a new tab
      const infoWindow = window.open('', '_blank');
      if (infoWindow) {
        infoWindow.document.write(`
          <html>
            <head><title>Mock IPFS Document - Development Mode</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
              <h1>Development Mode - Mock IPFS Hash</h1>
              <p><strong>This is a placeholder for development/testing.</strong></p>
              <p>The document was not actually uploaded to IPFS.</p>
              <hr>
              <h2>Document Information:</h2>
              <p><strong>File Name:</strong> ${fileName || 'Not specified'}</p>
              <p><strong>Mock IPFS Hash:</strong> <code>${ipfsHash}</code></p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              <hr>
              <h2>To View Real Documents:</h2>
              <ol>
                <li>Configure a real IPFS service (Pinata, Infura, or local node)</li>
                <li>Set environment variables in <code>frontend/.env</code>:
                  <ul>
                    <li><code>VITE_IPFS_API_URL</code></li>
                    <li><code>VITE_IPFS_PROJECT_ID</code></li>
                    <li><code>VITE_IPFS_PROJECT_SECRET</code></li>
                  </ul>
                </li>
                <li>Restart the frontend server</li>
                <li>Upload new documents (they will be stored on IPFS)</li>
              </ol>
            </body>
          </html>
        `);
        infoWindow.document.close();
      }
      return;
    }
    window.open(urls[currentGateway], '_blank');
  };

  if (!ipfsHash) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
        <p>No document available</p>
      </div>
    );
  }

  // Check if this is a mock IPFS hash (development only)
  const isMock = isMockIPFSHash(ipfsHash);
  
  const isImage = fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPDF = fileName?.match(/\.pdf$/i);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-primary-600" />
          <div>
            <h3 className="font-semibold text-gray-900">
              {fileName || 'Document'}
            </h3>
            <p className="text-sm text-gray-500 font-mono">{ipfsHash}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleDownload}
            className={`px-3 py-2 rounded-lg flex items-center text-sm ${isMock ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
            title={isMock ? 'Download placeholder file (development mode)' : 'Download document'}
          >
            <Download className="h-4 w-4 mr-2" />
            {isMock ? 'Download Info' : 'Download'}
          </button>
          <button
            onClick={handleOpenInNewTab}
            className={`px-3 py-2 rounded-lg flex items-center text-sm ${isMock ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
            title={isMock ? 'View placeholder info (development mode)' : 'Open document in new tab'}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {isMock ? 'View Info' : 'Open'}
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 relative">
        {isMock ? (
          <div className="p-8 text-center">
            <Info className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-yellow-600 mb-2 font-medium">Mock IPFS Hash (Development Mode)</p>
            <p className="text-sm text-gray-600 mb-4">
              This is a mock IPFS hash generated for development/testing purposes.
              <br />
              The document was not actually uploaded to IPFS.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              IPFS Hash: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{ipfsHash}</span>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <p className="text-sm text-blue-800 font-medium mb-2">To view real documents:</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Configure a real IPFS service (Pinata, Infura, or local node)</li>
                <li>Set environment variables: VITE_IPFS_API_URL, VITE_IPFS_PROJECT_ID, VITE_IPFS_PROJECT_SECRET</li>
                <li>Documents will be uploaded and viewable via IPFS gateways</li>
              </ul>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2 font-medium">{error}</p>
            <p className="text-sm text-gray-500 mb-4">
              IPFS Hash: <span className="font-mono text-xs">{ipfsHash}</span>
            </p>
            <div className="flex flex-col items-center space-y-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Loading
              </button>
              <p className="text-xs text-gray-500">
                You can also try accessing it directly using an IPFS gateway
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline px-2 py-1 bg-gray-100 rounded"
                  >
                    Gateway {index + 1}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            {isImage ? (
              <>
                <img
                  src={`${urls[currentGateway]}${retryCount > 0 ? `?retry=${retryCount}` : ''}`}
                  alt={fileName}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className="w-full h-auto max-h-96 object-contain mx-auto"
                  style={{ display: loading ? 'none' : 'block' }}
                />
                {loading && (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    <span className="ml-3 text-gray-600">Loading image from gateway {currentGateway + 1}...</span>
                  </div>
                )}
              </>
            ) : isPDF ? (
              <div className="relative">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    <span className="ml-3 text-gray-600">Loading PDF from gateway {currentGateway + 1}...</span>
                  </div>
                )}
                <iframe
                  src={`${urls[currentGateway]}${retryCount > 0 ? `?retry=${retryCount}` : ''}`}
                  className="w-full h-96"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  title={fileName}
                  style={{ display: loading ? 'none' : 'block' }}
                />
              </div>
            ) : (
              <div className="p-8 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">
                  Document preview not available for this file type
                </p>
                <a
                  href={urls[currentGateway]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  Open document in new tab
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {urls.length > 1 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Using gateway {currentGateway + 1} of {urls.length}
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;

