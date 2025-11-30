import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../contexts/Web3Context';
import { Upload, FileText, ArrowLeft, MapPin } from 'lucide-react';
import { uploadToIPFS, validateFile } from '../../services/ipfs';
import { parseEther } from '../../utils/web3';
import { toast } from 'react-toastify';
import PropertyMap from './PropertyMap';

const RegisterProperty = () => {
  const navigate = useNavigate();
  const { contract, account, isConnected } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    state: '',
    district: '',
    village: '',
    surveyNumber: '',
    marketValue: '',
    owner: '',
    latitude: '',
    longitude: ''
  });
  const [document, setDocument] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      setDocument(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setDocumentPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setDocumentPreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!contract) {
      toast.error('Contract not loaded');
      return;
    }

    // Basic validation
    if (!formData.state?.trim() || !formData.district?.trim() || 
        !formData.village?.trim() || !formData.surveyNumber?.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.marketValue || parseFloat(formData.marketValue) <= 0) {
      toast.error('Market value must be greater than 0');
      return;
    }

    try {
      setLoading(true);

      // Prepare metadata with coordinates
      const metadata = {
        coordinates: formData.latitude && formData.longitude 
          ? { latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) }
          : null,
        registrationDate: new Date().toISOString(),
        ...formData
      };

      // Upload document to IPFS (optional - can continue without it)
      let ipfsHash = '';
      if (document) {
        setUploading(true);
        try {
          // If we have coordinates, create a metadata file and upload both
          if (metadata.coordinates) {
            const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
            const metadataFile = new File([metadataBlob], 'property-metadata.json', { type: 'application/json' });
            
            // Upload metadata first, then document
            const metadataHash = await uploadToIPFS(metadataFile);
            const docHash = await uploadToIPFS(document);
            
            // Store both hashes (we'll use document hash as primary, metadata as secondary)
            ipfsHash = `${docHash}|${metadataHash}`;
          } else {
          ipfsHash = await uploadToIPFS(document);
          }
          setUploading(false);
          toast.success('Document uploaded to IPFS');
        } catch (uploadError) {
          console.error('IPFS upload failed:', uploadError);
          setUploading(false);
          
          // Provide more specific error message
          let errorMsg = 'Document upload failed. ';
          if (uploadError.message) {
            if (uploadError.message.includes('Invalid file type')) {
              errorMsg += 'File type not supported. ';
            } else if (uploadError.message.includes('size')) {
              errorMsg += 'File too large. ';
            } else {
              errorMsg += uploadError.message + '. ';
            }
          }
          errorMsg += 'Continuing registration without document...';
          
          toast.warning(errorMsg, { autoClose: 5000 });
        }
      } else if (metadata.coordinates) {
        // If no document but we have coordinates, upload metadata
        setUploading(true);
        try {
          const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
          const metadataFile = new File([metadataBlob], 'property-metadata.json', { type: 'application/json' });
          ipfsHash = await uploadToIPFS(metadataFile);
          setUploading(false);
          toast.success('Property location saved');
        } catch (uploadError) {
          console.error('Metadata upload failed:', uploadError);
          setUploading(false);
          toast.warning('Could not save property location metadata. Property will be registered without coordinates.', { autoClose: 4000 });
        }
      }

      // Register property
      const owner = formData.owner || account;
      const tx = await contract.registerProperty(
        formData.state,
        formData.district,
        formData.village,
        formData.surveyNumber,
        owner,
        parseEther(formData.marketValue),
        ipfsHash
      );

      toast.info('Transaction submitted. Waiting for confirmation...');
      await tx.wait();
      
      toast.success('Property registered successfully! Awaiting admin approval.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error registering property:', error);
      
      // Extract detailed error message
      let errorMessage = 'Failed to register property';
      
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        // Check for common error patterns
        if (error.message.includes('user rejected') || error.message.includes('User denied')) {
          errorMessage = 'Transaction was rejected. Please approve the transaction in MetaMask.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas fees. Please ensure you have enough ETH.';
        } else if (error.message.includes('execution reverted')) {
          // Try to extract revert reason
          const match = error.message.match(/execution reverted:?\s*(.+?)(?:\s*\(|$)/i);
          errorMessage = match ? match[1] : 'Transaction reverted. Check console for details.';
        } else if (error.message.includes('paused')) {
          errorMessage = 'Contract is paused. Please contact administrator.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, { autoClose: 6000 });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Register New Property</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter state"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District *
              </label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter district"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Village *
              </label>
              <input
                type="text"
                name="village"
                value={formData.village}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter village"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Survey Number *
              </label>
              <input
                type="text"
                name="surveyNumber"
                value={formData.surveyNumber}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter survey number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market Value (ETH) *
              </label>
              <input
                type="number"
                name="marketValue"
                value={formData.marketValue}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Address (leave empty to use your address)
              </label>
              <input
                type="text"
                name="owner"
                value={formData.owner}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                placeholder={account || "0x..."}
              />
            </div>
          </div>

          {/* Location Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Property Location (GIS Map)
              </label>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="flex items-center text-sm text-primary-600 hover:text-primary-700"
              >
                <MapPin className="h-4 w-4 mr-1" />
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>

            {showMap && (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <PropertyMap
                  selectable={true}
                  onLocationSelect={(location) => {
                    setFormData({
                      ...formData,
                      latitude: location.latitude.toFixed(6),
                      longitude: location.longitude.toFixed(6)
                    });
                    toast.success('Location selected! Click on the map to change it.');
                  }}
                  height={400}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude (optional)
                </label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  step="0.000001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., -1.083333"
                />
                <p className="text-xs text-gray-500 mt-1">Or click on the map above to select</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude (optional)
                </label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  step="0.000001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 35.866667"
                />
                <p className="text-xs text-gray-500 mt-1">Or click on the map above to select</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Documents
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF, JPG, PNG, DOC, DOCX up to 10MB</p>
                {document && (
                  <div className="mt-2">
                    <FileText className="h-5 w-5 text-green-500 mx-auto" />
                    <p className="text-sm text-gray-600 mt-1">{document.name}</p>
                    {documentPreview && (
                      <img src={documentPreview} alt="Preview" className="mt-2 max-h-32 mx-auto rounded" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {uploading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Uploading...
                </>
              ) : loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Registering...
                </>
              ) : (
                'Register Property'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterProperty;
