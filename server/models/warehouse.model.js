import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const WarehouseSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  code: { type: String, required: true, unique: true, uppercase: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['main', 'distribution', 'transit', 'storage'], default: 'main' },
  city: String, country: String, address: String,
  managerName: String,
  capacityUnits: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active', index: true },
}, { timestamps: true, versionKey: false });

export const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', WarehouseSchema);
