/**
 * Loyalty program types for the eCommerce application
 */

/**
 * Type of loyalty transaction (earned, redeemed, etc.)
 */
export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'expired' | 'adjustment' | string;

/**
 * Interface representing a single loyalty transaction
 */
export interface LoyaltyTransaction {
  /**
   * Unique identifier for the transaction
   */
  id: string;

  /**
   * Formatted date/time string
   */
  date: string;

  /**
   * Type of transaction (earned, redeemed, etc.)
   */
  type: LoyaltyTransactionType;

  /**
   * i18n key for chip label
   */
  typeTextKey: string;

  /**
   * Transaction details (e.g., "Order #ORD-2025-1142")
   */
  details: string;

  /**
   * Link to the related order detail page (optional)
   */
  relatedOrderUrl?: string;

  /**
   * Formatted points change (e.g., "+750" or "-1,500")
   */
  pointsChangeFormatted: string;

  /**
   * Whether this transaction is a credit (points added)
   */
  isCredit: boolean;

  /**
   * Formatted expiry date (only for 'earned' type typically)
   */
  expiryDate?: string;
}
