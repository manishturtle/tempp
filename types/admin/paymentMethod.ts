/**
 * Supported payment types
 */
export const PaymentMethodType = {
  ONLINE_GATEWAY: 'online_gateway',
  BANK_TRANSFER: 'bank_transfer',
  CASH_OFFLINE: 'cash_offline',
} as const;

export type PaymentMethodType = typeof PaymentMethodType[keyof typeof PaymentMethodType];

/**
 * Collection mechanisms for cash/offline payments
 */
export const CollectionMechanism = {
  LOGISTICS_PARTNER: 'logistics_partner',
  IN_STORE_POS: 'in_store_pos',
  DIRECT_BANK_DEPOSIT: 'direct_bank_deposit',
  CHEQUE_DD: 'cheque_dd',
  MANUAL_CAPTURE: 'manual_capture',
} as const;

export type CollectionMechanism = typeof CollectionMechanism[keyof typeof CollectionMechanism];

/**
 * Payment gateway details for online payment methods
 */
export interface GatewayDetails {
  id: number;
  gateway_name: string;
  merchant_id: string;
  supported_currencies: string;
  supported_currencies_list: string[];
  mdr_percentage: string;
  mdr_fixed_fee: number;
  settlement_bank_name: string;
  success_webhook_url: string;
  failure_webhook_url: string;
  refund_api_endpoint: string;
  supports_partial_refunds: boolean;
  is_active: boolean;
  client_id: number;
  company_id: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * Bank transfer details
 */
export interface BankTransferDetails {
  id: number;
  payment_method: number;
  beneficiary_bank_name: string;
  beneficiary_account_no: string;
  beneficiary_ifsc_code: string;
  beneficiary_account_holder_name: string;
  instructions_for_customer: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cash logistics partner details
 */
export interface CashLogisticsPartnerDetails {
  id: number;
  logistics_partner_name: string;
  merchant_id: string;
  api_key: string;
  cod_collection_limit: number;
  partner_settlement_cycle_days: number;
  settlement_bank_account: number | null;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * In-store POS details
 */
export interface CashPOSDetails {
  id: number;
  physical_location_id: string;
  pos_device_provider: string;
  terminal_id: string;
  merchant_id: string;
  api_key: string;
  supported_card_networks: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * Direct bank deposit details
 */
export interface CashDirectDepositDetails {
  id: number;
  customer_instructions: string;
  required_proof_details: string;
  beneficiary_bank_account: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * Cheque/DD payment details
 */
export interface CashChequeDDDetails {
  id: number;
  payee_name: string;
  collection_address: string;
  clearing_time_days: number;
  bounced_cheque_charges: number;
  deposit_bank_account: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
}

/**
 * Cash offline payment details
 */
export interface CashOfflineDetails {
  id: number;
  collection_mechanism: CollectionMechanism;
  collection_mechanism_display: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  logistics_partner_details?: CashLogisticsPartnerDetails;
  pos_details?: CashPOSDetails;
  direct_deposit_details?: CashDirectDepositDetails;
  cheque_dd_details?: CashChequeDDDetails;
}

/**
 * Payment method model
 */
export interface PaymentMethod {
  id: number;
  name: string;
  payment_type: PaymentMethodType;
  payment_type_display: string;
  is_active: boolean;
  is_visible_on_store: boolean;
  description: string;
  gateway_details: GatewayDetails | null;
  bank_transfer_details: BankTransferDetails | null;
  cash_offline_details: CashOfflineDetails | null;
  customer_group_selling_channels: number[];
  created_at: string;
  updated_at: string;
}

/**
 * Payment method statistics
 */
export interface PaymentTypeStats {
  display_name: string;
  total: number;
  active: number;
  inactive: number;
}

export interface PaymentMethodStatistics {
  total_count: number;
  active_count: number;
  inactive_count: number;
  payment_type_stats: {
    [key in PaymentMethodType]: PaymentTypeStats;
  };
}

/**
 * Paginated response for payment methods
 */
/**
 * Generic paginated response interface
 */
export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Paginated response for payment methods
 */
export type PaginatedPaymentMethodResponse = PaginatedResponse<PaymentMethod>;
