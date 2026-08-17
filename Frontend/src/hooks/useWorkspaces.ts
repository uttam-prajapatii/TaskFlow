import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import workspaceService from '../services/workspace.service';
import type { Workspace, CreateWorkspacePayload, UpdateWorkspacePayload } from '../features/workspace/types';

export const useWorkspaces = (enabled = true) => {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.listWorkspaces(),
    enabled,
    staleTime: 1000 * 30, // 30 seconds stale time
  });
};

export const useWorkspaceDetails = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => (workspaceId ? workspaceService.getWorkspaceDetails(workspaceId) : Promise.reject('No ID')),
    enabled: Boolean(workspaceId),
  });
};

export const useWorkspaceMutations = () => {
  const queryClient = useQueryClient();

  const createWorkspaceMutation = useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => workspaceService.createWorkspace(payload),
    onSuccess: (newWorkspace) => {
      queryClient.setQueryData<Workspace[]>(['workspaces'], (old) => (old ? [...old, newWorkspace] : [newWorkspace]));
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: ({ workspaceId, payload }: { workspaceId: string; payload: UpdateWorkspacePayload }) =>
      workspaceService.updateWorkspace(workspaceId, payload),
    onMutate: async ({ workspaceId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['workspaces'] });
      const previousWorkspaces = queryClient.getQueryData<Workspace[]>(['workspaces']);

      if (previousWorkspaces) {
        queryClient.setQueryData<Workspace[]>(
          ['workspaces'],
          previousWorkspaces.map((w) =>
            (w._id || w.id) === workspaceId ? { ...w, ...payload } : w
          )
        );
      }
      return { previousWorkspaces };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(['workspaces'], context.previousWorkspaces);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (workspaceId: string) => workspaceService.deleteWorkspace(workspaceId),
    onMutate: async (workspaceId: string) => {
      await queryClient.cancelQueries({ queryKey: ['workspaces'] });
      const previousWorkspaces = queryClient.getQueryData<Workspace[]>(['workspaces']);

      if (previousWorkspaces) {
        queryClient.setQueryData<Workspace[]>(
          ['workspaces'],
          previousWorkspaces.filter((w) => (w._id || w.id) !== workspaceId)
        );
      }
      return { previousWorkspaces };
    },
    onError: (_err, _workspaceId, context) => {
      if (context?.previousWorkspaces) {
        queryClient.setQueryData(['workspaces'], context.previousWorkspaces);
      }
    },
    onSettled: (_data, _error, workspaceId) => {
      queryClient.removeQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.removeQueries({ queryKey: ['workspace-boards', workspaceId] });
      queryClient.removeQueries({ queryKey: ['workspace-members', workspaceId] });
      queryClient.removeQueries({ queryKey: ['workspace-invites', workspaceId] });
      queryClient.removeQueries({ queryKey: ['workspace-activities', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['created-tasks'] });
    },
  });

  return {
    createWorkspaceMutation,
    updateWorkspaceMutation,
    deleteWorkspaceMutation,
  };
};
