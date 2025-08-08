
'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import { Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { getGeocode, getLatLng } from 'use-places-autocomplete';

// --- TypeScript Interfaces ---
interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  center: LatLngLiteral | null;
  onLocationSelect: (place: any) => void;
  shapeType?: 'circle' | 'polygon';
  radius?: number;
}

// --- Reusable Shape Components ---
const Circle = React.memo(function Circle({ center, radius, options }: { center: LatLngLiteral; radius: number; options?: google.maps.CircleOptions }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({ map, center, radius, ...options });
    return () => circle.setMap(null);
  }, [map, center, radius, options]);
  return null;
});

const Polygon = React.memo(function Polygon({ paths, options }: { paths: LatLngLiteral[]; options?: google.maps.PolygonOptions }) {
    const map = useMap();
    useEffect(() => {
      if (!map) return;
      const polygon = new google.maps.Polygon({ map, paths, ...options });
      return () => polygon.setMap(null);
    }, [map, paths, options]);
    return null;
});

// --- Main Display Component ---
const LocationPicker: React.FC<LocationPickerProps> = ({ center, onLocationSelect, shapeType, radius = 200 }) => {
  
    const circleOptions = useMemo(() => ({
    fillColor: '#2196F3', 
    fillOpacity: 0.3, 
    strokeColor: '#2196F3',
    strokeOpacity: 0.8, 
    strokeWeight: 2, 
    clickable: false,
  }), []);

  const polygonPaths = useMemo(() => {
    if (shapeType !== 'polygon' || !center) return [];
    const paths: LatLngLiteral[] = [];
    const numPoints = 6;
    for (let i = 0; i < numPoints; i++) {
        const angle = (2 * Math.PI * i) / numPoints;
        const latOffset = (radius / 111132) * Math.sin(angle);
        const lngOffset = (radius / (111320 * Math.cos(center.lat * (Math.PI / 180)))) * Math.cos(angle);
        paths.push({ lat: center.lat + latOffset, lng: center.lng + lngOffset });
    }
    return paths;
  }, [center, radius, shapeType]);

  return (
    <Map
      center={center || { lat: 18.5204, lng: 73.8567 }} // Default to Pune if center is null
      zoom={15}
      gestureHandling={'greedy'}
      scrollwheel={true}
      onClick={async (e) => {
        const latLng = e.detail?.latLng;
        if (!latLng) return;
        
        try {
          // First create a basic place with coordinates
          const place = {
            geometry: { 
              location: { 
                lat: () => latLng.lat, 
                lng: () => latLng.lng 
              } 
            },
            name: 'Selected Location',
            formatted_address: `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`,
          };
          
          // Try to get human-readable address
          try {
            const results = await getGeocode({
              location: { lat: latLng.lat, lng: latLng.lng }
            });
            
            if (results[0]) {
              place.formatted_address = results[0].formatted_address;
              // Extract city and country if available
              const addressComponents = results[0].address_components;
              const city = addressComponents.find(comp => 
                comp.types.includes('locality') || 
                comp.types.includes('administrative_area_level_2')
              )?.long_name;
              
              const country = addressComponents.find(comp => 
                comp.types.includes('country')
              )?.long_name;
              
              if (city || country) {
                place.name = [city, country].filter(Boolean).join(', ');
              } else {
                place.name = place.formatted_address.split(',').slice(0, 2).join(',');
              }
            }
          } catch (geocodeError) {
            console.error('Reverse geocoding failed:', geocodeError);
            // Keep the coordinates as fallback
          }
          
          onLocationSelect(place);
          
        } catch (error) {
          console.error('Error handling map click:', error);
        }
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {center && <Marker position={center} />}
      {center && shapeType === 'circle' && <Circle center={center} radius={radius} options={circleOptions} />}
      {center && shapeType === 'polygon' && <Polygon paths={polygonPaths} options={{...circleOptions, fillColor: '#FF5722', strokeColor: '#FF5722'}} />}
    </Map>
  );
};

export default LocationPicker;