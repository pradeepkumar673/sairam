/**
 * models/ChatMessage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Family group chat messages — Feature 19 (Family Chat Group).
 *
 * Supports:
 *  - Text messages
 *  - Image messages (photo uploads via chatMediaUpload)
 *  - Voice messages (audio recordings)
 *  - Soft delete (isDeleted flag — content replaced, not removed from DB)
 *  - Read receipts (readBy array with userId + readAt timestamp)
 *  - Reply threading (replyTo → parent message ID)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Supported message content types */
export enum MessageType {
  TEXT  = "text",
  IMAGE = "image",
  VOICE = "voice",
}

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/** Read receipt — who read the message and when */
export interface IReadReceipt {
  userId: Types.ObjectId;
  readAt: Date;
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IChatMessage extends Document {
  /** Family group this message belongs to */
  familyId: Types.ObjectId;

  /** User who sent the message */
  senderId: Types.ObjectId;

  // ── Content ─────────────────────────────────────────────
  /** Primary text content (required for text; optional caption for image/voice) */
  content: string;

  /** Type of message — affects how the frontend renders it */
  messageType: MessageType;

  /**
   * URL to the uploaded media asset.
   * Populated by chatMediaUpload middleware for image/voice messages.
   * Null for text-only messages.
   */
  mediaUrl: string | null;

  /** Duration of voice message in seconds (voice type only) */
  voiceDurationSeconds?: number;

  // ── Threading ───────────────────────────────────────────
  /** Parent message this is a reply to (optional) */
  replyTo?: Types.ObjectId;

  // ── Read Receipts ───────────────────────────────────────
  /** Array of read receipts — one entry per reader */
  readBy: IReadReceipt[];

  // ── Soft Delete ─────────────────────────────────────────
  isDeleted: boolean;
  /** Timestamp when the message was deleted */
  deletedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // ── Instance Methods ──────────────────────────────────────
  markRead(userId: Types.ObjectId): Promise<IChatMessage>;
}

/** Static helpers on ChatMessage */
export interface IChatMessageModel extends Model<IChatMessage> {
  /** Paginated family chat history (newest first) */
  getFamilyChat(
    familyId: Types.ObjectId,
    page?: number,
    limit?: number
  ): Promise<IChatMessage[]>;

  /** Count unread messages for a user in a family */
  getUnreadCount(familyId: Types.ObjectId, userId: Types.ObjectId): Promise<number>;
}

// ─── Sub-document Schema ──────────────────────────────────────────────────────

const ReadReceiptSchema = new Schema<IReadReceipt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const ChatMessageSchema = new Schema<IChatMessage, IChatMessageModel>(
  {
    // ── References ────────────────────────────────────────
    familyId: {
      type: Schema.Types.ObjectId, ref: "Family",
      required: [true, "Family ID is required"], index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId, ref: "User",
      required: [true, "Sender ID is required"],
    },

    // ── Content ───────────────────────────────────────────
    content: {
      type: String, required: [true, "Message content is required"],
      trim: true, maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    messageType: {
      type: String, enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    mediaUrl:              { type: String,  default: null },
    voiceDurationSeconds:  { type: Number,  min: 0 },

    // ── Threading ─────────────────────────────────────────
    replyTo: { type: Schema.Types.ObjectId, ref: "ChatMessage" },

    // ── Read Receipts ─────────────────────────────────────
    readBy: { type: [ReadReceiptSchema], default: [] },

    // ── Soft Delete ───────────────────────────────────────
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Replace deleted message content with a placeholder
        if (ret.isDeleted) {
          ret.content  = "This message was deleted.";
          ret.mediaUrl = null;
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/** Primary query: get chat history for a family, newest first */
ChatMessageSchema.index({ familyId: 1, createdAt: -1 });

/** Find unread messages efficiently: not read by userId, not deleted */
ChatMessageSchema.index({ familyId: 1, "readBy.userId": 1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Mark this message as read by a given user.
 * Idempotent — calling multiple times is safe.
 */
ChatMessageSchema.methods.markRead = async function (
  this: IChatMessage,
  userId: Types.ObjectId
): Promise<IChatMessage> {
  const alreadyRead = this.readBy.some(
    (r) => r.userId.toString() === userId.toString()
  );
  if (!alreadyRead) {
    this.readBy.push({ userId, readAt: new Date() });
    await this.save();
  }
  return this;
};

// ─── Static Methods ───────────────────────────────────────────────────────────

ChatMessageSchema.statics.getFamilyChat = function (
  familyId: Types.ObjectId,
  page: number = 1,
  limit: number = 30
): Promise<IChatMessage[]> {
  return this.find({ familyId })
    .populate("senderId", "firstName lastName avatar familyNickname role")
    .populate("replyTo", "content senderId messageType")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

ChatMessageSchema.statics.getUnreadCount = async function (
  familyId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    familyId,
    isDeleted: false,
    "readBy.userId": { $ne: userId },
    senderId:         { $ne: userId },  // Don't count own messages
  });
};

// ─── Export ───────────────────────────────────────────────────────────────────
const ChatMessage = model<IChatMessage, IChatMessageModel>("ChatMessage", ChatMessageSchema);
export default ChatMessage;
