'use client';

import React from 'react';
import ReactFlow, {
  Background,
  Controls,
  NodeTypes,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  NodeMouseHandler,
  ReactFlowProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import { useWorkflowEditor } from '@/app/contexts/WorkflowEditorContext';
import TaskNode from '../TaskNode';

interface WorkflowCanvasProps {
  nodeTypes?: NodeTypes;
}

const defaultNodeTypes: NodeTypes = {
  task: TaskNode,
};

export default function WorkflowCanvas({ nodeTypes = {} }: WorkflowCanvasProps) {
  const { state, updateNodes, updateEdges, selectNode } = useWorkflowEditor();

  const onNodesChange: OnNodesChange = React.useCallback((changes) => {
    updateNodes(changes);
  }, [updateNodes]);

  const onEdgesChange: OnEdgesChange = React.useCallback((changes) => {
    updateEdges(changes);
  }, [updateEdges]);

  const onNodeClick: NodeMouseHandler = React.useCallback((_, node) => {
    selectNode(node.id);
  }, [selectNode]);

  const flowProps: ReactFlowProps = {
    nodes: state.nodes,
    edges: state.edges,
    nodeTypes: { ...defaultNodeTypes, ...nodeTypes },
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    fitView: true,
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ReactFlow {...flowProps}>
        <Background />
        <Controls />
      </ReactFlow>
    </Box>
  );
}
