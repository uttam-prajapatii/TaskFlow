import React, { useState } from 'react';
import Modal from '../../../components/UI/Modal';
import Icon from '../../../components/UI/Icon';
import { boardService } from '../../../services/board.service';
import { taskService } from '../../../services/task.service';
import type { Board, Task } from '../types';
import { toast } from 'sonner';

interface ArchivedItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedBoards?: Board[];
  archivedTasks?: Task[];
  onItemRestored?: () => void;
}

export const ArchivedItemsModal: React.FC<ArchivedItemsModalProps> = ({
  isOpen,
  onClose,
  archivedBoards = [],
  archivedTasks = [],
  onItemRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'boards' | 'tasks'>('tasks');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestoreBoard = async (boardId: string) => {
    try {
      setRestoringId(boardId);
      await boardService.restoreBoard(boardId);
      toast.success('Board restored successfully');
      if (onItemRestored) onItemRestored();
    } catch {
      toast.error('Failed to restore board');
    } finally {
      setRestoringId(null);
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    try {
      setRestoringId(taskId);
      await taskService.restoreTask(taskId);
      toast.success('Task restored successfully');
      if (onItemRestored) onItemRestored();
    } catch {
      toast.error('Failed to restore task');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} width={640}>
      <div className="p-6 text-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-semibold text-white">Archived Items & Trash Bin</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-2.5 px-4 font-medium text-sm border-b-2 transition ${
              activeTab === 'tasks'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived Tasks ({archivedTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('boards')}
            className={`pb-2.5 px-4 font-medium text-sm border-b-2 transition ${
              activeTab === 'boards'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived Boards ({archivedBoards.length})
          </button>
        </div>

        {activeTab === 'tasks' && (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {archivedTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <Icon name="archive" className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                No archived tasks found.
              </div>
            ) : (
              archivedTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition"
                >
                  <div>
                    <h4 className="font-medium text-slate-200 text-sm">{task.title}</h4>
                    <span className="text-xs text-slate-500">
                      Priority: <span className="capitalize text-slate-400">{task.priority}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => handleRestoreTask(task._id)}
                    disabled={restoringId === task._id}
                    className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-lg transition border border-indigo-500/20 disabled:opacity-50"
                  >
                    {restoringId === task._id ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'boards' && (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {archivedBoards.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <Icon name="archive" className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                No archived boards found.
              </div>
            ) : (
              archivedBoards.map((board) => (
                <div
                  key={board._id}
                  className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition"
                >
                  <div>
                    <h4 className="font-medium text-slate-200 text-sm">{board.name}</h4>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{board.description || 'No description'}</p>
                  </div>
                  <button
                    onClick={() => handleRestoreBoard(board._id)}
                    disabled={restoringId === board._id}
                    className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-lg transition border border-indigo-500/20 disabled:opacity-50"
                  >
                    {restoringId === board._id ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ArchivedItemsModal;
