import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/theme';
import StepNode from '../StepNode';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

// Mock useConfirmDialog hook
jest.mock('@/hooks/useConfirmDialog');
const mockShowConfirmDialog = jest.fn();
(useConfirmDialog as jest.Mock).mockReturnValue({
  showConfirmDialog: mockShowConfirmDialog,
});

// Mock useTranslation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('StepNode', () => {
  const mockProps = {
    id: 'node-1',
    type: 'stepNode',
    position: { x: 0, y: 0 },
    data: {
      stepName: 'Test Step',
      baseTemplateName: 'Test Template',
      onRemoveNode: jest.fn(),
    },
    selected: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step name and template name', () => {
    render(
      <ThemeProvider theme={theme}>
        <StepNode {...mockProps} />
      </ThemeProvider>
    );

    expect(screen.getByText('Test Step')).toBeInTheDocument();
    expect(screen.getByText('Test Template')).toBeInTheDocument();
  });

  it('shows confirmation dialog when remove button is clicked', async () => {
    mockShowConfirmDialog.mockResolvedValueOnce(true);

    render(
      <ThemeProvider theme={theme}>
        <StepNode {...mockProps} />
      </ThemeProvider>
    );

    const removeButton = screen.getByTestId('remove-node-node-1');
    fireEvent.click(removeButton);

    expect(mockShowConfirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'workflow.editor.step.removeTitle',
        message: expect.any(String),
      })
    );
  });

  it('calls onRemoveNode when confirmation is confirmed', async () => {
    mockShowConfirmDialog.mockResolvedValueOnce(true);

    render(
      <ThemeProvider theme={theme}>
        <StepNode {...mockProps} />
      </ThemeProvider>
    );

    const removeButton = screen.getByTestId('remove-node-node-1');
    fireEvent.click(removeButton);

    // Wait for async confirmation
    await Promise.resolve();

    expect(mockProps.data.onRemoveNode).toHaveBeenCalledWith('node-1');
  });

  it('does not call onRemoveNode when confirmation is cancelled', async () => {
    mockShowConfirmDialog.mockResolvedValueOnce(false);

    render(
      <ThemeProvider theme={theme}>
        <StepNode {...mockProps} />
      </ThemeProvider>
    );

    const removeButton = screen.getByTestId('remove-node-node-1');
    fireEvent.click(removeButton);

    // Wait for async confirmation
    await Promise.resolve();

    expect(mockProps.data.onRemoveNode).not.toHaveBeenCalled();
  });

  it('applies selected styles when selected prop is true', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <StepNode {...mockProps} selected={true} />
      </ThemeProvider>
    );

    const card = container.querySelector('.MuiCard-root');
    expect(card).toHaveStyle({
      borderColor: theme.palette.primary.main,
    });
  });
});
