import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import PropertyCard from './PropertyCard';
import { Search, Filter, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { PROPERTY_STATUS } from '../../config/constants';
import { formatEther } from '../../utils/web3';

const PropertyList = () => {
  const { contract, isConnected } = useWeb3();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [villageFilter, setVillageFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueStates, setUniqueStates] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueVillages, setUniqueVillages] = useState([]);

  useEffect(() => {
    if (contract && isConnected) {
      loadProperties();
    }
  }, [contract, isConnected]);

  useEffect(() => {
    filterProperties();
  }, [searchTerm, statusFilter, stateFilter, districtFilter, villageFilter, priceMin, priceMax, sortBy, properties]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const totalProperties = await contract.getTotalProperties();
      const propertyPromises = [];

      for (let i = 1; i <= Number(totalProperties); i++) {
        propertyPromises.push(contract.getProperty(i));
      }

      const propertyData = await Promise.all(propertyPromises);
      
      const formattedProperties = propertyData.map((prop, index) => ({
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
      })).filter(prop => prop.isActive && prop.id.toString() !== '0');

      setProperties(formattedProperties);
      
      // Extract unique values for filters
      const states = [...new Set(formattedProperties.map(p => p.state))].sort();
      const districts = [...new Set(formattedProperties.map(p => p.district))].sort();
      const villages = [...new Set(formattedProperties.map(p => p.village))].sort();
      setUniqueStates(states);
      setUniqueDistricts(districts);
      setUniqueVillages(villages);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProperties = () => {
    let filtered = [...properties];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(prop => prop.status === Number(statusFilter));
    }

    // Location filters
    if (stateFilter !== 'all') {
      filtered = filtered.filter(prop => prop.state === stateFilter);
    }
    if (districtFilter !== 'all') {
      filtered = filtered.filter(prop => prop.district === districtFilter);
    }
    if (villageFilter !== 'all') {
      filtered = filtered.filter(prop => prop.village === villageFilter);
    }

    // Price range filter
    if (priceMin) {
      const minPrice = parseFloat(priceMin);
      filtered = filtered.filter(prop => {
        const propPrice = parseFloat(formatEther(prop.marketValue));
        return propPrice >= minPrice;
      });
    }
    if (priceMax) {
      const maxPrice = parseFloat(priceMax);
      filtered = filtered.filter(prop => {
        const propPrice = parseFloat(formatEther(prop.marketValue));
        return propPrice <= maxPrice;
      });
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(prop =>
        prop.propertyId.toLowerCase().includes(term) ||
        prop.surveyNumber.toLowerCase().includes(term) ||
        prop.state.toLowerCase().includes(term) ||
        prop.district.toLowerCase().includes(term) ||
        prop.village.toLowerCase().includes(term) ||
        prop.owner.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.registeredAt) - Number(a.registeredAt);
        case 'oldest':
          return Number(a.registeredAt) - Number(b.registeredAt);
        case 'price-low':
          return Number(a.marketValue) - Number(b.marketValue);
        case 'price-high':
          return Number(b.marketValue) - Number(a.marketValue);
        case 'name-asc':
          return a.propertyId.localeCompare(b.propertyId);
        case 'name-desc':
          return b.propertyId.localeCompare(a.propertyId);
        default:
          return 0;
      }
    });

    setFilteredProperties(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setStateFilter('all');
    setDistrictFilter('all');
    setVillageFilter('all');
    setPriceMin('');
    setPriceMax('');
    setSortBy('newest');
  };

  const hasActiveFilters = statusFilter !== 'all' || stateFilter !== 'all' || 
    districtFilter !== 'all' || villageFilter !== 'all' || 
    priceMin || priceMax || searchTerm;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Property Registry</h2>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center text-sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by property ID, survey number, location, owner address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  {Object.entries(PROPERTY_STATUS).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              {/* State Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setDistrictFilter('all');
                    setVillageFilter('all');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All States</option>
                  {uniqueStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* District Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <select
                  value={districtFilter}
                  onChange={(e) => {
                    setDistrictFilter(e.target.value);
                    setVillageFilter('all');
                  }}
                  disabled={stateFilter === 'all'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="all">All Districts</option>
                  {uniqueDistricts
                    .filter(district => stateFilter === 'all' || properties.find(p => p.district === district && p.state === stateFilter))
                    .map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                </select>
              </div>

              {/* Village Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                <select
                  value={villageFilter}
                  onChange={(e) => setVillageFilter(e.target.value)}
                  disabled={districtFilter === 'all'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="all">All Villages</option>
                  {uniqueVillages
                    .filter(village => {
                      if (districtFilter === 'all') return false;
                      return properties.find(p => p.village === village && p.district === districtFilter);
                    })
                    .map(village => (
                      <option key={village} value={village}>{village}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Price (ETH)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Price (ETH)</label>
                <input
                  type="number"
                  placeholder="No limit"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 mt-4">
          Showing {filteredProperties.length} of {properties.length} properties
          {hasActiveFilters && (
            <span className="ml-2 text-primary-600">(filtered)</span>
          )}
        </div>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">No properties found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id.toString()} property={property} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyList;
