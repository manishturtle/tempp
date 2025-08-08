import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OrderFilterTabs from './OrderFilterTabs';
import useGetFulfillmentFilterOptions from '@/hooks/api/useGetFulfillmentFilterOptions';

// Mock the hook
jest.mock('@/hooks/api/useGetFulfillmentFilterOptions');
const mockUseGetFulfillmentFilterOptions = useGetFulfillmentFilterOptions as jest.MockedFunction<typeof useGetFulfillmentFilterOptions>;

// Mock the translation function
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'ofm:orders.filters.allStatuses') return 'All';
      if (key === 'ofm:orders.filters.statusFilterAriaLabel') return 'Filter by status';
      if (key.startsWith('ofm:status.')) {
        const status = key.replace('ofm:status.', '');
        const count = options?.count || 0;
        return `${status} (${count})`;
      }
      if (key === 'ofm:common.errors.loadingFiltersFailed') return 'Failed to load filters';
      return key;
    },
  }),
}));

describe('OrderFilterTabs', () => {
  const mockOnStatusChange = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when data is loading', () => {
    mockUseGetFulfillmentFilterOptions.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
    } as any);

    render(
      <OrderFilterTabs 
        currentStatusFilter={null} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state when there is an error', () => {
    mockUseGetFulfillmentFilterOptions.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
      isError: true,
    } as any);

    render(
      <OrderFilterTabs 
        currentStatusFilter={null} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    expect(screen.getByText('Failed to load filters')).toBeInTheDocument();
  });

  it('renders tabs with correct values when data is loaded', () => {
    mockUseGetFulfillmentFilterOptions.mockReturnValue({
      data: {
        statuses: [
          { key: 'Processing', name: 'Processing', count: 24 },
          { key: 'PendingQC', name: 'Pending QC', count: 12 },
          { key: 'ReadyToShip', name: 'Ready to Ship', count: 8 },
          { key: 'Completed', name: 'Completed', count: 156 },
        ],
      },
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    render(
      <OrderFilterTabs 
        currentStatusFilter={null} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Processing (24)')).toBeInTheDocument();
    expect(screen.getByText('PendingQC (12)')).toBeInTheDocument();
    expect(screen.getByText('ReadyToShip (8)')).toBeInTheDocument();
    expect(screen.getByText('Completed (156)')).toBeInTheDocument();
  });

  it('calls onStatusChange with null when "All" tab is clicked', () => {
    mockUseGetFulfillmentFilterOptions.mockReturnValue({
      data: {
        statuses: [
          { key: 'Processing', name: 'Processing', count: 24 },
          { key: 'PendingQC', name: 'Pending QC', count: 12 },
        ],
      },
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    render(
      <OrderFilterTabs 
        currentStatusFilter="Processing" 
        onStatusChange={mockOnStatusChange} 
      />
    );

    fireEvent.click(screen.getByText('All'));
    expect(mockOnStatusChange).toHaveBeenCalledWith(null);
  });

  it('calls onStatusChange with status key when status tab is clicked', () => {
    mockUseGetFulfillmentFilterOptions.mockReturnValue({
      data: {
        statuses: [
          { key: 'Processing', name: 'Processing', count: 24 },
          { key: 'PendingQC', name: 'Pending QC', count: 12 },
        ],
      },
      isLoading: false,
      error: null,
      isError: false,
    } as any);

    render(
      <OrderFilterTabs 
        currentStatusFilter={null} 
        onStatusChange={mockOnStatusChange} 
      />
    );

    fireEvent.click(screen.getByText('PendingQC (12)'));
    expect(mockOnStatusChange).toHaveBeenCalledWith('PendingQC');
  });
});
