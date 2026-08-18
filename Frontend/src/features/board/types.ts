export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export interface ChecklistItem {
  _id?: string;
  id?: string;
  text: string;
  isDone: boolean;
}

export interface TaskChecklist {
  done: number;
  total: number;
}

export interface TaskAttachmentItem {
  _id: string;
  id?: string;
  taskId?: string;
  fileName?: string;
  originalName?: string;
  fileUrl?: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  size?: number;
  storageKey?: string;
  uploadedBy?: string | { _id: string; fullName?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface Label {
  _id: string;
  id?: string;
  boardId: string;
  name: string;
  color?: string;
  createdAt?: string;
}

export interface TaskAssigneeUser {
  _id: string;
  fullName?: string;
  email?: string;
  name?: string;
}

export interface TaskPopulatedBoard {
  _id: string;
  name: string;
  workspaceId?: string | {
    _id: string;
    name: string;
    color?: string;
    logoUrl?: string;
    slug?: string;
  };
}

export interface TaskPopulatedList {
  _id: string;
  name?: string;
  title?: string;
}

export interface Task {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: string;
  listId?: string | TaskPopulatedList;
  boardId?: string | TaskPopulatedBoard;
  dueDate?: string | null;
  assignees?: Array<string | TaskAssigneeUser>;
  labels?: Array<string | Label>;
  attachments?: number | TaskAttachmentItem[];
  comments?: number;
  checklist?: ChecklistItem[] | TaskChecklist;
  position?: number;
  isCompleted?: boolean;
  createdBy?: string | TaskAssigneeUser;
  createdAt?: string | number;
  updatedAt?: string | number;
  workspaceId?: string | {
    _id: string;
    name: string;
  };
}

export const isTaskDone = (task?: Task | null): boolean => {
  if (!task) return false;
  if (task.isCompleted === true || task.status === 'done') return true;
  if (typeof task.listId === 'object' && task.listId !== null) {
    const listName = (task.listId.name || task.listId.title || '').toLowerCase();
    return listName.includes('done') || listName.includes('completed');
  }
  return false;
};

export interface BoardList {
  _id: string;
  id?: string;
  title: string;
  boardId: string;
  position?: number;
  order?: number;
  color?: string;
  createdAt?: string;
}

export interface Board {
  _id: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  workspaceId: string | { _id: string; name?: string };
  ownerId?: string;
  isArchived?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateBoardPayload {
  name: string;
  title?: string;
  description?: string;
  workspaceId?: string;
  color?: string;
}

export interface UpdateBoardPayload {
  name?: string;
  description?: string;
}

export interface CreateListPayload {
  name: string;
  boardId: string;
  position?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: PriorityLevel;
  status?: string;
  dueDate?: string | null;
  labels?: string[];
  assignees?: string[];
  position?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: PriorityLevel;
  status?: string;
  listId?: string;
  dueDate?: string | null;
  labels?: string[];
  assignees?: string[];
}

export interface MoveTaskPayload {
  targetListId: string;
  listId?: string;
  targetPosition?: number;
  position?: number;
}

export interface ActivityLog {
  _id: string;
  workspaceId: string;
  actorId: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
  action: string;
  entityType: string;
  entityId: string;
  metadata?: {
    title?: string;
    updatedFields?: string[];
    fromListName?: string;
    toListName?: string;
  };
  createdAt: string;
}
