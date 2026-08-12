import { Label } from './label.model.js';

class LabelRepository {
  async createLabel(labelData) {
    return Label.create(labelData);
  }

  async findLabelById(id) {
    return Label.findById(id).exec();
  }

  async findLabelsByBoard(boardId) {
    return Label.find({ boardId }).sort({ name: 1 }).exec();
  }

  async findLabelByNameAndBoard(name, boardId) {
    return Label.findOne({
      boardId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    }).exec();
  }

  async updateLabel(id, updateData) {
    return Label.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).exec();
  }

  async deleteLabel(id) {
    return Label.findByIdAndDelete(id).exec();
  }
}

export default new LabelRepository();
