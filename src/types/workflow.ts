import type { Edge, Node } from 'reactflow';
import type { PredefinedTemplate, WorkflowStepField } from './ofm';

export interface Template extends Omit<PredefinedTemplate, 'id' | 'description'> {
  id: string;
  category: string;
  description?: string;
}

export interface WorkflowStepData {
  predefined_template_id: string;
  step_name: string;
  name: string;
  description?: string;
  assignee?: string;
  fields: WorkflowStepField[];
}

export interface WorkflowStepUI extends Node<WorkflowStepData> {
  type: 'task';
}

export interface StepBuilderProps {
  nodes: WorkflowStepUI[];
  edges: Edge[];
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (params: any) => void;
  onNodeClick?: (event: React.MouseEvent, node: WorkflowStepUI) => void;
  selectedNodeId?: string | null;
}

export interface WorkflowSettings {
  enable_partial_fulfillment: boolean;
  max_hold_time_days: number;
  notes?: string;
}
