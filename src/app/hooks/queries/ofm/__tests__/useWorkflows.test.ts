import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetStepFieldDefinitions } from '../useWorkflows';
import { getStepFieldDefinitions } from '../../../../services/api/ofm/workflows';

// Mock the API client function
jest.mock('../../../../services/api/ofm/workflows', () => ({
  getStepFieldDefinitions: jest.fn(),
}));

const mockGetStepFieldDefinitions = getStepFieldDefinitions as jest.MockedFunction<typeof getStepFieldDefinitions>;

// Test data
const mockFieldDefinitions = [
  {
    id: 1,
    predefined_field_id: 101,
    default_label: 'Quantity',
    field_type: 'NUMBER',
    field_options: null,
    is_mandatory: true,
    is_hidden: false,
    sequence_order: 1,
  },
  {
    id: 2,
    custom_field_label: 'Custom Field',
    field_type: 'DROPDOWN',
    field_options: ['Option 1', 'Option 2'],
    is_mandatory: false,
    is_hidden: false,
    sequence_order: 2,
  },
];

// Create a wrapper with QueryClientProvider for testing hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useGetStepFieldDefinitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch data when stepVersionId is null or undefined', async () => {
    // Test with null
    const { result: resultNull } = renderHook(() => useGetStepFieldDefinitions(null), {
      wrapper: createWrapper(),
    });

    // Test with undefined
    const { result: resultUndefined } = renderHook(() => useGetStepFieldDefinitions(undefined), {
      wrapper: createWrapper(),
    });

    expect(mockGetStepFieldDefinitions).not.toHaveBeenCalled();
    expect(resultNull.current.isLoading).toBe(false);
    expect(resultUndefined.current.isLoading).toBe(false);
  });

  it('should fetch field definitions when stepVersionId is provided', async () => {
    const stepVersionId = '123';
    mockGetStepFieldDefinitions.mockResolvedValueOnce(mockFieldDefinitions);

    const { result } = renderHook(() => useGetStepFieldDefinitions(stepVersionId), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify API was called with correct parameters
    expect(mockGetStepFieldDefinitions).toHaveBeenCalledWith(stepVersionId);
    expect(mockGetStepFieldDefinitions).toHaveBeenCalledTimes(1);

    // Verify data is returned correctly
    expect(result.current.data).toEqual(mockFieldDefinitions);
  });

  it('should handle error state', async () => {
    const stepVersionId = '123';
    const error = new Error('Failed to fetch field definitions');
    mockGetStepFieldDefinitions.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useGetStepFieldDefinitions(stepVersionId), {
      wrapper: createWrapper(),
    });

    // Wait for the query to fail
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verify error is captured
    expect(result.current.error).toEqual(error);
  });
});
