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
  originalName: string;
  fileUrl: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
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

export interface Task {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: string;
  listId?: string;
  boardId?: string;
  dueDate?: string | null;
  assignees?: Array<string | TaskAssigneeUser>;
  labels?: Array<string | Label>;
  attachments?: number | TaskAttachmentItem[];
  comments?: number;
  checklist?: ChecklistItem[] | TaskChecklist;
  position?: number;
  createdBy?: string | TaskAssigneeUser;
  createdAt?: string | number;
  updatedAt?: string | number;
}

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
