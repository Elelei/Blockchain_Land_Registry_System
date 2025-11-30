import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Tag } from 'lucide-react';
import { PROPERTY_STATUS } from '../../config/constants';
import { formatEther } from '../../utils/web3';

const PropertyCard = ({ property }) => {
  const statusColors = {
    0: 'bg-yellow-100 text-yellow-800',
    1: 'bg-green-100 text-green-800',
    2: 'bg-red-100 text-red-800',
    3: 'bg-blue-100 text-blue-800',
    4: 'bg-purple-100 text-purple-800',
    5: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {property.propertyId}
            </h3>
            <p className="text-sm text-gray-500">{property.surveyNumber}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
            {PROPERTY_STATUS[property.status]}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 text-primary-500" />
            <span>{property.village}, {property.district}, {property.state}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign className="h-4 w-4 mr-2 text-primary-500" />
            <span className="font-semibold">{formatEther(property.marketValue)} ETH</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Tag className="h-4 w-4 mr-2 text-primary-500" />
            <span>ID: {property.id.toString()}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <Link
            to={`/property/${property.id}`}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            View Details →
          </Link>
          {property.status === 3 && (
            <span className="text-xs text-green-600 font-medium">Available for Sale</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
