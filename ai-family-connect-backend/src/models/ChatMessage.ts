import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Type of chat room / conversation */
export enum ChatRoomType {
  FAMILY_GROUP  = "family_group",   // All family members in one room
  DIRECT        = "direct",         // 1-on-1 private conversation
  CARE_CIRCLE   = "care_circle",    // Designated carers of one elder
  ANNOUNCEMENT  = "announcement",   // One-way broadcasts from family admin
}

/** Content type carried by the message */
export enum MessageType {
  TEXT       = "text",
  IMAGE      = "image",
  VIDEO      = "video",
  AUDIO      = "audio",           // Voice note
  DOCUMENT   = "document",
  LOCATION   = "location",        // Share live location pin
  STICKER    = "sticker",
  SOS_ALERT  = "sos_alert",       // System message — SOS raised
  MEDICINE_REMINDER = "medicine_reminder", // System reminder card
  MOOD_UPDATE = "mood_update",    // System mood notification
  SYSTEM     = "system",          // Generic system/bot message
}

/** Delivery/read state of the message */
export enum MessageStatus {
  SENT      = "sent",        // Stored on server
  DELIVERED = "delivered",   // Delivered to at least one recipient device
  READ      = "read",        // Read by all intended recipients
  FAILED    = "failed",      // Delivery failed
}

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/** File/media attachment metadata */
export interface IMessageAttachment {
  url:       string;           // CDN or local upload path
  filename:  string;
  mimeType:  string;
  sizeBytes: number;
  width?:    number;           // For images/videos
  height?:   number;
  duration?: number;           // Seconds, for audio/video
  thumbnailUrl?: string;
}

/** Location pin shared in chat */
export interface IMessageLocation {
  type: "Point";
  coordinates: [number, number];
  label?: string;             // "I'm here", "Meet me here", etc.
  address?: string;
}

/** Per-recipient delivery & read receipts */
export interface IReadReceipt {
  userId:      Types.ObjectId;
  deliveredAt?: Date;
  readAt?:     Date;
}

/** Inline reaction on a message */
export interface IMessageReaction {
  userId: Types.ObjectId;
  emoji:  string;              // e.g. "❤️", "😂", "👍"
  reactedAt: Date;
}

