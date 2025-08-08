import {
  useMutation,
  UseQueryResult,
  UseMutationResult,
  useQuery,
} from "@tanstack/react-query";
import api, { apiEndpoints, tenantApi } from "@/lib/api";
import { getAuthHeaders } from "./auth";

export const getAllPaymentMethods = async (): Promise<any[]> => {
  const response = await api.get(apiEndpoints.lookupData.paymentMethods(), {
    headers: getAuthHeaders(),
  });

  return response.data || [];
};

/**
 * Get all receipts
 */
export const getAllReceipts = async (): Promise<any[]> => {
  const response = await api.get(apiEndpoints.admin.receipts.list(), {
    headers: getAuthHeaders(),
  });
  return response.data.results || [];
};

/**
 * Get receipt by ID
 */
export const getReceiptById = async (id: number): Promise<any> => {
  const response = await api.get(apiEndpoints.admin.receipts.detail(id), {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Create a new receipt
 */
export const createReceipt = async (receiptData: any): Promise<any> => {
  const response = await api.post(
    apiEndpoints.admin.receipts.create(),
    receiptData,
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
};

/**
 * Update an existing receipt
 */
export const updateReceipt = async (receiptId: number, receiptData: any): Promise<any> => {
  const response = await api.post(
    apiEndpoints.admin.receipts.correct(receiptId),
    receiptData,
    {
      headers: getAuthHeaders(),
    }
  );
  return response.data;
};

/**
 * Hook to create a receipt using react-query mutation
 */
export const useCreateReceipt = (): UseMutationResult<any, Error, any> => {
  return useMutation({
    mutationFn: createReceipt,
  });
};

/**
 * Hook to update a receipt using react-query mutation
 */
export const useUpdateReceipt = (): UseMutationResult<any, Error, { id: number; data: any }> => {
  return useMutation({
    mutationFn: ({ id, data }) => updateReceipt(id, data),
  });
};

/**
 * Hook to get all receipts using react-query
 */
export const useGetReceipts = (): UseQueryResult<any[], Error> => {
  return useQuery({
    queryKey: ['receipts'],
    queryFn: getAllReceipts,
  });
};