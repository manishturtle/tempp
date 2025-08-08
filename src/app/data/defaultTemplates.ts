import type { Template } from '@/app/types/ofm';

export const defaultTemplates: Template[] = [
  {
    id: 'basic-workflow',
    display_name: 'Basic Workflow',
    system_name: 'basic_workflow',
    description: 'A simple sequential workflow with basic approval steps',
    category: 'Basic',
    fields: [
      {
        id: 'name',
        name: 'Name',
        type: 'TEXT',
        required: true,
      },
      {
        id: 'description',
        name: 'Description',
        type: 'TEXTAREA',
        required: false,
      },
      {
        id: 'assignee',
        name: 'Assignee',
        type: 'USER_LOOKUP',
        required: true,
      },
    ],
  },
  {
    id: 'approval-flow',
    display_name: 'Approval Flow',
    system_name: 'approval_flow',
    description: 'Multi-level approval workflow with conditional routing',
    category: 'Approval',
    fields: [
      {
        id: 'request_type',
        name: 'Request Type',
        type: 'DROPDOWN',
        required: true,
        default_value: 'standard',
      },
      {
        id: 'priority',
        name: 'Priority',
        type: 'DROPDOWN',
        required: true,
        default_value: 'medium',
      },
      {
        id: 'approvers',
        name: 'Approvers',
        type: 'USER_LOOKUP',
        required: true,
      },
    ],
  },
  {
    id: 'decision-tree',
    display_name: 'Decision Tree',
    system_name: 'decision_tree',
    description: 'Complex decision-making workflow with multiple branches',
    category: 'Decision',
    fields: [
      {
        id: 'condition',
        name: 'Condition',
        type: 'DROPDOWN',
        required: true,
      },
      {
        id: 'threshold',
        name: 'Threshold',
        type: 'NUMBER',
        required: true,
      },
      {
        id: 'evaluator',
        name: 'Evaluator',
        type: 'USER_LOOKUP',
        required: true,
      },
    ],
  },
  {
    id: 'notification',
    display_name: 'Notification Flow',
    system_name: 'notification_flow',
    description: 'Automated notification workflow with customizable recipients',
    category: 'Notification',
    fields: [
      {
        id: 'recipients',
        name: 'Recipients',
        type: 'USER_LOOKUP',
        required: true,
      },
      {
        id: 'message',
        name: 'Message',
        type: 'TEXTAREA',
        required: true,
      },
      {
        id: 'schedule',
        name: 'Schedule',
        type: 'DATETIME',
        required: false,
      },
    ],
  },
];
