import { Workspace } from '../models/workspace.model.js';

export const WorkspaceService = {
  async get() {
    let ws = await Workspace.findById('workspace').lean();
    if (!ws) {
      ws = await Workspace.create({ _id: 'workspace' });
      ws = ws.toObject();
    }
    return ws;
  },

  async update(fields) {
    const allowed = ['name', 'currency', 'timezone', 'fiscalYearStart', 'logoUrl'];
    const update = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) update[key] = fields[key];
    }
    update.updatedAt = new Date();
    return Workspace.findByIdAndUpdate('workspace', { $set: update }, { new: true, upsert: true }).lean();
  },
};