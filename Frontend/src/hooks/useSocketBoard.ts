import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';
import useAuth from './useAuth';
import type { Board, BoardList, Task } from '../features/board/types';

export interface Watcher {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export const useSocketBoard = (
  boardId: string | undefined,
  setBoard: React.Dispatch<React.SetStateAction<Board | null>>,
  setColumns: React.Dispatch<React.SetStateAction<BoardList[]>>,
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  loadBoardData: (silent?: boolean) => Promise<void>
) => {
  const { isAuthenticated } = useAuth();
  const [watchers, setWatchers] = useState<Watcher[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !boardId) return;

    const socket = getSocket();

    // Join the board room
    socket.emit('board:join', boardId);

    // Watcher presence updates
    const handlePresence = ({ members }: { boardId: string; members: Watcher[] }) => {
      setWatchers(members);
    };

    // Task event handlers
    const handleTaskCreated = (newTask: Task) => {
      setTasks((prev) => {
        // Prevent duplicate tasks if created locally already
        if (prev.some((t) => (t._id || t.id) === (newTask._id || newTask.id))) return prev;
        return [...prev, newTask];
      });
    };

    const handleTaskUpdated = (updatedTask: Task) => {
      setTasks((prev) =>
        prev.map((t) => ((t._id || t.id) === (updatedTask._id || updatedTask.id) ? updatedTask : t))
      );
    };

    const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => (t._id || t.id) !== taskId));
    };

    const handleTaskMoved = ({ tasks: updatedTasks }: { boardId: string; tasks: Task[] }) => {
      setTasks(updatedTasks);
    };

    // List event handlers
    const handleListCreated = (newList: BoardList) => {
      setColumns((prev) => {
        const id = newList._id || newList.id;
        if (prev.some((c) => (c._id || c.id) === id)) return prev;

        const mappedList: BoardList = {
          ...newList,
          _id: id || '',
          title: newList.title || (newList as any).name || '',
          boardId: newList.boardId || boardId,
        };
        return [...prev, mappedList];
      });
    };

    const handleListUpdated = (updatedList: BoardList) => {
      setColumns((prev) =>
        prev.map((c) => {
          const cId = c._id || c.id;
          const uId = updatedList._id || updatedList.id;
          if (cId === uId) {
            return {
              ...c,
              ...updatedList,
              title: updatedList.title || (updatedList as any).name || c.title,
            };
          }
          return c;
        })
      );
    };

    const handleListDeleted = ({ listId }: { listId: string }) => {
      setColumns((prev) => prev.filter((c) => (c._id || c.id) !== listId));
      // Remove all tasks that belong to the deleted list
      setTasks((prev) =>
        prev.filter((t) => {
          const tListId = typeof t.listId === 'object' && t.listId !== null ? (t.listId as { _id?: string })._id : t.listId;
          return String(tListId) !== String(listId);
        })
      );
    };

    const handleListReordered = ({ listOrder }: { boardId: string; listOrder: string[] }) => {
      setColumns((prev) => {
        return [...prev].sort((a, b) => {
          const aId = a._id || a.id || '';
          const bId = b._id || b.id || '';
          return listOrder.indexOf(aId) - listOrder.indexOf(bId);
        });
      });
    };

    // Listeners bindings
    socket.on('board:presence', handlePresence);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:moved', handleTaskMoved);
    socket.on('list:created', handleListCreated);
    socket.on('list:updated', handleListUpdated);
    socket.on('list:deleted', handleListDeleted);
    socket.on('list:reordered', handleListReordered);

    return () => {
      socket.emit('board:leave', boardId);
      socket.off('board:presence', handlePresence);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:moved', handleTaskMoved);
      socket.off('list:created', handleListCreated);
      socket.off('list:updated', handleListUpdated);
      socket.off('list:deleted', handleListDeleted);
      socket.off('list:reordered', handleListReordered);
    };
  }, [isAuthenticated, boardId, setBoard, setColumns, setTasks, loadBoardData]);

  return { watchers };
};

export default useSocketBoard;
