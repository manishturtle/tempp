'use client';

import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowEditor } from '@/contexts/WorkflowEditorContext';
import type { WorkflowStepUI } from '@/types/ofm';

// Simple ID generation for now
const generateId = () => `task_${Math.random().toString(36).substr(2, 9)}`;

// Convert WorkflowStepUI to ReactFlow Node
const workflowStepToNode = (step: WorkflowStepUI): Node => ({
  id: step.id || generateId(),
  type: 'default', // We'll add custom nodes later
  position: { x: step.position?.x || 0, y: step.position?.y || 0 },
  data: { label: step.step_name },
});

export default function WorkflowCanvas() {
  const { state, updateStep } = useWorkflowEditor();

  // Convert workflow steps to ReactFlow nodes
  const nodes = state.nodes.map(workflowStepToNode);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      updateStep(changes);
    },
    [updateStep]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Edge changes are handled by the context through reorderSteps
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Connections are handled by the context through reorderSteps
    },
    []
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={state.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