/** Reference to a quoted/replied-to message */
export interface IReplyReference {
  messageId:    Types.ObjectId;
  senderName:   string;
  previewText:  string;        // Truncated preview of quoted message
  messageType:  MessageType;
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IChatMessage extends Document {
  /** Family group this message belongs to */
  familyId: Types.ObjectId;

  /** Room/conversation identifier */
  roomId: string;             // "${familyId}_family" | "${userId1}_${userId2}_dm"
  roomType: ChatRoomType;

  /** Who sent this message */
  senderId: Types.ObjectId;

  // ── Content ─────────────────────────────────────────────
  type:        MessageType;
  text?:       string;        // Present for TEXT type (and caption for media)
  attachment?: IMessageAttachment;
  location?:   IMessageLocation;

  // ── Threading ───────────────────────────────────────────
  replyTo?: IReplyReference;  // If this is a reply to another message

  // ── AI Translation / Accessibility ──────────────────────
  /** AI-translated version of the text (for multilingual families) */
  translatedText?: Map<string, string>;   // { "ta": "...", "hi": "...", "en": "..." }

  /** TTS audio URL (generated for elders who have difficulty reading) */
  ttsAudioUrl?: string;

  // ── Reactions ───────────────────────────────────────────
  reactions: IMessageReaction[];

  // ── Delivery ────────────────────────────────────────────
  status:       MessageStatus;
  readReceipts: IReadReceipt[];

  // ── Moderation ──────────────────────────────────────────
  isEdited:    boolean;
  editedAt?:   Date;
  editHistory: string[];       // Previous text versions

  isDeleted:   boolean;        // Soft-delete (shows "This message was deleted")
  deletedAt?:  Date;
  deletedBy?:  Types.ObjectId;

  /** Flagged by AI/family-admin for inappropriate content */
  isFlagged:   boolean;
  flagReason?: string;

  // ── System message data (for non-text message types) ────
  systemPayload?: Record<string, unknown>;  // SOSAlert ID, MedicineLog ID, etc.

  // ── Pinned messages ─────────────────────────────────────
  isPinned:   boolean;
  pinnedBy?:  Types.ObjectId;
  pinnedAt?:  Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // ── Instance Methods ──────────────────────────────────────
  markReadBy(userId: Types.ObjectId): Promise<IChatMessage>;
  addReaction(userId: Types.ObjectId, emoji: string): Promise<IChatMessage>;
  removeReaction(userId: Types.ObjectId): Promise<IChatMessage>;
}

/** Static helpers on ChatMessage */
export interface IChatMessageModel extends Model<IChatMessage> {
  getRoomHistory(roomId: string, limit?: number, before?: Date): Promise<IChatMessage[]>;
  getUnreadCount(roomId: string, userId: Types.ObjectId): Promise<number>;
  getLastMessage(roomId: string): Promise<IChatMessage | null>;
  getPinnedMessages(roomId: string): Promise<IChatMessage[]>;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const AttachmentSchema = new Schema<IMessageAttachment>(
  {
    url:          { type: String, required: true },
    filename:     { type: String, required: true, maxlength: 255 },
    mimeType:     { type: String, required: true },
    sizeBytes:    { type: Number, required: true, min: 0 },
    width:        { type: Number },
    height:       { type: Number },
    duration:     { type: Number },
    thumbnailUrl: { type: String },
  },
  { _id: false }
);

const MessageLocationSchema = new Schema<IMessageLocation>(
  {
    type:        { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
    label:       { type: String, maxlength: 100 },
    address:     { type: String, maxlength: 300 },
  },
  { _id: false }
);

const ReadReceiptSchema = new Schema<IReadReceipt>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    deliveredAt: { type: Date },
    readAt:      { type: Date },
  },
  { _id: false }
);

const MessageReactionSchema = new Schema<IMessageReaction>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji:     { type: String, required: true, maxlength: 10 },
    reactedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReplyReferenceSchema = new Schema<IReplyReference>(
  {
    messageId:   { type: Schema.Types.ObjectId, ref: "ChatMessage", required: true },
    senderName:  { type: String, required: true, maxlength: 100 },
    previewText: { type: String, maxlength: 200 },
    messageType: { type: String, enum: Object.values(MessageType) },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const ChatMessageSchema = new Schema<IChatMessage, IChatMessageModel>(
  {
    // ── Room & Sender ─────────────────────────────────────
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    roomId:   { type: String, required: true, index: true, maxlength: 200 },
    roomType: {
      type: String, enum: Object.values(ChatRoomType),
      required: true, default: ChatRoomType.FAMILY_GROUP,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // ── Content ───────────────────────────────────────────
    type: {
      type: String, enum: Object.values(MessageType),
      required: true, default: MessageType.TEXT,
    },
    text:           { type: String, maxlength: [5000, "Message cannot exceed 5000 characters"] },
    attachment:     { type: AttachmentSchema },
    location:       { type: MessageLocationSchema },
    replyTo:        { type: ReplyReferenceSchema },

    // ── AI features ───────────────────────────────────────
    translatedText: { type: Map, of: String },
    ttsAudioUrl:    { type: String },

    // ── Reactions ─────────────────────────────────────────
    reactions: { type: [MessageReactionSchema], default: [] },

    // ── Delivery ──────────────────────────────────────────
    status:       { type: String, enum: Object.values(MessageStatus), default: MessageStatus.SENT },
    readReceipts: { type: [ReadReceiptSchema], default: [] },

    // ── Moderation ────────────────────────────────────────
    isEdited:    { type: Boolean, default: false },
    editedAt:    { type: Date },
    editHistory: { type: [String], default: [] },

    isDeleted:   { type: Boolean, default: false },
    deletedAt:   { type: Date },
    deletedBy:   { type: Schema.Types.ObjectId, ref: "User" },

    isFlagged:   { type: Boolean, default: false, index: true },
    flagReason:  { type: String, maxlength: 200 },

    // ── System payload ────────────────────────────────────
    systemPayload: { type: Schema.Types.Mixed },

    // ── Pinning ───────────────────────────────────────────
    isPinned:  { type: Boolean, default: false },
    pinnedBy:  { type: Schema.Types.ObjectId, ref: "User" },
    pinnedAt:  { type: Date },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
ChatMessageSchema.index({ roomId: 1, createdAt: -1 });          // Pagination
ChatMessageSchema.index({ familyId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1, roomId: 1 });
ChatMessageSchema.index({ roomId: 1, isPinned: 1 });
ChatMessageSchema.index({ roomId: 1, isDeleted: 1, createdAt: -1 });
ChatMessageSchema.index({ "readReceipts.userId": 1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────

ChatMessageSchema.methods.markReadBy = async function (
  this: IChatMessage,
  userId: Types.ObjectId
): Promise<IChatMessage> {
  const receipt = this.readReceipts.find(
    (r) => r.userId.toString() === userId.toString()
  );
  const now = new Date();
  if (receipt) {
    if (!receipt.deliveredAt) receipt.deliveredAt = now;
    if (!receipt.readAt) receipt.readAt = now;
  } else {
    this.readReceipts.push({ userId, deliveredAt: now, readAt: now });
  }
  return this.save();
};

ChatMessageSchema.methods.addReaction = async function (
  this: IChatMessage,
  userId: Types.ObjectId,
  emoji: string
): Promise<IChatMessage> {
  // Remove existing reaction from this user first
  this.reactions = this.reactions.filter(
    (r) => r.userId.toString() !== userId.toString()
  );
  this.reactions.push({ userId, emoji, reactedAt: new Date() });
  return this.save();
};

ChatMessageSchema.methods.removeReaction = async function (
  this: IChatMessage,
  userId: Types.ObjectId
): Promise<IChatMessage> {
  this.reactions = this.reactions.filter(
    (r) => r.userId.toString() !== userId.toString()
  );
  return this.save();
};

// ─── Static Methods ───────────────────────────────────────────────────────────

ChatMessageSchema.statics.getRoomHistory = function (
  roomId: string,
  limit: number = 50,
  before?: Date
) {
  const query: Record<string, unknown> = { roomId, isDeleted: false };
  if (before) query.createdAt = { $lt: before };

  return this.find(query)
    .populate("senderId", "firstName lastName avatar role")
    .sort({ createdAt: -1 })
    .limit(limit);
};

ChatMessageSchema.statics.getUnreadCount = async function (
  roomId: string,
  userId: Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    roomId,
    isDeleted: false,
    senderId: { $ne: userId },
    "readReceipts": {
      $not: {
        $elemMatch: { userId, readAt: { $exists: true } },
      },
    },
  });
};

ChatMessageSchema.statics.getLastMessage = function (roomId: string) {
  return this.findOne({ roomId, isDeleted: false })
    .sort({ createdAt: -1 })
    .populate("senderId", "firstName lastName");
};

ChatMessageSchema.statics.getPinnedMessages = function (roomId: string) {
  return this.find({ roomId, isPinned: true, isDeleted: false })
    .populate("senderId", "firstName lastName avatar")
    .sort({ pinnedAt: -1 });
};

// ─── Export ───────────────────────────────────────────────────────────────────
const ChatMessage = model<IChatMessage, IChatMessageModel>("ChatMessage", ChatMessageSchema);
export default ChatMessage;
