'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OrderContextType {
  orderId: string | null;
  setOrderId: (id: string | null) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Local storage key for persisting order ID
const ORDER_ID_STORAGE_KEY = 'ecommerce_current_order_id';

/**
 * Provider component for order-related state management
 * Persists order ID across page refreshes using localStorage
 * 
 * @param {object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
export function OrderProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [orderId, setOrderIdState] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOrderId = localStorage.getItem(ORDER_ID_STORAGE_KEY);
      if (savedOrderId) {
        setOrderIdState(savedOrderId);
      }
    }
  }, []);

  // Update localStorage when orderId changes
  const setOrderId = (id: string | null) => {
    setOrderIdState(id);
    
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(ORDER_ID_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(ORDER_ID_STORAGE_KEY);
      }
    }
  };

  const value = {
    orderId,
    setOrderId,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

/**
 * Hook to access order context
 * 
 * @returns {OrderContextType} Order context
 * @throws {Error} If used outside of OrderProvider
 */
export function useOrderContext(): OrderContextType {
  const context = useContext(OrderContext);
  
  if (context === undefined) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }
  
  return context;
}
