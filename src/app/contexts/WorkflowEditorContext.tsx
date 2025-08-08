'use client';

import { createContext, useContext, useReducer, useCallback } from 'react';
import type { Node, Edge, Connection } from 'reactflow';
import type { WorkflowStepUI, WorkflowSettings } from '@/types/workflow';

interface WorkflowEditorState {
  nodes: WorkflowStepUI[];
  edges: Edge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  settings: WorkflowSettings;
  name: string;
  description: string;
}

interface WorkflowEditorContextType {
  state: WorkflowEditorState;
  selectedNode: WorkflowStepUI | null;
  addNode: (node: WorkflowStepUI) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowStepUI>) => void;
  updateStep: (nodeId: string, updates: Partial<WorkflowStepUI>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  markClean: () => void;
  updateSettings: (settings: WorkflowSettings) => void;
  updateNodes: (nodes: WorkflowStepUI[]) => void;
  updateEdges: (edges: Edge[]) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  updateWorkflowInfo: (name: string, description: string) => void;
}

type Action =
  | { type: 'ADD_NODE'; node: WorkflowStepUI }
  | { type: 'UPDATE_NODE'; nodeId: string; updates: Partial<WorkflowStepUI> }
  | { type: 'REMOVE_NODE'; nodeId: string }
  | { type: 'ADD_EDGE'; edge: Edge }
  | { type: 'REMOVE_EDGE'; edgeId: string }
  | { type: 'SELECT_NODE'; nodeId: string | null }
  | { type: 'MARK_CLEAN' }
  | { type: 'UPDATE_SETTINGS'; settings: WorkflowSettings }
  | { type: 'UPDATE_NODES'; nodes: WorkflowStepUI[] }
  | { type: 'UPDATE_EDGES'; edges: Edge[] }
  | { type: 'UPDATE_WORKFLOW_INFO'; name: string; description: string };

const initialState: WorkflowEditorState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,
  settings: {
    enablePartialFulfillment: true,
    maxHoldTimeDays: 14,
  },
  name: '',
  description: '',
};

function workflowEditorReducer(state: WorkflowEditorState, action: Action): WorkflowEditorState {
  switch (action.type) {
    case 'ADD_NODE':
      return {
        ...state,
        nodes: [...state.nodes, action.node],
        isDirty: true,
      };
    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map(node =>
          node.id === action.nodeId ? { ...node, ...action.updates } : node
        ),
        isDirty: true,
      };
    case 'REMOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter(node => node.id !== action.nodeId),
        edges: state.edges.filter(
          edge => edge.source !== action.nodeId && edge.target !== action.nodeId
        ),
        isDirty: true,
      };
    case 'ADD_EDGE':
      return {
        ...state,
        edges: [...state.edges, action.edge],
        isDirty: true,
      };
    case 'REMOVE_EDGE':
      return {
        ...state,
        edges: state.edges.filter(edge => edge.id !== action.edgeId),
        isDirty: true,
      };
    case 'SELECT_NODE':
      return {
        ...state,
        selectedNodeId: action.nodeId,
      };
    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false,
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: action.settings,
        isDirty: true,
      };
    case 'UPDATE_NODES':
      return {
        ...state,
        nodes: action.nodes,
        isDirty: true,
      };
    case 'UPDATE_EDGES':
      return {
        ...state,
        edges: action.edges,
        isDirty: true,
      };
    case 'UPDATE_WORKFLOW_INFO':
      return {
        ...state,
        name: action.name,
        description: action.description,
        isDirty: true,
      };
    default:
      return state;
  }
}

const WorkflowEditorContext = createContext<WorkflowEditorContextType | null>(null);

export function WorkflowEditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workflowEditorReducer, initialState);

  const selectedNode = state.nodes.find(node => node.id === state.selectedNodeId) || null;

  const addNode = useCallback((node: WorkflowStepUI) => {
    dispatch({ type: 'ADD_NODE', node });
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowStepUI>) => {
    dispatch({ type: 'UPDATE_NODE', nodeId, updates });
  }, []);

  const updateStep = useCallback((nodeId: string, updates: Partial<WorkflowStepUI>) => {
    dispatch({ type: 'UPDATE_NODE', nodeId, updates });
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    dispatch({ type: 'REMOVE_NODE', nodeId });
  }, []);

  const addEdge = useCallback((connection: Connection) => {
    const edge: Edge = {
      id: `${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
    };
    dispatch({ type: 'ADD_EDGE', edge });
  }, []);

  const removeEdge = useCallback((edgeId: string) => {
    dispatch({ type: 'REMOVE_EDGE', edgeId });
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    dispatch({ type: 'SELECT_NODE', nodeId });
  }, []);

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' });
  }, []);

  const updateSettings = useCallback((settings: WorkflowSettings) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings });
  }, []);

  const updateNodes = useCallback((nodes: WorkflowStepUI[]) => {
    dispatch({ type: 'UPDATE_NODES', nodes });
  }, []);

  const updateEdges = useCallback((edges: Edge[]) => {
    dispatch({ type: 'UPDATE_EDGES', edges });
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    addEdge(connection);
  }, [addEdge]);

  const setSelectedNodeId = useCallback((nodeId: string | null) => {
    dispatch({ type: 'SELECT_NODE', nodeId });
  }, []);

  const updateWorkflowInfo = useCallback((name: string, description: string) => {
    dispatch({ type: 'UPDATE_WORKFLOW_INFO', name, description });
  }, []);

  return (
    <WorkflowEditorContext.Provider
      value={{
        state,
        selectedNode,
        addNode,
        updateNode,
        updateStep,
        removeNode,
        addEdge,
        removeEdge,
        selectNode,
        markClean,
        updateSettings,
        updateNodes,
        updateEdges,
        onConnect,
        setSelectedNodeId,
        updateWorkflowInfo,
      }}
    >
      {children}
    </WorkflowEditorContext.Provider>
  );
}

export function useWorkflowEditor() {
  const context = useContext(WorkflowEditorContext);
  if (!context) {
    throw new Error('useWorkflowEditor must be used within a WorkflowEditorProvider');
  }
  return context;
}
