import React from 'react';
import { render, screen } from '@testing-library/react';
import TemplateSidebar from './index';
import { useGetPredefinedTemplates } from '@/app/hooks/api/ofm/useWorkflowQueries';

// Mock the useGetPredefinedTemplates hook
jest.mock('@/app/hooks/api/ofm/useWorkflowQueries', () => ({
  useGetPredefinedTemplates: jest.fn(),
}));

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TemplateSidebar', () => {
  const mockTemplates = {
    results: [
      {
        id: '1',
        display_name: 'Basic Task',
        system_name: 'basic_task',
        description: 'A basic task template',
        fields: [],
      },
      {
        id: '2',
        display_name: 'Approval Task',
        system_name: 'approval_task',
        description: 'An approval task template',
        fields: [],
      },
    ],
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    (useGetPredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: true,
      error: null,
      data: null,
    });

    render(<TemplateSidebar />);
    expect(screen.getByText('workflow.templates.title')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3); // 3 skeleton items
  });

  it('renders error state correctly', () => {
    (useGetPredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: false,
      error: new Error('Failed to load templates'),
      data: null,
    });

    render(<TemplateSidebar />);
    expect(screen.getByText('workflow.templates.error')).toBeInTheDocument();
  });

  it('renders templates list correctly', () => {
    (useGetPredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockTemplates,
    });

    render(<TemplateSidebar />);

    expect(screen.getByText('Basic Task')).toBeInTheDocument();
    expect(screen.getByText('Approval Task')).toBeInTheDocument();
    expect(screen.getByText('A basic task template')).toBeInTheDocument();
    expect(screen.getByText('An approval task template')).toBeInTheDocument();
  });

  it('makes template items draggable', () => {
    (useGetPredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockTemplates,
    });

    render(<TemplateSidebar />);

    const templateItems = screen.getAllByRole('listitem');
    templateItems.forEach((item) => {
      expect(item).toHaveAttribute('draggable', 'true');
    });
  });

  it('sets drag data correctly on drag start', () => {
    (useGetPredefinedTemplates as jest.Mock).mockReturnValue({
      isLoading: false,
      error: null,
      data: mockTemplates,
    });

    render(<TemplateSidebar />);

    const dataTransfer = {
      setData: jest.fn(),
      effectAllowed: '',
    };

    const firstTemplate = screen.getByText('Basic Task').closest('li');
    if (firstTemplate) {
      const dragStartEvent = new Event('dragstart', { bubbles: true });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: dataTransfer,
      });

      firstTemplate.dispatchEvent(dragStartEvent);

      expect(dataTransfer.setData).toHaveBeenCalledWith(
        'application/reactflow',
        JSON.stringify({
          templateId: '1',
          templateName: 'Basic Task',
          templateSystemName: 'basic_task',
          description: 'A basic task template',
          fields: [],
        })
      );
      expect(dataTransfer.effectAllowed).toBe('move');
    }
  });
});
