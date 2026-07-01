import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema({
  _id: { type: String, default: 'workspace' },
  name: { type: String, default: 'My Workspace' },
  currency: { type: String, default: 'USD' },
  timezone: { type: String, default: 'UTC' },
  fiscalYearStart: { type: String, default: '01' },
  logoUrl: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

export const Workspace = mongoose.model('Workspace', WorkspaceSchema);