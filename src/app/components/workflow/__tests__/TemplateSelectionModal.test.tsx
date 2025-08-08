import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/theme';
import TemplateSelectionModal from '../TemplateSelectionModal';
import { usePredefinedTemplates } from '@/hooks/api/ofm';
import '@testing-library/jest-dom';

// Mock the hooks
jest.mock('@/hooks/api/ofm', () => ({
  usePredefinedTemplates: jest.fn(),
}));

// Mock useTranslation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockTemplates = {
  results: [
    {
      id: 1,
      display_name: 'Start Task',
      description: 'Initial task in workflow',
      system_name: 'start_task',
      fields: [],
    },
    {
      id: 2,
      display_name: 'Process Task',
      description: 'Process a request',
      system_name: 'process_task',
      fields: [],
    },
  ],
};

describe('TemplateSelectionModal', () => {
  const mockProps = {
    open: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    (usePredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: true,
      isError: false,
      data: null,
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateSelectionModal {...mockProps} />
      </ThemeProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (usePredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: true,
      data: null,
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateSelectionModal {...mockProps} />
      </ThemeProvider>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders template list', () => {
    (usePredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockTemplates,
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateSelectionModal {...mockProps} />
      </ThemeProvider>
    );

    expect(screen.getByText('Start Task')).toBeInTheDocument();
    expect(screen.getByText('Process Task')).toBeInTheDocument();
  });

  it('handles template selection', async () => {
    (usePredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockTemplates,
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateSelectionModal {...mockProps} />
      </ThemeProvider>
    );

    // Select button should be disabled initially
    const selectButton = screen.getByText('common.select');
    expect(selectButton).toBeDisabled();

    // Click a template
    fireEvent.click(screen.getByText('Start Task'));

    // Select button should be enabled
    await waitFor(() => {
      expect(selectButton).toBeEnabled();
    });

    // Click select button
    fireEvent.click(selectButton);

    // Check if onSelect was called with correct template
    expect(mockProps.onSelect).toHaveBeenCalledWith(mockTemplates.results[0]);
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles cancel', () => {
    (usePredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockTemplates,
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateSelectionModal {...mockProps} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('common.cancel'));
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('does not render when open is false', () => {
    (usePredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockTemplates,
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateSelectionModal {...mockProps} open={false} />
      </ThemeProvider>
    );

    expect(screen.queryByText('workflow.editor.selectTemplate.title')).not.toBeInTheDocument();
  });
});
