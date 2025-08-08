'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProductImage } from '@/app/components/admin/products/forms/VariantForm.schema';

// Define the context type
interface ImageContextType {
  // Images for different entities
  productImages: Record<number, ProductImage[]>;
  variantImages: Record<number, ProductImage[]>;
  
  // Methods to update images
  setProductImages: (productId: number, images: ProductImage[]) => void;
  setVariantImages: (variantId: number, images: ProductImage[]) => void;
  
  // Methods to get images
  getProductImages: (productId: number) => ProductImage[];
  getVariantImages: (variantId: number) => ProductImage[];
  
  // Current context
  currentEntityType: 'product' | 'variant';
  currentEntityId: number;
  setCurrentEntity: (type: 'product' | 'variant', id: number) => void;
}

// Create the context with default values
const ImageContext = createContext<ImageContextType>({
  productImages: {},
  variantImages: {},
  setProductImages: () => {},
  setVariantImages: () => {},
  getProductImages: () => [],
  getVariantImages: () => [],
  currentEntityType: 'product',
  currentEntityId: -1,
  setCurrentEntity: () => {},
});

// Provider component
export const ImageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [productImages, setProductImagesState] = useState<Record<number, ProductImage[]>>({});
  const [variantImages, setVariantImagesState] = useState<Record<number, ProductImage[]>>({});
  const [currentEntityType, setCurrentEntityType] = useState<'product' | 'variant'>('product');
  const [currentEntityId, setCurrentEntityId] = useState<number>(-1);

  // Set product images
  const setProductImages = (productId: number, images: ProductImage[]) => {
    setProductImagesState(prev => ({
      ...prev,
      [productId]: images
    }));
  };

  // Set variant images
  const setVariantImages = (variantId: number, images: ProductImage[]) => {
    // Ensure we have a valid variant ID
    if (variantId <= 0) return;
    
    console.log(`ImageContext: Setting variant images for ID ${variantId}`);
    console.log('Current images in context:', variantImages[variantId] || []);
    console.log('New images to add:', images);
    
    // Check if these are new images to add or a complete replacement
    const isAddingNewImages = images.some(img => 
      !(variantImages[variantId] || []).some(existingImg => existingImg.id === img.id)
    );
    
    // Update the variant images state
    setVariantImagesState(prev => {
      // If we're adding new images and already have existing ones, merge them
      if (isAddingNewImages && prev[variantId] && prev[variantId].length > 0) {
        console.log('Adding new images to existing ones');
        const updatedState = {
          ...prev,
          [variantId]: [...prev[variantId], ...images] // Append new images to existing ones
        };
        console.log('Updated state:', updatedState[variantId]);
        return updatedState;
      } else {
        // Otherwise, replace the images (for initial load or explicit replacement)
        console.log('Replacing all images');
        const updatedState = {
          ...prev,
          [variantId]: [...images] // Create a new array reference to ensure state updates
        };
        console.log('Updated state:', updatedState[variantId]);
        return updatedState;
      }
    });
  };

  // Get product images
  const getProductImages = (productId: number): ProductImage[] => {
    return productImages[productId] || [];
  };

  // Get variant images
  const getVariantImages = (variantId: number): ProductImage[] => {
    // Return a copy of the images array to avoid reference issues
    return [...(variantImages[variantId] || [])];
  };

  // Set current entity
  const setCurrentEntity = (type: 'product' | 'variant', id: number) => {
    setCurrentEntityType(type);
    setCurrentEntityId(id);
  };

  return (
    <ImageContext.Provider
      value={{
        productImages,
        variantImages,
        setProductImages,
        setVariantImages,
        getProductImages,
        getVariantImages,
        currentEntityType,
        currentEntityId,
        setCurrentEntity,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};

// Custom hook to use the image context
export const useImageContext = () => useContext(ImageContext);
