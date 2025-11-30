import React, { useEffect, useRef, useState } from 'react';
import MapView from '@arcgis/core/views/MapView';
import WebMap from '@arcgis/core/WebMap';
import Map from '@arcgis/core/Map';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import Basemap from '@arcgis/core/Basemap';
import { MapPin } from 'lucide-react';
import config from '@arcgis/core/config';

/**
 * PropertyMap Component
 * Displays an ArcGIS webmap with property locations
 * 
 * @param {Object} props
 * @param {string} props.webmapId - ArcGIS webmap ID (default: from URL)
 * @param {Object} props.property - Property object with location data
 * @param {Array} props.properties - Array of properties to display
 * @param {Function} props.onLocationSelect - Callback when user clicks map (for registration)
 * @param {boolean} props.selectable - Whether map is in selection mode
 * @param {number} props.height - Map height in pixels (default: 400)
 */
const PropertyMap = ({
  webmapId = '03d5e57458af469ba1184079ea6c1736', // Narok webmap from URL
  property = null,
  properties = [],
  onLocationSelect = null,
  selectable = false,
  height = 400
}) => {
  const mapRef = useRef(null);
  const viewRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let view = null;

    const initializeMap = async () => {
      try {
        // Configure ArcGIS (optional API key - can be set via environment variable)
        const apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
        if (apiKey) {
          config.apiKey = apiKey;
        }

        let map;

        // Try to load the webmap first, but use default basemap as fallback
        try {
          const webmap = new WebMap({
            portalItem: {
              id: webmapId
            }
          });

          // Try to load the webmap with a timeout
          await Promise.race([
            webmap.load(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Webmap load timeout')), 8000)
            )
          ]);

          // Verify webmap loaded successfully
          if (webmap.loaded) {
            map = webmap;
            console.log('ArcGIS webmap loaded successfully');
          } else {
            throw new Error('Webmap did not load completely');
          }
        } catch (webmapError) {
          console.warn('Could not load ArcGIS webmap, using default basemap:', webmapError);
          console.info('This is normal if the webmap requires authentication or is not publicly accessible');
          
          // Fallback to a default basemap (OpenStreetMap style, good for Kenya/Narok region)
          // Using 'streets-navigation-vector' which works without authentication
          const basemap = Basemap.fromId('streets-navigation-vector');
          map = new Map({
            basemap: basemap
          });
        }

        // Create map view
        view = new MapView({
          container: mapRef.current,
          map: map,
          zoom: property || properties.length > 0 ? 12 : 8,
          center: property 
            ? [property.longitude || 35.8, property.latitude || -1.1] // Narok approximate center
            : [35.8, -1.1] // Default to Narok center (Narok, Kenya)
        });

        viewRef.current = view;

        // Wait for view to load
        await view.when();

        setMapLoaded(true);

        // Add property marker if single property provided
        if (property && property.latitude && property.longitude) {
          const point = new Point({
            longitude: property.longitude,
            latitude: property.latitude
          });

          const markerSymbol = new SimpleMarkerSymbol({
            color: '#ef4444', // red-500
            outline: {
              color: '#ffffff',
              width: 2
            },
            size: 16
          });

          const graphic = new Graphic({
            geometry: point,
            symbol: markerSymbol,
            attributes: {
              title: property.propertyId || 'Property',
              description: `${property.village}, ${property.district}`
            }
          });

          view.graphics.add(graphic);
          
          // Center on property
          view.goTo({
            center: point,
            zoom: 15
          });
        }

        // Add multiple property markers if array provided
        if (properties.length > 0) {
          const graphics = properties
            .filter(p => p.latitude && p.longitude)
            .map(p => {
              const point = new Point({
                longitude: p.longitude,
                latitude: p.latitude
              });

              // Different colors based on status
              const statusColors = {
                0: '#eab308', // yellow - Pending
                1: '#22c55e', // green - Approved
                2: '#ef4444', // red - Rejected
                3: '#3b82f6', // blue - ListedForSale
                4: '#8b5cf6', // purple - SaleInProgress
                5: '#6b7280'  // gray - Sold
              };

              const markerSymbol = new SimpleMarkerSymbol({
                color: statusColors[p.status] || '#6b7280',
                outline: {
                  color: '#ffffff',
                  width: 2
                },
                size: 12
              });

              return new Graphic({
                geometry: point,
                symbol: markerSymbol,
                attributes: {
                  title: p.propertyId || `Property ${p.id}`,
                  description: `${p.village}, ${p.district} - ${p.surveyNumber}`
                }
              });
            });

          view.graphics.addMany(graphics);

          // Fit view to show all properties
          if (graphics.length > 0) {
            view.goTo(view.graphics.extent.expand(1.2));
          }
        }

        // Handle map clicks for location selection
        if (selectable && onLocationSelect) {
          view.on('click', async (event) => {
            const { longitude, latitude } = event.mapPoint;
            setSelectedLocation({ longitude, latitude });
            
            // Add temporary marker
            const point = new Point({
              longitude,
              latitude
            });

            const markerSymbol = new SimpleMarkerSymbol({
              color: '#3b82f6', // blue
              outline: {
                color: '#ffffff',
                width: 2
              },
              size: 14
            });

            // Remove previous selection marker
            const existingGraphics = view.graphics.toArray();
            const selectionGraphic = existingGraphics.find(g => 
              g.attributes && g.attributes.isSelection
            );
            if (selectionGraphic) {
              view.graphics.remove(selectionGraphic);
            }

            const graphic = new Graphic({
              geometry: point,
              symbol: markerSymbol,
              attributes: {
                isSelection: true,
                title: 'Selected Location'
              }
            });

            view.graphics.add(graphic);
            
            // Call callback with coordinates
            onLocationSelect({ longitude, latitude });
          });
        }

      } catch (err) {
        console.error('Error initializing map:', err);
        const errorMessage = err.message || 'Unknown error';
        
        // Provide more specific error messages
        if (errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
          setError('Map authentication failed. The webmap may require an API key. Using default map instead.');
        } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
          setError('Network timeout. Please check your internet connection and try again.');
        } else {
          setError(`Failed to load map: ${errorMessage}. Using default map instead.`);
        }
        
        // Try to create a basic map as fallback
        try {
          const basemap = Basemap.fromId('streets-navigation-vector');
          const fallbackMap = new Map({ basemap });
          
          view = new MapView({
            container: mapRef.current,
            map: fallbackMap,
            zoom: property || properties.length > 0 ? 12 : 8,
            center: property 
              ? [property.longitude || 35.8, property.latitude || -1.1]
              : [35.8, -1.1]
          });

          viewRef.current = view;
          await view.when();
          setMapLoaded(true);
          setError(null); // Clear error if fallback works
        } catch (fallbackError) {
          console.error('Fallback map also failed:', fallbackError);
          setMapLoaded(true); // Set to true so error message shows
        }
      }
    };

    if (mapRef.current) {
      initializeMap();
    }

    // Cleanup
    return () => {
      if (view) {
        view.destroy();
      }
    };
  }, [webmapId, property, properties, selectable, onLocationSelect]);

  if (error && !mapLoaded) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center p-4">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-2">{error}</p>
          <p className="text-xs text-gray-500">
            The map will still work with a default basemap. You can select locations normally.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className="w-full rounded-lg overflow-hidden border border-gray-200"
        style={{ height: `${height}px` }}
      />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      )}
      {selectable && selectedLocation && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold text-gray-900">Selected Location</p>
          <p className="text-gray-600">
            Lat: {selectedLocation.latitude.toFixed(6)}
          </p>
          <p className="text-gray-600">
            Lng: {selectedLocation.longitude.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertyMap;

