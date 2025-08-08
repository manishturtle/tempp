import {
  useMutation,
  UseQueryResult,
  UseMutationResult,
  useQuery,
} from "@tanstack/react-query";
import api, { apiEndpoints, tenantApi } from "@/lib/api";
import {
  Account,
  Contact,
  OrderData,
  InvoiceData,
  SellingChannel,
  StaffUser,
} from "@/app/types/order";
import { Product } from "@/app/types/store/product";
import { getAuthHeaders } from "./auth";

/**
 * Function to fetch list of accounts for customer selection
 */
export const getAccountsList = async (): Promise<Account[]> => {
  const response = await api.get(apiEndpoints.lookupData.accounts(), {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Function to fetch contacts for a specific account
 */
export const getAccountContacts = async (
  accountId: number | null
): Promise<Contact[]> => {
  if (!accountId) return [];
  const response = await api.get(apiEndpoints.lookupData.contacts(accountId), {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Function to fetch active selling channels
 */
export const getSellingChannels = async (): Promise<SellingChannel[]> => {
  const response = await api.get(apiEndpoints.lookupData.sellingChannels(), {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Fetches a single order by ID
 * @param orderId - The ID of the order to fetch
 */
export const getOrder = async (orderId: string | null): Promise<OrderData> => {
  if (!orderId) {
    throw new Error("Order ID is required");
  }

  const response = await api.get(apiEndpoints.admin.orders.detail(orderId), {
    headers: getAuthHeaders(),
  });

  return response.data;
};

/**
 * Fetches a single invoice by ID
 * @param invoiceId - The ID of the invoice to fetch
 */
export const getInvoice = async (
  invoiceId: string | null
): Promise<InvoiceData> => {
  if (!invoiceId) {
    throw new Error("Invoice ID is required");
  }

  const response = await api.get(
    apiEndpoints.admin.invoices.detail(invoiceId),
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};
/**
 * Hook to create a new order
 */
export const useCreateOrder = (): UseMutationResult<
  OrderData,
  unknown,
  OrderData,
  unknown
> => {
  return useMutation({
    mutationFn: async (orderData: OrderData) => {
      const response = await api.post(
        apiEndpoints.admin.orders.create(),
        orderData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
  });
};

/**
 * Hook to create a new invoice
 */
export const useCreateInvoice = (): UseMutationResult<
  InvoiceData,
  unknown,
  InvoiceData,
  unknown
> => {
  return useMutation({
    mutationFn: async (invoiceData: InvoiceData) => {
      const response = await api.post(
        apiEndpoints.admin.invoices.create(),
        invoiceData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
  });
};

/**
 * Hook to fetch all products filtered by customer group and selling channel
 * @param customerGroupId - The ID of the customer group
 * @param sellingChannelId - The ID of the selling channel
 */
export const getAllProducts = async (
  customerGroupId?: number | null,
  sellingChannelId?: number | null
): Promise<Product[]> => {
  if (!customerGroupId || !sellingChannelId) {
    return [];
  }

  const response = await api.get(apiEndpoints.products.list(), {
    params: {
      all_records: true,
      customer_group_id: customerGroupId,
      selling_channel_id: sellingChannelId,
    },
    headers: getAuthHeaders(),
  });

  return response.data;
};

/**
 * Hook to fetch all store pickup locations filtered by customer group and selling channel
 * @param customerGroupId - The ID of the customer group
 * @param sellingChannelId - The ID of the selling channel
 */
export const getAllStorePickups = async (
  customerGroupId?: number | null,
  sellingChannelId?: number | null
): Promise<any[]> => {
  if (!customerGroupId || !sellingChannelId) {
    return [];
  }

  const response = await api.get(apiEndpoints.storePickup.list, {
    params: {
      paginate: false,
      customer_group_id: customerGroupId,
      selling_channel_id: sellingChannelId,
    },
    headers: getAuthHeaders(),
  });

  return response.data.results || [];
};


/**
 * Fetch all divisions without pagination
 */
export const getAllDivisions = async () => {
  const response = await api.get(apiEndpoints.catalogue.divisions.list, {
    params: {
      paginate: false,
    },
    headers: getAuthHeaders(),
  });

  return response.data;
};

/**
 * Fetch all categories without pagination
 */
export const getAllCategories = async () => {
  const response = await api.get(apiEndpoints.catalogue.categories.list(), {
    params: {
      paginate: false,
    },
    headers: getAuthHeaders(),
  });

  return response.data;
};

/**
 * Fetch all subcategories without pagination
 */
export const getAllSubcategories = async () => {
  const response = await api.get(apiEndpoints.catalogue.subcategories.list, {
    params: {
      paginate: false,
    },
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const useUpdateOrder = (
  orderId: string
): UseMutationResult<OrderData, unknown, OrderData, unknown> => {
  return useMutation({
    mutationFn: async (orderData: OrderData) => {
      const response = await api.patch(
        apiEndpoints.admin.orders.update(orderId),
        orderData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
  });
};

/**
 * Hook to create a new invoice
 */
export const useUpdateInvoice = (
  invoiceId: string
): UseMutationResult<InvoiceData, unknown, InvoiceData, unknown> => {
  return useMutation({
    mutationFn: async (invoiceData: InvoiceData) => {
      const response = await api.patch(
        apiEndpoints.admin.invoices.update(invoiceId),
        invoiceData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
  });
};

/**
 * Hook to create a new address
 */
export const useCreateAddress = (): UseMutationResult<
  any,
  unknown,
  any,
  unknown
> => {
  return useMutation({
    mutationFn: async (addressData: any) => {
      // Ensure address data includes account ID when creating an address
      // The account ID should be passed in the payload from the component
      // addressData should already have account: orderData.customerDetails.account_id
      const response = await api.post(
        apiEndpoints.addresses.create(),
        addressData,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
  });
};

/**
 * Hook to update an existing address
 */
export const useUpdateAddress = (): UseMutationResult<
  any,
  unknown,
  { id: number; data: any },
  unknown
> => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      // Ensure address data includes account ID when updating an address
      // The account ID should be passed in the data payload from the component
      // data should already have account: orderData.customerDetails.account_id
      const response = await api.put(apiEndpoints.addresses.update(id), data, {
        headers: getAuthHeaders(),
      });
      return response.data;
    },
  });
};

/**
 * Hook to fetch all tax rates without pagination
 */
export const useAllTaxRates = (): UseQueryResult<any[], unknown> => {
  return useQuery({
    queryKey: ["taxRates", "all"],
    queryFn: async () => {
      const response = await api.get(
        `${apiEndpoints.pricing.taxRates.list}?paginate=false`,
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data.results;
    },
  });
};

/**
 * Hook to fetch tax rate profile by ID
 */
export const useTaxRateProfile = (
  profileId: number | null
): UseQueryResult<any, unknown> => {
  return useQuery({
    queryKey: ["taxRateProfile", profileId],
    queryFn: async () => {
      if (!profileId) throw new Error("Profile ID is required");
      const response = await api.get(
        apiEndpoints.pricing.taxRateProfiles.detail(profileId),
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    },
    enabled: !!profileId,
  });
};

/**
 * Function to fetch staff users for responsible person selection
 * Returns current_user and users array
 */
export const getStaffUsers = async (): Promise<{
  current_user: StaffUser;
  users: StaffUser[];
}> => {
  const response = await api.get(apiEndpoints.lookupData.staffUsers(), {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Function to fetch unpaid invoices amount for a specific account
 * @param accountId - The ID of the account to get unpaid invoices for
 * @returns Object containing unpaid_amount, unpaid_invoice_count, and account_id
 */
export const getUnpaidInvoices = async (
  accountId: number
): Promise<{
  unpaid_amount: number;
  unpaid_invoices: any[];
}> => {
  if (!accountId) {
    throw new Error("Account ID is required");
  }

  const response = await api.get(
    apiEndpoints.admin.invoices.getUnpaidInvoices(),
    {
      params: { account_id: accountId },
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

export const getSegment = async (
  customer_group_id: number,
  selling_channel_id: number
): Promise<any> => {
  if (!customer_group_id || !selling_channel_id) {
    throw new Error("Customer group ID and selling channel ID are required");
  }

  const response = await api.get(apiEndpoints.admin.invoices.getSegment(), {
    params: { customer_group_id, selling_channel_id },
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const getInvoiceConfigs = async (
  type: string,
  name: string,
  segment_id: number
): Promise<any> => {
  if (!type || !name || !segment_id) {
    throw new Error("Type, name, and segment ID are required");
  }

  const response = await tenantApi.get(
    apiEndpoints.admin.invoices.getInvoiceConfigs(),
    {
      params: { type, name, segment_id },
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};
