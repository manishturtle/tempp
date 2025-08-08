'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkflowEditor from '../';
import { useWorkflow, useSaveWorkflowVersion } from '@/hooks/api/useWorkflows';
import { useTranslation } from 'react-i18next';
import { SnackbarProvider } from 'notistack';
import { I18nextProvider } from 'react-i18next';
import TaskNode from '../../TaskNode';
import i18next from 'i18next';

const i18n = i18next.createInstance();
i18n.init({
  lng: 'en',
  resources: {
    en: {
      ofm: {
        workflows: {
          editor: {
            stepConfig: 'Step Configuration',
            stepName: 'Step Name',
            template: 'Template',
            stepDescription: 'Description',
            stepAssignee: 'Assignee',
            noSelection: 'No step selected',
            saveSuccess: 'Workflow saved successfully',
            saveError: 'Failed to save workflow',
            enablePartialFulfillment: 'Enable Partial Fulfillment',
            maxHoldTimeDays: 'Max Hold Time (Days)',
            versionSettings: 'Version Settings',
          },
          defaultName: 'New Workflow',
          defaultDescription: 'New workflow description',
          templates: {
            approval: 'Approval',
            notification: 'Notification',
            decision: 'Decision',
          },
        },
      },
    },
  },
});

// Add Jest DOM matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}

// Mock the hooks
jest.mock('@/hooks/api/useWorkflows');
jest.mock('react-i18next');
jest.mock('@/contexts/WorkflowEditorContext', () => ({
  ...jest.requireActual('@/contexts/WorkflowEditorContext'),
  useWorkflowEditor: () => ({
    state: {
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isDirty: false,
      settings: {
        enablePartialFulfillment: true,
        maxHoldTimeDays: 14,
      },
    },
    updateSettings: jest.fn(),
    markClean: jest.fn(),
  }),
}));

const nodeTypes = {
  task: TaskNode,
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <SnackbarProvider>
        {ui}
      </SnackbarProvider>
    </I18nextProvider>
  );
};

describe('WorkflowEditor', () => {
  beforeEach(() => {
    // Mock useWorkflow hook
    (useWorkflow as jest.Mock).mockReturnValue({
      data: {
        id: '1',
        name: 'Test Workflow',
        description: 'Test Description',
      },
      isLoading: false,
    });

    // Mock useSaveWorkflowVersion hook
    (useSaveWorkflowVersion as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
    });

    // Mock useTranslation hook
    (useTranslation as jest.Mock).mockReturnValue({
      t: (key: string) => key,
    });
  });

  it('renders without crashing', () => {
    renderWithProviders(
      <WorkflowEditor
        nodeTypes={nodeTypes}
        name="Test Workflow"
      />
    );
  });

  it('renders version settings controls', () => {
    renderWithProviders(
      <WorkflowEditor
        nodeTypes={nodeTypes}
        name="Test Workflow"
      />
    );

    expect(screen.getByText('ofm.workflows.editor.versionSettings')).toBeInTheDocument();
    expect(screen.getByText('ofm.workflows.editor.enablePartialFulfillment')).toBeInTheDocument();
    expect(screen.getByLabelText('ofm.workflows.editor.maxHoldTimeDays')).toBeInTheDocument();
  });

  it('includes version settings in save payload', async () => {
    const mockMutateAsync = jest.fn();
    (useSaveWorkflowVersion as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
    });

    renderWithProviders(
      <WorkflowEditor
        nodeTypes={nodeTypes}
        name="Test Workflow"
      />
    );

    // Trigger auto-save
    await screen.findByText('ofm.workflows.editor.versionSettings');

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        enablePartialFulfillment: true,
        maxHoldTimeDays: 14,
      })
    );
  });

  it('updates settings when controls are changed', () => {
    const mockUpdateSettings = jest.fn();
    jest.spyOn(require('@/contexts/WorkflowEditorContext'), 'useWorkflowEditor').mockReturnValue({
      state: {
        nodes: [],
        edges: [],
        selectedNodeId: null,
        isDirty: false,
        settings: {
          enablePartialFulfillment: true,
          maxHoldTimeDays: 14,
        },
      },
      updateSettings: mockUpdateSettings,
      markClean: jest.fn(),
    });

    renderWithProviders(
      <WorkflowEditor
        nodeTypes={nodeTypes}
        name="Test Workflow"
      />
    );

    // Change partial fulfillment setting
    const partialFulfillmentSwitch = screen.getByRole('checkbox');
    fireEvent.click(partialFulfillmentSwitch);

    // Change max hold time
    const maxHoldTimeInput = screen.getByLabelText('ofm.workflows.editor.maxHoldTimeDays');
    fireEvent.change(maxHoldTimeInput, { target: { value: '7' } });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      enablePartialFulfillment: false,
      maxHoldTimeDays: 14,
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      enablePartialFulfillment: true,
      maxHoldTimeDays: 7,
    });
  });
});
