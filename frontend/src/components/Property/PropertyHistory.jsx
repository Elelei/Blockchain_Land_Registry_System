import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWeb3 } from '../../contexts/Web3Context';
import { History, ArrowRight, Calendar, User, DollarSign, CheckCircle, XCircle, Clock, Loader2, FileText } from 'lucide-react';
import { TRANSACTION_STATUS } from '../../config/constants';
import { formatEther, formatAddress } from '../../utils/web3';
import { format } from 'date-fns';
import DocumentViewer from '../Document/DocumentViewer';

const PropertyHistory = () => {
  const { id } = useParams();
  const { contract, isConnected } = useWeb3();
  const [property, setProperty] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    if (contract && isConnected && id) {
      loadPropertyHistory();
    }
  }, [contract, isConnected, id]);

  const loadPropertyHistory = async () => {
    try {
      setLoading(true);
      
      // Load property details
      const prop = await contract.getProperty(id);
      setProperty({
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
      });

      // Load all transactions for this property
      const txIds = await contract.getPropertyTransactions(id);
      const transactionPromises = txIds.map(txId => contract.getTransaction(txId));
      const txData = await Promise.all(transactionPromises);

      const formattedTransactions = txData.map((tx, index) => ({
        id: tx[0],
        propertyId: tx[1],
        seller: tx[2],
        buyer: tx[3],
        price: tx[4],
        status: Number(tx[5]),
        requestedAt: tx[6],
        completedAt: tx[7],
        ipfsHash: tx[8]
      })).sort((a, b) => Number(b.requestedAt) - Number(a.requestedAt)); // Sort by newest first

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error loading property history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 0: // Pending
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 1: // Approved
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 2: // Rejected
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 3: // Completed
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 4: // Cancelled
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 0: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 1: return 'text-green-600 bg-green-50 border-green-200';
      case 2: return 'text-red-600 bg-red-50 border-red-200';
      case 3: return 'text-blue-600 bg-blue-50 border-blue-200';
      case 4: return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <p className="text-gray-500 text-lg">Property not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-4">
          <History className="h-6 w-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Property Transaction History</h1>
        </div>
        
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{property.propertyId}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Location</p>
              <p className="font-medium">{property.village}, {property.district}</p>
            </div>
            <div>
              <p className="text-gray-500">Current Owner</p>
              <p className="font-mono text-xs font-medium">{formatAddress(property.owner)}</p>
            </div>
            <div>
              <p className="text-gray-500">Market Value</p>
              <p className="font-medium">{formatEther(property.marketValue)} ETH</p>
            </div>
            <div>
              <p className="text-gray-500">Registered</p>
              <p className="font-medium">
                {format(new Date(Number(property.registeredAt) * 1000), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Event */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Property Registered</h3>
              <span className="text-sm text-gray-500">
                {format(new Date(Number(property.registeredAt) * 1000), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Property was registered by <span className="font-mono text-xs">{formatAddress(property.owner)}</span>
            </p>
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">
                Registration Date: {format(new Date(Number(property.registeredAt) * 1000), 'MMMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      {transactions.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
          {transactions.map((tx, index) => (
            <div key={tx.id.toString()} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(tx.status)}
                      <h3 className="font-semibold text-gray-900">
                        Transaction #{tx.id.toString()}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(tx.status)}`}>
                        {TRANSACTION_STATUS[tx.status]}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {format(new Date(Number(tx.requestedAt) * 1000), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Seller</p>
                        <p className="text-sm font-mono">{formatAddress(tx.seller)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Buyer</p>
                        <p className="text-sm font-mono">{formatAddress(tx.buyer)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-sm font-medium">{formatEther(tx.price)} ETH</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">
                          {tx.completedAt && Number(tx.completedAt) > 0 
                            ? 'Completed' 
                            : 'Requested'}
                        </p>
                        <p className="text-sm">
                          {tx.completedAt && Number(tx.completedAt) > 0
                            ? format(new Date(Number(tx.completedAt) * 1000), 'MMM dd, yyyy')
                            : format(new Date(Number(tx.requestedAt) * 1000), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {tx.ipfsHash && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => setViewingDocument({ hash: tx.ipfsHash, name: `Transaction-${tx.id}-Documents` })}
                        className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Transaction Documents
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No transaction history available</p>
          <p className="text-sm text-gray-400 mt-2">This property has not been involved in any transactions yet.</p>
        </div>
      )}

      {/* Document Viewer Modal */}
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

export default PropertyHistory;

