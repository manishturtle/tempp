'use client';

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  NodeChange,
  EdgeChange,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import { WorkflowStep } from '@/app/types/ofm';
import StepNode from './StepNode';

interface StepNodeData extends WorkflowStep {
  onRemove?: (nodeId: string) => void;
}

const nodeTypes = {
  step: (props: NodeProps<StepNodeData>) => (
    <StepNode {...props} />
  ),
};

interface StepBuilderProps {
  nodes: Node<StepNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick: (event: React.MouseEvent, node: Node<StepNodeData>) => void;
  onRemoveNode: (nodeId: string) => void;
  onNodesReordered: () => void;
  onDrop: (event: React.DragEvent) => void;
  selectedNodeId: string | null;
}

const StepBuilder: React.FC<StepBuilderProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onRemoveNode,
  onNodesReordered,
  onDrop,
  selectedNodeId,
}) => {
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const nodesWithCallbacks = useMemo(() => 
    nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onRemove: onRemoveNode
      }
    })),
    [nodes, onRemoveNode]
  );

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 400,
        bgcolor: 'background.default',
        borderRadius: 1,
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.5}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background />
      </ReactFlow>
    </Box>
  );
};

export default StepBuilder;
