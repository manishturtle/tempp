'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Marker, useMap } from '@vis.gl/react-google-maps';

// Reusable Circle component from your original code
const Circle = React.memo(function Circle({ center, radius, options }: any) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({ map, center, radius, ...options });
    return () => circle.setMap(null);
  }, [map, center, radius, options]);
  return null;
});

interface MapDisplayProps {
  selectedPlace: google.maps.places.PlaceResult | null;
  shapeType: 'circle' | 'polygon';
  radiusInMeters: number;
}

export const MapDisplay: React.FC<MapDisplayProps> = ({
  selectedPlace,
  shapeType,
  radiusInMeters,
}) => {
  const map = useMap();
  const styledLayers = useRef<google.maps.FeatureLayer[]>([]);

  const center = useMemo(() => {
    return selectedPlace?.geometry?.location?.toJSON();
  }, [selectedPlace]);

  useEffect(() => {
    if (!map || !google.maps.FeatureLayer) return;

    // 1. Reset styles on any previously highlighted boundaries
    styledLayers.current.forEach(layer => {
      layer.style = null;
    });
    styledLayers.current = [];

    // 2. If no place is selected, or we want a circle, do nothing with boundaries
    if (!selectedPlace || !selectedPlace.place_id || shapeType === 'circle') {
      return;
    }

    // 3. Find the correct Feature Layer type (e.g., 'LOCALITY' for a city)
    const placeFeatureType = ['LOCALITY', 'ADMINISTRATIVE_AREA_LEVEL_2', 'ADMINISTRATIVE_AREA_LEVEL_1', 'COUNTRY']
      .find(type => selectedPlace.types?.includes(type.toLowerCase()));

    if (!placeFeatureType) {
      console.warn("This location doesn't have a boundary that can be drawn.");
      return;
    }

    // 4. Get the layer and apply the style
    const featureLayer = map.getFeatureLayer(placeFeatureType as google.maps.FeatureType);
    featureLayer.style = (params: google.maps.FeatureStyleFunctionParameters) => {
      if (params.feature.placeId === selectedPlace.place_id) {
        return {
          fillColor: '#FF5722',
          fillOpacity: 0.3,
          strokeColor: '#FF5722',
          strokeWeight: 2,
        };
      }
    };
    styledLayers.current.push(featureLayer);

    // 5. Zoom the map to fit the place's viewport
    if (selectedPlace.geometry?.viewport) {
      map.fitBounds(selectedPlace.geometry.viewport);
    }

  }, [map, selectedPlace, shapeType]);

  const circleOptions = useMemo(() => ({
    fillColor: '#2196F3',
    fillOpacity: 0.3,
    strokeColor: '#2196F3',
    strokeWeight: 2,
  }), []);

  // Your old polygon logic for when a boundary isn't available or desired
  const polygonPaths = useMemo(() => {
    if (shapeType !== 'polygon' || !center) return [];
    // This creates a hexagon, not a real boundary. We keep it as a fallback.
    const paths = [];
    for (let i = 0; i < 6; i++) {
        const angle = (2 * Math.PI * i) / 6;
        const latOffset = (radiusInMeters / 111132) * Math.sin(angle);
        const lngOffset = (radiusInMeters / (111320 * Math.cos(center.lat * (Math.PI / 180)))) * Math.cos(angle);
        paths.push({ lat: center.lat + latOffset, lng: center.lng + lngOffset });
    }
    return paths;
  }, [center, radiusInMeters, shapeType]);


  if (!center) return null;

  return (
    <>
      <Marker position={center} />
      {shapeType === 'circle' && (
        <Circle center={center} radius={radiusInMeters} options={circleOptions} />
      )}
      {/* Note: The real boundary is now drawn by the map engine itself, not a <Polygon> component */}
    </>
  );
};