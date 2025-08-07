import { useQuery } from '@tanstack/react-query';
import api, { apiEndpoints } from '@/lib/api';
import { AdminInvoice, AdminInvoicesPaginated } from '@/app/types/admin/invoices';
import { getAuthHeaders } from '@/app/hooks/api/auth';

const fetchInvoices = async (): Promise<AdminInvoicesPaginated> => {
  const headers = await getAuthHeaders();
  const { data } = await api.get(apiEndpoints.admin.invoices.list(), { headers });
  return data;
};

const fetchInvoiceById = async (id: string): Promise<AdminInvoice> => {
  const headers = await getAuthHeaders();
  const { data } = await api.get(apiEndpoints.admin.invoices.detail(id), { headers });
  return data;
};

/**
 * Hook for fetching and managing a list of admin invoices
 */
export const useAdminInvoices = () => {
  const { data: invoicesData, isLoading: isLoadingInvoices, error: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ['adminInvoices'],
    queryFn: fetchInvoices,
  });

  return {
    invoices: invoicesData?.results || [],
    pagination: invoicesData ? {
      totalCount: invoicesData.count,
      totalPages: invoicesData.total_pages,
      currentPage: invoicesData.current_page,
      pageSize: invoicesData.page_size,
      hasNextPage: Boolean(invoicesData.next),
      hasPreviousPage: Boolean(invoicesData.previous),
    } : undefined,
    isLoadingInvoices,
    invoicesError,
    refetchInvoices,
  };
};

/**
 * Hook for fetching a single admin invoice by ID
 * @param id - The ID of the invoice to fetch
 * @returns The invoice data, loading state, and error state
 */
export const useAdminInvoice = (id: string) => {
  return useQuery({
    queryKey: ['adminInvoice', id],
    queryFn: () => fetchInvoiceById(id),
    enabled: Boolean(id), // Only run the query if an ID is provided
  });
};

export default useAdminInvoices;
