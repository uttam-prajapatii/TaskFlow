import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import taskService from '../services/task.service';
import type { Task, MoveTaskPayload, CreateTaskPayload, UpdateTaskPayload } from '../features/board/types';
import { toast } from 'sonner';

export const useBoardTasks = (boardId?: string) => {
  return useQuery({
    queryKey: ['boardTasks', boardId],
    queryFn: () => (boardId ? taskService.getBoardTasks(boardId) : Promise.resolve([])),
    enabled: Boolean(boardId),
  });
};

export const useTaskMutations = (boardId?: string) => {
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: ({ listId, payload }: { listId: string; payload: CreateTaskPayload }) =>
      taskService.createTask(listId, payload),
    onSuccess: () => {
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['boardTasks', boardId] });
      }
      toast.success('Task created successfully');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateTaskPayload }) =>
      taskService.updateTask(taskId, payload),
    onSuccess: () => {
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['boardTasks', boardId] });
      }
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: MoveTaskPayload }) =>
      taskService.moveTask(taskId, payload),
    onMutate: async ({ taskId, payload }) => {
      if (!boardId) return;

      await queryClient.cancelQueries({ queryKey: ['boardTasks', boardId] });
      const previousTasks = queryClient.getQueryData<Task[]>(['boardTasks', boardId]);

      if (previousTasks) {
        queryClient.setQueryData<Task[]>(['boardTasks', boardId], (old = []) =>
          old.map((t) =>
            t._id === taskId
              ? { ...t, listId: payload.targetListId, position: payload.targetPosition }
              : t
          )
        );
      }

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      if (boardId && context?.previousTasks) {
        queryClient.setQueryData(['boardTasks', boardId], context.previousTasks);
      }
      toast.error('Failed to move task. Reverting changes.');
    },
    onSettled: () => {
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['boardTasks', boardId] });
      }
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskService.deleteTask(taskId),
    onSuccess: () => {
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['boardTasks', boardId] });
      }
      toast.success('Task deleted');
    },
  });

  return {
    createTaskMutation,
    updateTaskMutation,
    moveTaskMutation,
    deleteTaskMutation,
  };
};
