import boardService from './board.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

class BoardController {
  createBoard = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const board = await boardService.createBoard(workspaceId, req.user._id, req.body);
    return ApiResponse.created(res, 'Board created successfully', board);
  });

  listBoards = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const result = await boardService.listBoards(workspaceId, req.user._id, req.query);
    return ApiResponse.success(res, 'Boards retrieved successfully', result);
  });

  getBoardDetails = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const board = await boardService.getBoardDetails(boardId, req.user._id);
    return ApiResponse.success(res, 'Board details retrieved successfully', board);
  });

  updateBoard = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const board = await boardService.updateBoard(boardId, req.user._id, req.body);
    return ApiResponse.success(res, 'Board updated successfully', board);
  });

  archiveBoard = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const board = await boardService.archiveBoard(boardId, req.user._id);
    return ApiResponse.success(res, 'Board archived successfully', board);
  });

  restoreBoard = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const board = await boardService.restoreBoard(boardId, req.user._id);
    return ApiResponse.success(res, 'Board restored successfully', board);
  });

  deleteBoard = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    await boardService.softDeleteBoard(boardId, req.user._id);
    return ApiResponse.success(res, 'Board deleted successfully', null);
  });

  starBoard = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    await boardService.starBoard(boardId, req.user._id);
    return ApiResponse.success(res, 'Board starred successfully', null);
  });

  unstarBoard = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    await boardService.unstarBoard(boardId, req.user._id);
    return ApiResponse.success(res, 'Board unstarred successfully', null);
  });
}

export default new BoardController();
