import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const AiMessageSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  citations: [{
    label: String, kind: String, value: mongoose.Schema.Types.Mixed,
  }],
  tokens: Number,
  at: { type: Date, default: Date.now },
}, { _id: false });

const AiConversationSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: { type: String, index: true },
  userName: String,
  title: { type: String, default: 'New conversation' },
  messages: [AiMessageSchema],
}, { timestamps: true, versionKey: false });

export const AiConversation = mongoose.models.AiConversation || mongoose.model('AiConversation', AiConversationSchema);
