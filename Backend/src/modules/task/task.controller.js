import taskService from './task.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

class TaskController {
  createTask = asyncHandler(async (req, res) => {
    const { listId } = req.params;
    const task = await taskService.createTask(listId, req.user._id, req.body);
    return ApiResponse.created(res, 'Task created successfully', task);
  });

  getTasks = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const tasks = await taskService.getTasks(boardId, req.user._id, req.query);
    return ApiResponse.success(res, 'Tasks retrieved successfully', tasks);
  });

  getTaskDetails = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const task = await taskService.getTaskDetails(taskId, req.user._id);
    return ApiResponse.success(res, 'Task retrieved successfully', task);
  });

  updateTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const task = await taskService.updateTask(taskId, req.user._id, req.body);
    return ApiResponse.success(res, 'Task updated successfully', task);
  });

  moveTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const task = await taskService.moveTask(taskId, req.user._id, req.body);
    return ApiResponse.success(res, 'Task moved successfully', task);
  });

  deleteTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    await taskService.deleteTask(taskId, req.user._id);
    return ApiResponse.success(res, 'Task deleted successfully', null);
  });

  archiveTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const task = await taskService.archiveTask(taskId, req.user._id);
    return ApiResponse.success(res, 'Task archived successfully', task);
  });

  restoreTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const task = await taskService.restoreTask(taskId, req.user._id);
    return ApiResponse.success(res, 'Task restored successfully', task);
  });

  checklistOperation = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const task = await taskService.checklistOperation(taskId, req.user._id, req.body);
    return ApiResponse.success(res, 'Checklist updated successfully', task);
  });

  addAssignee = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const task = await taskService.addAssignee(taskId, req.user._id, req.body.userId);
    return ApiResponse.success(res, 'Assignee added successfully', task);
  });

  removeAssignee = asyncHandler(async (req, res) => {
    const { taskId, userId } = req.params;
    const task = await taskService.removeAssignee(taskId, req.user._id, userId);
    return ApiResponse.success(res, 'Assignee removed successfully', task);
  });

  searchTasks = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const tasks = await taskService.searchTasks(boardId, req.user._id, req.query);
    return ApiResponse.success(res, 'Search completed successfully', tasks);
  });

  uploadAttachment = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const attachment = await taskService.uploadAttachment(taskId, req.user._id, req.file);
    return ApiResponse.created(res, 'Attachment uploaded successfully', attachment);
  });

  deleteAttachment = asyncHandler(async (req, res) => {
    const { taskId, attachmentId } = req.params;
    await taskService.deleteAttachment(taskId, attachmentId, req.user._id);
    return ApiResponse.success(res, 'Attachment deleted successfully', null);
  });

  addLabel = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { labelId } = req.body;
    const task = await taskService.addLabelToTask(taskId, req.user._id, labelId);
    return ApiResponse.success(res, 'Label attached to task successfully', task);
  });

  removeLabel = asyncHandler(async (req, res) => {
    const { taskId, labelId } = req.params;
    const task = await taskService.removeLabelFromTask(taskId, req.user._id, labelId);
    return ApiResponse.success(res, 'Label removed from task successfully', task);
  });

  getAssignedTasks = asyncHandler(async (req, res) => {
    const tasks = await taskService.getAssignedTasks(req.user._id, req.query);
    return ApiResponse.success(res, 'Assigned tasks retrieved successfully', tasks);
  });
}

export default new TaskController();
