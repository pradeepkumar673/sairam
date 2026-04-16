import { Document, Model, Schema, model, Types } from "mongoose";

export interface IChatMessage extends Document {
  familyId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: "text" | "image" | "voice";
  mediaUrl?: string;
  replyTo?: Types.ObjectId;
  readBy: { userId: Types.ObjectId; readAt: Date }[];
  isDeleted: boolean;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    messageType: { type: String, enum: ["text", "image", "voice"], default: "text" },
    mediaUrl: { type: String },
    replyTo: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
    readBy: [{ userId: { type: Schema.Types.ObjectId, ref: "User" }, readAt: Date }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ChatMessage = model<IChatMessage>("ChatMessage", ChatMessageSchema);
export default ChatMessage;