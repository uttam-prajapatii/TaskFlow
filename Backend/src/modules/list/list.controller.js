import listService from './list.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

class ListController {
  createList = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const list = await listService.createList(boardId, req.user._id, req.body);
    return ApiResponse.created(res, 'List created successfully', list);
  });

  getLists = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const lists = await listService.getLists(boardId, req.user._id);
    return ApiResponse.success(res, 'Lists retrieved successfully', lists);
  });

  renameList = asyncHandler(async (req, res) => {
    const { listId } = req.params;
    const list = await listService.renameList(listId, req.user._id, req.body.name);
    return ApiResponse.success(res, 'List renamed successfully', list);
  });

  reorderList = asyncHandler(async (req, res) => {
    const { listId } = req.params;
    const list = await listService.reorderList(listId, req.user._id, req.body.position);
    return ApiResponse.success(res, 'List reordered successfully', list);
  });

  deleteList = asyncHandler(async (req, res) => {
    const { listId } = req.params;
    await listService.deleteList(listId, req.user._id);
    return ApiResponse.success(res, 'List deleted successfully', null);
  });

  archiveList = asyncHandler(async (req, res) => {
    const { listId } = req.params;
    const list = await listService.archiveList(listId, req.user._id);
    return ApiResponse.success(res, 'List archived successfully', list);
  });

  restoreList = asyncHandler(async (req, res) => {
    const { listId } = req.params;
    const list = await listService.restoreList(listId, req.user._id);
    return ApiResponse.success(res, 'List restored successfully', list);
  });
}

export default new ListController();
