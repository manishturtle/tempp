"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { Product } from "@/app/types/store/product-listing";
import { useStoreConfig } from "@/app/[tenant]/store/layout";
import {
  Card1,
  Card2,
  Card3,
  MobileCard1,
} from "@/app/components/Store/product-cards";

interface ProductCardProps {
  product: Product;
  onAddToCart?: () => void;
  onAddToWishlist?: () => void;
  isInWishlist?: boolean;
}

/**
 * ProductCard component displays a single product in the product listing page
 * It dynamically renders the appropriate card style based on configuration
 *
 * @param {ProductCardProps} props - Component props
 * @returns {React.ReactElement} The product card component
 */
export const ProductCard = ({
  product,
  onAddToCart,
  onAddToWishlist,
  isInWishlist = false,
}: ProductCardProps): React.ReactElement => {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = (params?.tenant as string) || "";
  const isMobile = useMediaQuery("(max-width:600px)");

  // Get store configuration from context - includes productCardStyle
  const storeConfig = useStoreConfig();

  // Map stock status from API to component props (normalize case)
  const mapStockStatus = (
    status: string
  ): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" => {
    const normalizedStatus = status.toLowerCase();
    const statusMap: Record<string, "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"> =
      {
        in_stock: "IN_STOCK",
        low_stock: "LOW_STOCK",
        out_of_stock: "OUT_OF_STOCK",
      };
    return statusMap[normalizedStatus] || "IN_STOCK";
  };

  const normalizedStockStatus = product.stock_status.toLowerCase();
  const isOutOfStock = normalizedStockStatus === "out_of_stock";
  const isLowStock = normalizedStockStatus === "low_stock";

  const handleAddToCart = (): void => {
    // Call the onAddToCart prop if provided, otherwise use the stub
    if (onAddToCart) {
      onAddToCart();
    } else {
      // Stub for add to cart functionality
      console.log(`Adding product ${product.sku} to cart`);
    }
  };

  // State for image carousel
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [productImages, setProductImages] = useState<string[]>([]);

  // Initialize product images
  useEffect(() => {
    const images: string[] = [];

    // If we have images array with items
    if (product.images && product.images.length > 0) {
      // Sort images by sort_order if available
      const sortedImages = [...product.images].sort((a, b) => {
        // Default image first, then by sort_order
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return a.sort_order - b.sort_order;
      });

      // Add all valid images to the array
      sortedImages.forEach((img) => {
        if (img.image) {
          images.push(img.image);
        }
      });
    }

    // If no images from the array, use a placeholder
    // (image_url property doesn't exist in current Product interface)
    if (images.length === 0) {
      // Add a default placeholder image
      images.push("");
    }

    // If still no images, use default placeholder
    if (images.length === 0) {
      images.push("");
    }

    setProductImages(images);
  }, [product]);

  // Get current image
  const currentImage = productImages[currentImageIndex] || "";

  // Handle image navigation
  const handlePrevImage = (e: React.MouseEvent): void => {
    e.stopPropagation(); // Prevent card click
    setCurrentImageIndex((prev) =>
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e: React.MouseEvent): void => {
    e.stopPropagation(); // Prevent card click
    setCurrentImageIndex((prev) =>
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };

  // Render different card components based on configuration
  const renderCardByStyle = () => {
    // On mobile devices, use the MobileCard1 component regardless of the style setting
    if (isMobile) {
      return (
        <MobileCard1
          image={currentImage}
          title={product.name}
          price={product.price?.min || 0}
          currencySymbol="₹"
          description={product.short_description || "No details available"}
          isInWishlist={isInWishlist && storeConfig.feature_toggle_settings.wishlist_enabled}
          onAddToCart={!isOutOfStock ? handleAddToCart : undefined}
          onToggleWishlist={
            storeConfig.feature_toggle_settings.wishlist_enabled ? onAddToWishlist : undefined
          }
          stockStatus={mapStockStatus(product.stock_status)}
        />
      );
    }
    switch (storeConfig.ui_template_settings.product_card_style.toLowerCase()) {
      case "card2":
        return (
          <Card2
            image={currentImage}
            price={product.price?.min || 0}
            title={product.name}
            currencySymbol="₹"
            description={product.short_description || "No details available"}
            isInWishlist={isInWishlist && storeConfig.feature_toggle_settings.wishlist_enabled}
            onAddToCart={!isOutOfStock ? handleAddToCart : undefined}
            onToggleWishlist={
              storeConfig.feature_toggle_settings.wishlist_enabled ? onAddToWishlist : undefined
            }
            stockStatus={mapStockStatus(product.stock_status)}
          />
        );
      case "card3":
        return (
          <Card3
            image={currentImage}
            title={product.name}
            price={product.price?.min || 0}
            currencySymbol="₹"
            keyFeatures={product.key_features || "No details available"}
            isInWishlist={isInWishlist && storeConfig.feature_toggle_settings.wishlist_enabled}
            onAddToCart={!isOutOfStock ? handleAddToCart : undefined}
            onToggleWishlist={
              storeConfig.feature_toggle_settings.wishlist_enabled ? onAddToWishlist : undefined
            }
            stockStatus={mapStockStatus(product.stock_status)}
          />
        );
      case "card1":
      default:
        return (
          <Card1
            image={currentImage}
            title={product.name}
            price={product.price?.min || 0}
            currencySymbol="₹"
            isInWishlist={isInWishlist && storeConfig.feature_toggle_settings.wishlist_enabled}
            onAddToCart={!isOutOfStock ? handleAddToCart : undefined}
            onToggleWishlist={
              storeConfig.feature_toggle_settings.wishlist_enabled ? onAddToWishlist : undefined
            }
            stockStatus={mapStockStatus(product.stock_status)}
          />
        );
    }
  };

  // Default card rendering with click navigation
  return (
    <Box
      onClick={() => router.push(`/${tenantSlug}/store/product/${product.sku}`)}
      sx={{
        cursor: "pointer",
        width: "100%",
        height: "100%",
      }}
    >
      {renderCardByStyle()}
    </Box>
  );
};
