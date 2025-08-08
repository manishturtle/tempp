'use client';

import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import TaskNode from './TaskNode';
import StepNode from './StepNode';

const nodeTypes = {
  task: TaskNode,
  stepNode: StepNode,
};

interface ReactFlowStepBuilderProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onRemoveNode: (nodeId: string) => void;
  onNodesReordered: (orderedNodeIds: string[]) => void;
  onAddNode: (templateInfo: any, position: { x: number; y: number }) => void;
  selectedNodeId: string | null;
}

const ReactFlowStepBuilder: React.FC<ReactFlowStepBuilderProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onRemoveNode,
  onNodesReordered,
  onAddNode,
  selectedNodeId,
}) => {
  const { t } = useTranslation('ofm');
  const { project } = useReactFlow();

  // Handle node drag
  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Calculate new order based on Y positions
      const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
      const orderedIds = sortedNodes.map(n => n.id);
      onNodesReordered(orderedIds);
    },
    [nodes, onNodesReordered]
  );

  // Handle connection
  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `e${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        type: 'smoothstep',
      };
      onEdgesChange([{
        type: 'add',
        item: newEdge,
      }]);
    },
    [onEdgesChange]
  );

  // Handle drop from template sidebar
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      try {
        // Get all available data formats
        const types = event.dataTransfer.types;
        console.log('Available data types:', types);

        // Try to get template data
        const templateData = event.dataTransfer.getData('application/reactflow');
        const jsonData = event.dataTransfer.getData('application/json');
        
        console.log('Template data:', templateData);
        console.log('JSON data:', jsonData);

        // Parse JSON data if available
        let data;
        if (jsonData) {
          try {
            data = JSON.parse(jsonData);
          } catch (parseError) {
            console.error('Error parsing JSON data:', parseError);
            return;
          }
        } else if (templateData) {
          try {
            data = JSON.parse(templateData);
          } catch (parseError) {
            console.error('Error parsing template data:', parseError);
            return;
          }
        } else {
          console.error('No valid data found in drop event');
          return;
        }

        // Get the drop position relative to the ReactFlow viewport
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        const position = project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        // Calculate position relative to existing nodes
        const yPositions = nodes.length > 0 ? nodes.map(n => n.position.y) : [position.y];
        const minY = Math.min(...yPositions, position.y);
        const maxY = Math.max(...yPositions, position.y);
        
        // Find nodes above and below the drop position
        const nodesAbove = nodes.filter(n => n.position.y < position.y);
        const nodesBelow = nodes.filter(n => n.position.y > position.y);
        
        // Adjust spacing
        const spacing = 100;
        nodesBelow.forEach(node => {
          onNodesChange([{
            type: 'position',
            id: node.id,
            position: { x: node.position.x, y: node.position.y + spacing },
          }]);
        });

        // Add the new node
        onAddNode(data, position);

      } catch (error) {
        console.error('Error handling template drop:', error);
      }
    },
    [nodes, onNodesChange, onAddNode, project]
  );

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <Panel position="top-right">
          {selectedNodeId && (
            <Tooltip title={t('workflow.editor.removeNode')}>
              <IconButton
                onClick={() => onRemoveNode(selectedNodeId)}
                size="small"
                sx={{ bgcolor: 'background.paper' }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Panel>
      </ReactFlow>
    </Box>
  );
};

export default ReactFlowStepBuilder;
