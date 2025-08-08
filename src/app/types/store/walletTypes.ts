/**
 * Wallet related type definitions
 */

/**
 * Types of wallet transactions
 */
export type WalletTransactionType = 'recharge' | 'order_payment' | 'refund' | 'bonus' | 'adjustment' | string; // Allow for custom types

/**
 * Wallet transaction interface
 */
export interface WalletTransaction {
  /**
   * Unique identifier for the transaction
   */
  id: string;
  
  /**
   * Formatted date/time string, e.g., "May 2, 2025 - 14:32"
   */
  date: string;
  
  /**
   * Type of transaction
   */
  type: WalletTransactionType;
  
  /**
   * i18n key for the transaction type chip, e.g., 'wallet.transactionTypes.recharge'
   */
  typeTextKey: string;
  
  /**
   * Transaction details, e.g., "Wallet recharge via Credit Card"
   */
  details: string;
  
  /**
   * Additional notes if any
   */
  notes?: string;
  
  /**
   * Related entity information (order, RMA, etc.)
   */
  relatedEntity?: {
    /**
     * Entity ID, e.g., Order ID, RMA ID
     */
    id: string;
    
    /**
     * Type of entity
     */
    type: 'order' | 'rma';
    
    /**
     * Display text for the entity, e.g., "Order #ORD-7829"
     */
    displayText: string;
    
    /**
     * Link to the entity detail page
     */
    url: string;
  };
  
  /**
   * Formatted amount string, e.g., "+$500.00" or "-$125.49"
   */
  amountFormatted: string;
  
  /**
   * Whether the transaction is a credit (true) or debit (false)
   */
  isCredit: boolean;
}
