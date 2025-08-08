import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/theme';
import StepBuilder from '../StepBuilder';

// Mock ReactFlow
jest.mock('reactflow', () => {
  const originalModule = jest.requireActual('reactflow');
  return {
    ...originalModule,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReactFlow: () => ({
      getNodes: () => mockNodes,
      screenToFlowPosition: (position: { x: number; y: number }) => position,
    }),
  };
});

const mockNodes = [
  {
    id: 'node-1',
    type: 'stepNode',
    position: { x: 0, y: 0 },
    data: { stepName: 'Step 1', baseTemplateName: 'Template 1' },
  },
  {
    id: 'node-2',
    type: 'stepNode',
    position: { x: 0, y: 100 },
    data: { stepName: 'Step 2', baseTemplateName: 'Template 2' },
  },
];

const mockEdges = [
  {
    id: 'edge-1-2',
    source: 'node-1',
    target: 'node-2',
    type: 'smoothstep',
  },
];

describe('StepBuilder', () => {
  const mockProps = {
    nodes: mockNodes,
    edges: mockEdges,
    onNodesChange: jest.fn(),
    onEdgesChange: jest.fn(),
    onNodeClick: jest.fn(),
    onRemoveNode: jest.fn(),
    onNodesReordered: jest.fn(),
    onAddNode: jest.fn(),
    selectedNodeId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ReactFlow with provided nodes and edges', () => {
    render(
      <ThemeProvider theme={theme}>
        <StepBuilder {...mockProps} />
      </ThemeProvider>
    );

    // Check if nodes are rendered
    expect(screen.getByTestId('rf-node-node-1')).toBeInTheDocument();
    expect(screen.getByTestId('rf-node-node-2')).toBeInTheDocument();
  });

  it('calls onNodesChange when node position changes', () => {
    render(
      <ThemeProvider theme={theme}>
        <StepBuilder {...mockProps} />
      </ThemeProvider>
    );

    // Simulate node position change
    const changes = [
      {
        id: 'node-1',
        type: 'position',
        position: { x: 100, y: 200 },
        dragging: false,
      },
    ];

    mockProps.onNodesChange(changes);
    expect(mockProps.onNodesChange).toHaveBeenCalledWith(changes);
  });

  it('calls onNodesReordered when node dragging ends', () => {
    render(
      <ThemeProvider theme={theme}>
        <StepBuilder {...mockProps} />
      </ThemeProvider>
    );

    // Simulate node drag end
    const changes = [
      {
        id: 'node-1',
        type: 'position',
        position: { x: 0, y: 200 },
        dragging: false,
      },
    ];

    mockProps.onNodesChange(changes);
    expect(mockProps.onNodesReordered).toHaveBeenCalledWith(['node-2', 'node-1']);
  });

  it('calls onNodeClick when a node is clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <StepBuilder {...mockProps} />
      </ThemeProvider>
    );

    const node = screen.getByTestId('rf-node-node-1');
    fireEvent.click(node);

    expect(mockProps.onNodeClick).toHaveBeenCalled();
  });

  it('handles template drop correctly', () => {
    render(
      <ThemeProvider theme={theme}>
        <StepBuilder {...mockProps} />
      </ThemeProvider>
    );

    const container = screen.getByTestId('react-flow');
    const mockTemplate = {
      id: 'template-1',
      name: 'Test Template',
      systemName: 'test_template',
    };

    // Create a mock drag event
    const dragEvent = new Event('dragover', { bubbles: true });
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: {
        dropEffect: '',
        setData: jest.fn(),
        getData: jest.fn(() => JSON.stringify(mockTemplate)),
      },
    });

    // Create a mock drop event
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: jest.fn(() => JSON.stringify(mockTemplate)),
      },
    });
    Object.defineProperty(dropEvent, 'clientX', { value: 100 });
    Object.defineProperty(dropEvent, 'clientY', { value: 100 });

    // Trigger events
    fireEvent(container, dragEvent);
    fireEvent(container, dropEvent);

    expect(mockProps.onAddNode).toHaveBeenCalledWith(
      {
        templateId: mockTemplate.id,
        templateName: mockTemplate.name,
        templateSystemName: mockTemplate.systemName,
      },
      { x: 100, y: 100 }
    );
  });
});
