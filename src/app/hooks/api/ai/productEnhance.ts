import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { AI_BASE_URL, AI_ENDPOINTS, AI_CONFIG } from '@/app/constant';
import { Secret, Token } from 'fernet';

export interface ProductEnhancementPayload {
  name: string;
  incoming_url: string;
  webhook_context: string;
  allowed_ips: string[];
  prompt_config: {
    type: 'create_auto' | 'create_manual' | 'use_existing';
  };
  input_data: {
      product_name: string;
      category?: string;
      division?: string;
      sub_category?: string;
    enhancement_type: 'seo' | 'marketing' | 'technical' | 'all';
    target_audience?: string;
    language?: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: {
    product_description: string;
    short_summary: string;
    key_features: string[];
    seo_meta_title: string;
    seo_meta_description: string;
  };
  error?: string;
  message?: string;
}

interface WebhookResponse {
  webhook: {
    id: number;
    name: string;
    incoming_url: string;
    webhook_context: string;
    created_at: string;
    is_active: boolean;
    prompt_variant: any;
  };
  response: {
    type: string;
    content: {
      product_description: string;
      short_summary: string;
      key_features: string[];
      seo_meta_title: string;
      seo_meta_description: string;
    };
  };
}

const encryptPayload = async (payload: object): Promise<string> => {
  try {
    // Create a secret from the encryption key
    const secret = new Secret(AI_CONFIG.ENCRYPTION_KEY);
    
    // Create a token with the secret
    const iv = Array.from(window.crypto.getRandomValues(new Uint8Array(16)));
    const token = new Token({
      secret,
      time: Math.floor(Date.now() / 1000), // Current time in seconds
      iv
    });
    console.log("Encrypted payload:", payload);

    // Encode the payload
    return token.encode(JSON.stringify(payload));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt payload');
  }
};

export const useProductEnhancement = (
  options?: UseMutationOptions<ApiResponse, AxiosError, ProductEnhancementPayload>
) => {
  const mutation = useMutation<ApiResponse, AxiosError, ProductEnhancementPayload>({
    mutationFn: async (payload) => {
      try {
        // Encrypt the payload
        const encryptedPayload = await encryptPayload(payload);
        
        // Make the API call using the existing webhook management endpoint
        const response = await axios.post<WebhookResponse>(
          `${AI_BASE_URL}${AI_ENDPOINTS.WEBHOOK_MANAGEMENT}`,
          { encrypted_payload: encryptedPayload },
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Key': AI_CONFIG.ACCESS_KEY,
            },
          }
        );

        // Transform the response to match our expected format
        if (response.data?.response?.content) {
          return {
            success: true,
            data: {
              product_description: response.data.response.content.product_description,
              short_summary: response.data.response.content.short_summary,
              key_features: response.data.response.content.key_features,
              seo_meta_title: response.data.response.content.seo_meta_title,
              seo_meta_description: response.data.response.content.seo_meta_description,
            },
          };
        }
        
        throw new Error('Invalid response format from AI service');
      } catch (error) {
        console.error('AI Enhancement API error:', error);
        throw error; // Re-throw the error to be handled by the caller
      }
    },
    ...(options || {}),
  });

  return {
    ...mutation,
    isEnhancing: mutation.isPending,
  };
};
