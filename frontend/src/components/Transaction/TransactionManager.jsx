import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { CheckCircle, XCircle, Loader2, Clock, FileText } from 'lucide-react';
import { TRANSACTION_STATUS } from '../../config/constants';
import { formatEther } from '../../utils/web3';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import DocumentViewer from '../Document/DocumentViewer';

const TransactionManager = () => {
  const { contract, account } = useWeb3();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    if (contract && account) {
      loadTransactions();
    }
  }, [contract, account]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const allTransactions = [];
      
      // Get user's properties (as seller)
      const propertyIds = await contract.getOwnerProperties(account);
      
      // Get all transactions for user's properties (where user is seller)
      for (const propertyId of propertyIds) {
        const txIds = await contract.getPropertyTransactions(propertyId);
        for (const txId of txIds) {
          const tx = await contract.getTransaction(txId);
          allTransactions.push({
            id: tx[0],
            propertyId: tx[1],
            seller: tx[2],
            buyer: tx[3],
            price: tx[4],
            status: Number(tx[5]),
            requestedAt: tx[6],
            completedAt: tx[7],
            ipfsHash: tx[8]
          });
        }
      }

      // Get all properties to find transactions where user is buyer
      // Note: This is a workaround - ideally contract would have getBuyerTransactions function
      try {
        const totalProperties = await contract.getTotalProperties();
        for (let i = 1; i <= Number(totalProperties); i++) {
          try {
            const txIds = await contract.getPropertyTransactions(i);
            for (const txId of txIds) {
              const tx = await contract.getTransaction(txId);
              // Check if user is buyer and transaction not already added
              if (tx[3].toLowerCase() === account.toLowerCase()) {
                const exists = allTransactions.find(t => Number(t.id) === Number(tx[0]));
                if (!exists) {
                  allTransactions.push({
                    id: tx[0],
                    propertyId: tx[1],
                    seller: tx[2],
                    buyer: tx[3],
                    price: tx[4],
                    status: Number(tx[5]),
                    requestedAt: tx[6],
                    completedAt: tx[7],
                    ipfsHash: tx[8]
                  });
                }
              }
            }
          } catch (error) {
            // Property might not exist, continue
            continue;
          }
        }
      } catch (error) {
        console.warn('Could not load buyer transactions:', error);
      }
      
      // Sort by most recent first
      setTransactions(allTransactions.sort((a, b) => Number(b.requestedAt) - Number(a.requestedAt)));
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (transactionId, approve) => {
    try {
      const tx = await contract.processPurchaseRequest(transactionId, approve);
      await tx.wait();
      toast.success(approve ? 'Purchase request approved' : 'Purchase request rejected');
      await loadTransactions();
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Failed to process request');
    }
  };

  const handleCompletePurchase = async (transactionId) => {
    try {
      const tx = await contract.completePurchase(transactionId);
      await tx.wait();
      toast.success('Purchase completed successfully!');
      await loadTransactions();
    } catch (error) {
      console.error('Error completing purchase:', error);
      toast.error('Failed to complete purchase');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 1: return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 2: return <XCircle className="h-5 w-5 text-red-500" />;
      case 3: return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default: return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const pendingTransactions = transactions.filter(tx => 
    tx.status === 0 && tx.seller.toLowerCase() === account.toLowerCase()
  );

  const approvedTransactions = transactions.filter(tx => 
    tx.status === 1 && tx.buyer.toLowerCase() === account.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Transaction Management</h1>

      {pendingTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Purchase Requests</h2>
          <div className="space-y-4">
            {pendingTransactions.map((tx) => (
              <div key={tx.id.toString()} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link
                      to={`/property/${tx.propertyId}`}
                      className="font-semibold text-primary-600 hover:underline"
                    >
                      Property #{tx.propertyId}
                    </Link>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>Buyer: <span className="font-mono">{tx.buyer}</span></p>
                      <p>Price: <span className="font-semibold">{formatEther(tx.price)} ETH</span></p>
                      <p>Status: {TRANSACTION_STATUS[tx.status]}</p>
                      {tx.ipfsHash && (
                        <button
                          onClick={() => setViewingDocument({ hash: tx.ipfsHash, name: `Transaction-${tx.id}-Documents` })}
                          className="mt-2 text-primary-600 hover:underline flex items-center text-sm"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Documents
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleProcessRequest(tx.id, true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleProcessRequest(tx.id, false)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvedTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Approved Purchases (Ready to Complete)</h2>
          <div className="space-y-4">
            {approvedTransactions.map((tx) => (
              <div key={tx.id.toString()} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link
                      to={`/property/${tx.propertyId}`}
                      className="font-semibold text-primary-600 hover:underline"
                    >
                      Property #{tx.propertyId}
                    </Link>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>Seller: <span className="font-mono">{tx.seller}</span></p>
                      <p>Price: <span className="font-semibold">{formatEther(tx.price)} ETH</span></p>
                      <p>Status: {TRANSACTION_STATUS[tx.status]}</p>
                      {tx.ipfsHash && (
                        <button
                          onClick={() => setViewingDocument({ hash: tx.ipfsHash, name: `Transaction-${tx.id}-Documents` })}
                          className="mt-2 text-primary-600 hover:underline flex items-center text-sm"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Documents
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {getStatusIcon(tx.status)}
                    <button
                      onClick={() => handleCompletePurchase(tx.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Complete Purchase
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">All Transactions</h2>
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id.toString()} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <Link
                      to={`/property/${tx.propertyId}`}
                      className="font-semibold text-primary-600 hover:underline"
                    >
                      Property #{tx.propertyId}
                    </Link>
                    <div className="mt-1 text-sm text-gray-600">
                      <span className={tx.seller.toLowerCase() === account.toLowerCase() ? 'text-red-600' : 'text-green-600'}>
                        {tx.seller.toLowerCase() === account.toLowerCase() ? 'Sale' : 'Purchase'}
                      </span>
                      {' • '}
                      <span className="font-semibold">{formatEther(tx.price)} ETH</span>
                      {' • '}
                      {tx.seller.toLowerCase() === account.toLowerCase() ? (
                        <span>Buyer: <span className="font-mono text-xs">{tx.buyer}</span></span>
                      ) : (
                        <span>Seller: <span className="font-mono text-xs">{tx.seller}</span></span>
                      )}
                      {tx.ipfsHash && (
                        <>
                          {' • '}
                          <button
                            onClick={() => setViewingDocument({ hash: tx.ipfsHash, name: `Transaction-${tx.id}-Documents` })}
                            className="text-primary-600 hover:underline flex items-center text-xs"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Documents
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(tx.status)}
                    <span className="text-sm text-gray-600">{TRANSACTION_STATUS[tx.status]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {transactions.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No transactions found</p>
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

export default TransactionManager;
