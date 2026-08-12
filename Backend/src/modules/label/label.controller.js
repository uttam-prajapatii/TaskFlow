import labelService from './label.service.js';
import ApiResponse from '../../utils/apiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

class LabelController {
  /**
   * Create a new label on a board.
   */
  createLabel = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const label = await labelService.createLabel(boardId, req.user._id, req.body);
    return ApiResponse.created(res, 'Label created successfully', label);
  });

  /**
   * Fetch all labels belonging to a board.
   */
  getLabels = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const labels = await labelService.getLabels(boardId, req.user._id);
    return ApiResponse.success(res, 'Labels retrieved successfully', labels);
  });

  /**
   * Update details of an existing label.
   */
  updateLabel = asyncHandler(async (req, res) => {
    const { labelId } = req.params;
    const label = await labelService.updateLabel(labelId, req.user._id, req.body);
    return ApiResponse.success(res, 'Label updated successfully', label);
  });

  /**
   * Delete an existing label.
   */
  deleteLabel = asyncHandler(async (req, res) => {
    const { labelId } = req.params;
    await labelService.deleteLabel(labelId, req.user._id);
    return ApiResponse.success(res, 'Label deleted successfully', null);
  });
}

export default new LabelController();
