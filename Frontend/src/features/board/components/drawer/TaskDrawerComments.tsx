import React from 'react';
import Icon from '../../../../components/UI/Icon';
import Avatar from '../../../../components/UI/Avatar';
import { formatRelativeTime } from '../../../../utils/date';
import { renderCommentBody } from '../../../../utils/text';
import MentionCommentInput from '../MentionCommentInput';
import type { Comment } from '../../../../services/comment.service';
import type { User } from '../../../auth/types';

interface TaskDrawerCommentsProps {
  comments: Comment[];
  isLoadingComments: boolean;
  isErrorComments: boolean;
  onRefetchComments: () => void;
  currentUser: User | null;
  workspaceId?: string;
  creatorName: string;
  taskCreatedAtStr?: string;
  editingCommentId: string | null;
  editingBody: string;
  setEditingBody: (body: string) => void;
  setEditingCommentId: (id: string | null) => void;
  onStartEdit: (c: Comment) => void;
  onSaveEdit: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onAddComment: (body: string, mentions: string[]) => void;
  isPostingComment: boolean;
  isUpdatingComment: boolean;
  isDeletingComment: boolean;
}

export const TaskDrawerComments: React.FC<TaskDrawerCommentsProps> = ({
  comments,
  isLoadingComments,
  isErrorComments,
  onRefetchComments,
  currentUser,
  workspaceId,
  creatorName,
  taskCreatedAtStr,
  editingCommentId,
  editingBody,
  setEditingBody,
  setEditingCommentId,
  onStartEdit,
  onSaveEdit,
  onDeleteComment,
  onAddComment,
  isPostingComment,
  isUpdatingComment,
  isDeletingComment,
}) => {
  return (
    <>
      {/* Activity & Real Comments Section */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1 font-medium">
            <Icon name="clock" size={12} /> Activity & Comments ({comments.length + 1})
          </p>
        </div>

        <div className="space-y-3 text-[12px]">
          {/* Task Creation Log */}
          <div className="flex gap-2 items-start">
            <Avatar name={creatorName} size={20} ring={false} />
            <div className="flex-1 min-w-0">
              <p className="text-neutral-500 dark:text-neutral-400 leading-normal">
                <span className="text-neutral-700 dark:text-neutral-200 font-medium">
                  {creatorName}
                </span>{' '}
                created this task
              </p>
              {taskCreatedAtStr && (
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                  {formatRelativeTime(String(taskCreatedAtStr))}
                </p>
              )}
            </div>
          </div>

          {/* Loading Comments */}
          {isLoadingComments ? (
            <div className="space-y-2 py-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex gap-2 bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 animate-pulse"
                >
                  <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : isErrorComments ? (
            <div className="p-3 text-center bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50">
              <p className="text-[12px] text-rose-600 dark:text-rose-400">
                Failed to load comments
              </p>
              <button
                type="button"
                onClick={onRefetchComments}
                className="mt-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-3 text-center text-neutral-400 dark:text-neutral-500 text-[12px] italic">
              No comments yet. Be the first to leave a comment!
            </div>
          ) : (
            comments.map((c) => {
              const authorObj =
                typeof c.authorId === 'object' && c.authorId !== null ? c.authorId : null;
              const authorIdStr = authorObj ? authorObj._id : String(c.authorId);
              const authorName = authorObj
                ? authorObj.fullName || authorObj.email
                : 'Teammate';
              const isAuthor = currentUser && String(currentUser._id) === String(authorIdStr);

              return (
                <div
                  key={c._id}
                  className="group relative flex gap-2.5 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800"
                >
                  <Avatar name={authorName} size={24} ring={false} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-neutral-800 dark:text-neutral-200 font-semibold text-[12px]">
                        {authorName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {formatRelativeTime(c.createdAt)}
                        </span>
                        {isAuthor && editingCommentId !== c._id && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onStartEdit(c)}
                              className="p-0.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                              title="Edit comment"
                            >
                              <Icon name="edit" size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteComment(c._id)}
                              disabled={isDeletingComment}
                              className="p-0.5 rounded text-neutral-400 hover:text-rose-500 cursor-pointer"
                              title="Delete comment"
                            >
                              <Icon name="trash-2" size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingCommentId === c._id ? (
                      <div className="space-y-2 mt-1">
                        <textarea
                          value={editingBody}
                          onChange={(e) => setEditingBody(e.target.value)}
                          className="w-full p-2 text-[12.5px] rounded-lg border border-orange-300 dark:border-orange-500/40 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none resize-none focus:ring-2 focus:ring-orange-400/30"
                          rows={2}
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="px-2.5 py-1 text-[11px] rounded-md font-medium text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => onSaveEdit(c._id)}
                            disabled={isUpdatingComment || !editingBody.trim()}
                            className="px-2.5 py-1 text-[11px] rounded-md font-semibold text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-[12.5px] break-words">
                        {renderCommentBody(c.body)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Comment Input Form with @Mention Autocomplete */}
      <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <MentionCommentInput
          workspaceId={workspaceId}
          onSubmit={onAddComment}
          disabled={isPostingComment}
        />
      </div>
    </>
  );
};

export default TaskDrawerComments;
