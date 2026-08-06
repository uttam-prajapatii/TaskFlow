import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import workspaceService from '../services/workspace.service';
import type { CreateWorkspacePayload, UpdateWorkspacePayload } from '../features/workspace/types';
import { toast } from 'sonner';

export const useWorkspaces = () => {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.listWorkspaces(),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace created successfully');
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: ({ workspaceId, payload }: { workspaceId: string; payload: UpdateWorkspacePayload }) =>
      workspaceService.updateWorkspace(workspaceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      toast.success('Workspace updated successfully');
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (workspaceId: string) => workspaceService.deleteWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace deleted');
    },
  });

  return {
    createWorkspaceMutation,
    updateWorkspaceMutation,
    deleteWorkspaceMutation,
  };
};
