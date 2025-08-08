import { renderHook } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import {
  useCreateWorkflowWithInitialVersion,
  useSaveWorkflowVersion,
} from '../useWorkflowMutations';
import {
  createWorkflowWithInitialVersion,
  saveNewWorkflowVersion,
} from '@/services/api/ofm/workflows';

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('notistack', () => ({
  useSnackbar: jest.fn(),
}));

jest.mock('@/services/api/ofm/workflows', () => ({
  createWorkflowWithInitialVersion: jest.fn(),
  saveNewWorkflowVersion: jest.fn(),
}));

// Mock useTranslation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('useWorkflowMutations', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockQueryClient = {
    invalidateQueries: jest.fn(),
  };

  const mockSnackbar = {
    enqueueSnackbar: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
    (useSnackbar as jest.Mock).mockReturnValue(mockSnackbar);
  });

  describe('useCreateWorkflowWithInitialVersion', () => {
    const mockPayload = {
      name: 'Test Workflow',
      description: 'Test Description',
      initial_version: {
        description: '',
        steps: [],
        nodes: [],
        edges: [],
        enablePartialFulfillment: false,
        maxHoldTimeDays: 7,
      },
    };

    const mockResponse = {
      id: 'workflow-1',
      name: 'Test Workflow',
    };

    it('calls createWorkflowWithInitialVersion with correct payload', async () => {
      (createWorkflowWithInitialVersion as jest.Mock).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateWorkflowWithInitialVersion());
      await result.current.mutateAsync(mockPayload);

      expect(createWorkflowWithInitialVersion).toHaveBeenCalledWith(mockPayload);
    });

    it('handles successful workflow creation', async () => {
      (createWorkflowWithInitialVersion as jest.Mock).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateWorkflowWithInitialVersion());
      await result.current.mutateAsync(mockPayload);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['ofm', 'workflows'],
      });
      expect(mockSnackbar.enqueueSnackbar).toHaveBeenCalledWith('ofm.workflows.createSuccess', {
        variant: 'success',
      });
      expect(mockRouter.push).toHaveBeenCalledWith('/Masters/admin/fulfillment/workflows/workflow-1');
    });

    it('handles creation error', async () => {
      const error = new Error('API Error');
      (createWorkflowWithInitialVersion as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCreateWorkflowWithInitialVersion());
      await expect(result.current.mutateAsync(mockPayload)).rejects.toThrow('API Error');

      expect(mockSnackbar.enqueueSnackbar).toHaveBeenCalledWith('ofm.workflows.createError', {
        variant: 'error',
      });
    });
  });

  describe('useSaveWorkflowVersion', () => {
    const workflowId = 'workflow-1';
    const mockPayload = {
      description: 'New Version',
      steps: [],
      nodes: [],
      edges: [],
      enablePartialFulfillment: true,
      maxHoldTimeDays: 14,
    };

    const mockResponse = {
      id: 'version-1',
      workflow_id: workflowId,
      version: 2,
    };

    it('calls saveNewWorkflowVersion with correct payload', async () => {
      (saveNewWorkflowVersion as jest.Mock).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSaveWorkflowVersion(workflowId));
      await result.current.mutateAsync(mockPayload);

      expect(saveNewWorkflowVersion).toHaveBeenCalledWith(workflowId, mockPayload);
    });

    it('handles successful version save', async () => {
      (saveNewWorkflowVersion as jest.Mock).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSaveWorkflowVersion(workflowId));
      await result.current.mutateAsync(mockPayload);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['ofm', 'workflows'],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['ofm', 'workflowVersions', workflowId],
      });
      expect(mockSnackbar.enqueueSnackbar).toHaveBeenCalledWith('ofm.workflows.saveVersionSuccess', {
        variant: 'success',
      });
      expect(mockRouter.push).toHaveBeenCalledWith('/Masters/admin/fulfillment/workflows');
    });

    it('handles save error', async () => {
      const error = new Error('API Error');
      (saveNewWorkflowVersion as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSaveWorkflowVersion(workflowId));
      await expect(result.current.mutateAsync(mockPayload)).rejects.toThrow('API Error');

      expect(mockSnackbar.enqueueSnackbar).toHaveBeenCalledWith('ofm.workflows.saveVersionError', {
        variant: 'error',
      });
    });
  });
});
