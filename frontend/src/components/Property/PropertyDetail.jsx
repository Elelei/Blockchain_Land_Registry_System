import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWeb3 } from '../../contexts/Web3Context';
import { MapPin, DollarSign, User, Calendar, FileText, ArrowLeft, CheckCircle, XCircle, Upload, X, History } from 'lucide-react';
import { PROPERTY_STATUS, TRANSACTION_STATUS } from '../../config/constants';
import { formatEther, parseEther } from '../../utils/web3';
import { toast } from 'react-toastify';
import { uploadToIPFS, validateFile, fetchPropertyMetadata } from '../../services/ipfs';
import { format } from 'date-fns';
import DocumentViewer from '../Document/DocumentViewer';
import PropertyMap from './PropertyMap';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contract, account, isConnected } = useWeb3();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [purchaseDocument, setPurchaseDocument] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [listingPrice, setListingPrice] = useState('');
  const [listing, setListing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [propertyCoordinates, setPropertyCoordinates] = useState(null);
  const [loadingCoordinates, setLoadingCoordinates] = useState(false);

  useEffect(() => {
    if (contract && isConnected && id) {
      loadProperty();
      loadTransactions();
    }
  }, [contract, isConnected, id]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const prop = await contract.getProperty(id);
      const propertyData = {
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
      };
      setProperty(propertyData);

      // Try to load coordinates from IPFS metadata
      if (propertyData.ipfsHash) {
        setLoadingCoordinates(true);
        try {
          const metadata = await fetchPropertyMetadata(propertyData.ipfsHash);
          if (metadata && metadata.coordinates) {
            setPropertyCoordinates({
              latitude: metadata.coordinates.latitude,
              longitude: metadata.coordinates.longitude
            });
          }
        } catch (error) {
          console.warn('Could not load property coordinates:', error);
        } finally {
          setLoadingCoordinates(false);
        }
      }
    } catch (error) {
      console.error('Error loading property:', error);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const txIds = await contract.getPropertyTransactions(id);
      const txPromises = txIds.map(txId => contract.getTransaction(txId));
      const txData = await Promise.all(txPromises);
      
      const formatted = txData.map(tx => ({
        id: tx[0],
        propertyId: tx[1],
        seller: tx[2],
        buyer: tx[3],
        price: tx[4],
        status: Number(tx[5]),
        requestedAt: tx[6],
        completedAt: tx[7],
        ipfsHash: tx[8]
      }));
      
      setTransactions(formatted);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleListForSale = async () => {
    if (!listingPrice || parseFloat(listingPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setListing(true);
      const tx = await contract.makeAvailable(id, parseEther(listingPrice));
      await tx.wait();
      toast.success('Property listed for sale successfully!');
      await loadProperty();
      setListingPrice('');
    } catch (error) {
      console.error('Error listing property:', error);
      toast.error(error.reason || 'Failed to list property for sale');
    } finally {
      setListing(false);
    }
  };

  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      setPurchaseDocument(file);
    }
  };

  const handleRequestPurchase = async () => {
    if (!purchasePrice || parseFloat(purchasePrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (parseFloat(purchasePrice) < parseFloat(formatEther(property.marketValue))) {
      toast.error('Price must be at least equal to market value');
      return;
    }

    try {
      setRequesting(true);
      let ipfsHash = '';

      // Upload document if provided
      if (purchaseDocument) {
        try {
          setUploadingDocument(true);
          setUploadProgress(0);
          ipfsHash = await uploadToIPFS(purchaseDocument, (progress) => {
            setUploadProgress(progress);
          });
          toast.success('Document uploaded to IPFS successfully');
        } catch (error) {
          console.error('Error uploading document:', error);
          toast.error('Failed to upload document. Continuing without document...');
        } finally {
          setUploadingDocument(false);
        }
      }

      // Submit purchase request
      const tx = await contract.requestToLandOwner(
        id,
        parseEther(purchasePrice),
        ipfsHash,
        { value: parseEther(purchasePrice) }
      );
      await tx.wait();
      toast.success('Purchase request submitted successfully!');
      await loadProperty();
      await loadTransactions();
      setPurchasePrice('');
      setPurchaseDocument(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error requesting purchase:', error);
      toast.error(error.reason || 'Failed to submit purchase request');
    } finally {
      setRequesting(false);
      setUploadingDocument(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Property not found</p>
      </div>
    );
  }

  const isOwner = property.owner.toLowerCase() === account?.toLowerCase();
  const statusColors = {
    0: 'bg-yellow-100 text-yellow-800',
    1: 'bg-green-100 text-green-800',
    2: 'bg-red-100 text-red-800',
    3: 'bg-blue-100 text-blue-800',
    4: 'bg-purple-100 text-purple-800',
    5: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {property.propertyId}
              </h1>
              <p className="text-gray-500">{property.surveyNumber}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[property.status]}`}>
              {PROPERTY_STATUS[property.status]}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-primary-500 mr-3 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{property.village}, {property.district}</p>
                <p className="text-sm text-gray-600">{property.state}</p>
              </div>
            </div>

            <div className="flex items-start">
              <DollarSign className="h-5 w-5 text-primary-500 mr-3 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Market Value</p>
                <p className="font-semibold text-lg">{formatEther(property.marketValue)} ETH</p>
              </div>
            </div>

            <div className="flex items-start">
              <User className="h-5 w-5 text-primary-500 mr-3 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Owner</p>
                <p className="font-medium font-mono text-sm">{property.owner}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-primary-500 mr-3 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Registered</p>
                <p className="font-medium">
                  {format(new Date(Number(property.registeredAt) * 1000), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            {property.ipfsHash && (
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-primary-500 mr-3 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Documents</p>
                  <button
                    onClick={() => setViewingDocument({ hash: property.ipfsHash, name: `Property-${property.id}-Documents` })}
                    className="text-primary-600 hover:underline text-sm"
                  >
                    View Document
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Property Map */}
          {propertyCoordinates && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary-500" />
                Property Location
              </h3>
              <PropertyMap
                property={{
                  ...property,
                  latitude: propertyCoordinates.latitude,
                  longitude: propertyCoordinates.longitude
                }}
                height={400}
              />
            </div>
          )}

          <div className="space-y-4">
            {isOwner && property.status === 1 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3">List for Sale</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Price in ETH"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    step="0.01"
                  />
                  <button
                    onClick={handleListForSale}
                    disabled={listing}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {listing ? 'Listing...' : 'List'}
                  </button>
                </div>
              </div>
            )}

            {!isOwner && property.status === 3 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Request Purchase</h3>
                <div className="space-y-3">
                  <input
                    type="number"
                    placeholder="Offer price (min: market value)"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    step="0.01"
                    min={formatEther(property.marketValue)}
                  />
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Transaction Documents (Optional)
                    </label>
                    {purchaseDocument ? (
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-primary-600" />
                          <span className="text-sm text-gray-700">{purchaseDocument.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(purchaseDocument.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => setPurchaseDocument(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                        <Upload className="h-5 w-5 mr-2 text-gray-400" />
                        <span className="text-sm text-gray-600">Upload Document (PDF, Image, DOC)</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleDocumentChange}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                      </label>
                    )}
                    
                    {uploadingDocument && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Uploading to IPFS...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleRequestPurchase}
                    disabled={requesting || uploadingDocument}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {uploadingDocument ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading Document...
                      </>
                    ) : requesting ? (
                      'Processing...'
                    ) : (
                      'Request Purchase'
                    )}
                  </button>
                </div>
              </div>
            )}

            {isOwner && (property.status === 3 || property.status === 4) && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Manage Sale</h3>
                <button
                  onClick={async () => {
                    try {
                      const tx = await contract.removeFromSale(id);
                      await tx.wait();
                      toast.success('Property removed from sale');
                      await loadProperty();
                    } catch (error) {
                      toast.error('Failed to remove from sale');
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Remove from Sale
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Transaction History</h2>
            <Link
              to={`/property/${id}/history`}
              className="inline-flex items-center px-3 py-1 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50"
            >
              <History className="h-4 w-4 mr-2" />
              View Full History
            </Link>
          </div>
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id.toString()} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">Transaction #{tx.id.toString()}</p>
                    <p className="text-sm text-gray-600">
                      Buyer: <span className="font-mono text-xs">{tx.buyer}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Price: <span className="font-semibold">{formatEther(tx.price)} ETH</span>
                    </p>
                    {tx.ipfsHash && (
                      <button
                        onClick={() => setViewingDocument({ hash: tx.ipfsHash, name: `Transaction-${tx.id}-Documents` })}
                        className="mt-2 text-sm text-primary-600 hover:underline flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Transaction Documents
                      </button>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    {tx.status === 1 && <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />}
                    {tx.status === 2 && <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />}
                    {tx.status === 3 && <CheckCircle className="h-6 w-6 text-blue-500 mx-auto mb-1" />}
                    <span className="text-xs text-gray-500">
                      {TRANSACTION_STATUS[tx.status]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] overflow-auto">
            <DocumentViewer
              ipfsHash={viewingDocument.hash}
              fileName={viewingDocument.name}
              onClose={() => setViewingDocument(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
