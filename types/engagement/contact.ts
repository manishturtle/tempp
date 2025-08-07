export interface Contact {
  id: number;
  email_address: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  source?: string;
  is_email_subscribed: boolean;
  is_sms_subscribed: boolean;
  created_at: string;
  updated_at?: string;
}
