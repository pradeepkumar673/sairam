/**
 * models/ChatMessage.ts
 * Family group chat messages
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IChatMessage extends Document {
  familyId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  messageType: "text" | "image" | "voice";
  mediaUrl: string | null;
  readBy: mongoose.Types.ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    messageType: { type: String, enum: ["text", "image", "voice"], default: "text" },
    mediaUrl: { type: String, default: null },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for fast family chat queries
ChatMessageSchema.index({ familyId: 1, createdAt: -1 });

export default mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
