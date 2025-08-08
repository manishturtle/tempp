import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

const getCustomerDetails = async (customerId: string): Promise<CustomerDetails> => {
  try {
    // In a real implementation, this would call an API endpoint
    // For now, we'll return mock data
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: customerId,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      shippingAddress: {
        line1: '123 Shipping Street',
        line2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States'
      },
      billingAddress: {
        line1: '123 Billing Street',
        line2: 'Suite 100',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States'
      }
    };
  } catch (error) {
    // Error handling with enhanced context
    const enhancedError = error as Error;
    enhancedError.message = `Failed to fetch customer details: ${enhancedError.message}`;
    throw enhancedError;
  }
};

const useGetCustomerDetails = (customerId: string | undefined) => {
  return useQuery<CustomerDetails, Error>({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerDetails(customerId!),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export default useGetCustomerDetails;
