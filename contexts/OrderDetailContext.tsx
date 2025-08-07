'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OrderDetailContextType {
  orderDetailId: string | null;
  setOrderDetailId: (id: string | null) => void;
}

const OrderDetailContext = createContext<OrderDetailContextType | undefined>(undefined);

// Local storage key for persisting order detail ID
const ORDER_DETAIL_ID_STORAGE_KEY = 'ecommerce_current_order_detail_id';

/**
 * Provider component for order detail state management
 * Persists order detail ID across page refreshes using localStorage
 * 
 * @param {object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
export function OrderDetailProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [orderDetailId, setOrderDetailIdState] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOrderDetailId = localStorage.getItem(ORDER_DETAIL_ID_STORAGE_KEY);
      if (savedOrderDetailId) {
        setOrderDetailIdState(savedOrderDetailId);
      }
    }
  }, []);

  // Update localStorage when orderDetailId changes
  const setOrderDetailId = (id: string | null) => {
    setOrderDetailIdState(id);
    
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(ORDER_DETAIL_ID_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(ORDER_DETAIL_ID_STORAGE_KEY);
      }
    }
  };

  const value = {
    orderDetailId,
    setOrderDetailId,
  };

  return (
    <OrderDetailContext.Provider value={value}>
      {children}
    </OrderDetailContext.Provider>
  );
}

/**
 * Hook to access order detail context
 * 
 * @returns {OrderDetailContextType} Order detail context
 * @throws {Error} If used outside of OrderDetailProvider
 */
export function useOrderDetailContext(): OrderDetailContextType {
  const context = useContext(OrderDetailContext);
  
  if (context === undefined) {
    throw new Error('useOrderDetailContext must be used within an OrderDetailProvider');
  }
  
  return context;
}
