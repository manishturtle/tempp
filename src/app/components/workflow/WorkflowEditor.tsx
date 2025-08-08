'use client';

import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import { useWorkflowEditor } from '@/contexts/WorkflowEditorContext';
import TaskNode from './TaskNode';
import { useAutoSave } from '@/hooks/useAutoSave';
import type { WorkflowStepUI, WorkflowStepData } from '@/types/workflow';

interface WorkflowEditorProps {
  workflowId: string | null;
  nodeTypes: NodeTypes;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflowId, nodeTypes }) => {
  const { 
    state: { nodes: initialNodes, edges: initialEdges, isDirty },
    updateNodes,
    updateEdges,
    onConnect: handleConnect,
    markClean,
  } = useWorkflowEditor();

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowStepUI['data']>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle auto-saving of changes
  const { isSaving } = useAutoSave(
    async () => {
      if (workflowId && isDirty) {
        // Save workflow changes here
        markClean();
      }
    },
    isDirty,
    30000,
    Boolean(workflowId)
  );

  const onConnect = useCallback<OnConnect>(
    (params: Connection) => {
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      handleConnect(params);
    },
    [edges, setEdges, handleConnect]
  );

  // Handle node changes (position, selection, etc.)
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      const typedNodes = nodes.map(node => ({
        ...node,
        type: 'task' as const,
      })) as WorkflowStepUI[];
      updateNodes(typedNodes);
    },
    [nodes, onNodesChange, updateNodes]
  );

  // Handle edge changes
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      updateEdges(edges);
    },
    [edges, onEdgesChange, updateEdges]
  );

  // Handle dropping new nodes from toolbox
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      try {
        // Get task type and data
        const taskType = event.dataTransfer.getData('application/reactflow');
        const taskDataStr = event.dataTransfer.getData('application/json');
        
        if (!taskType || !taskDataStr) {
          console.error('Missing required drag data');
          return;
        }

        const taskData = JSON.parse(taskDataStr);
        if (!taskData.name || !taskData.template_id) {
          console.error('Invalid task data format');
          return;
        }

        // Get the position where the node was dropped
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        const position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };

        // Create the new node data
        const nodeData: WorkflowStepData & { type: string } = {
          name: taskData.name,
          step_name: taskData.name,
          predefined_template_id: taskData.template_id,
          fields: [],
          description: taskData.description || '',
          assignee: '',
          type: taskType,
        };

        // Create the new node
        const newNode: WorkflowStepUI = {
          id: `${taskType}-${Date.now()}`,
          type: 'task',
          position,
          data: nodeData,
        };

        setNodes((nds) => [...nds, newNode]);
        const typedNodes = [...nodes, newNode].map(node => ({
          ...node,
          type: 'task' as const,
        })) as WorkflowStepUI[];
        updateNodes(typedNodes);
      } catch (error) {
        console.error('Error handling node drop:', error);
      }
    },
    [nodes, setNodes, updateNodes]
  );

  // Handle drag over for dropping new nodes
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '600px',
        flex: 1,
        display: 'flex',
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </Box>
  );
};

export default WorkflowEditor;
