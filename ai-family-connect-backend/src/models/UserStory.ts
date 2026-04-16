import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * Life chapter / theme categorisation.
 * Used to organise stories chronologically and thematically.
 */
export enum StoryChapter {
  CHILDHOOD       = "childhood",
  YOUTH           = "youth",
  EDUCATION       = "education",
  CAREER          = "career",
  ROMANCE         = "romance",
  MARRIAGE        = "marriage",
  PARENTHOOD      = "parenthood",
  GRANDPARENTHOOD = "grandparenthood",
  TRAVEL          = "travel",
  HOBBIES         = "hobbies",
  ACHIEVEMENTS    = "achievements",
  CHALLENGES      = "challenges",
  TRADITIONS      = "traditions",
  WISDOM          = "wisdom",        // Advice/lessons the elder wants to pass on
  RECENT          = "recent",        // Recent day-to-day stories
  OTHER           = "other",
}

/** How the story was captured */
export enum StoryInputMethod {
  TYPED       = "typed",          // User typed the story
  VOICE       = "voice",          // Recorded audio → transcribed
  AI_PROMPTED = "ai_prompted",    // AI Companion prompted a memory via question
  PHOTO       = "photo",          // Attached photo, caption becomes story
  IMPORTED    = "imported",       // Imported from another source
}

/** Audience/visibility level for the story */
export enum StoryVisibility {
  PRIVATE        = "private",        // Only the author sees it
  FAMILY_ONLY    = "family_only",    // All linked family members
  SELECTED       = "selected",       // Only specific family members
  LEGACY         = "legacy",         // Archived for future generations
}

/** Story media asset type */
export enum MediaAssetType {
  IMAGE    = "image",
  AUDIO    = "audio",
  VIDEO    = "video",
  DOCUMENT = "document",
}

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/** Media file attached to a story */
export interface IStoryMediaAsset {
  type:         MediaAssetType;
  url:          string;            // Upload path or CDN URL
  filename:     string;
  caption?:     string;
  takenAt?:     Date;              // Date the photo/video was taken (EXIF or user input)
  location?:    string;            // Where was this taken (free text)
  sizeBytes?:   number;
  thumbnailUrl?: string;
}

/** People mentioned in the story */
export interface IStoryPerson {
  name:         string;
  relationship?: string;           // "mother", "childhood friend", etc.
  userId?:       Types.ObjectId;   // If they're also a registered user
  note?:         string;
}

/** AI enrichment applied to this story */
export interface IAIEnrichment {
  summary:          string;        // 1-2 sentence AI summary
  keyThemes:        string[];      // ["family", "resilience", "love"]
  detectedEmotion:  string;        // Overall emotional tone
  timePeriod?:      string;        // AI-inferred: "1960s", "early 1980s"
  suggestedTitle?:  string;        // AI-generated title if user left it blank
  relatedQuestions: string[];      // Follow-up questions AI could ask
  embeddingVector?: number[];      // Vector embedding for semantic search (future)
  processedAt:      Date;
}

/** Family member reaction to a story */
export interface IStoryReaction {
  userId:     Types.ObjectId;
  emoji:      string;
  comment?:   string;             // Short personal note/comment on the story
  reactedAt:  Date;
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IUserStory extends Document {
  /** The storyteller (typically an elder) */
  userId: Types.ObjectId;

  /** Family group — for sharing and discovery */
  familyId: Types.ObjectId;

  // ── Story Content ───────────────────────────────────────
  title:       string;
  content:     string;            // The main narrative text

  /** Original voice recording URL before transcription */
  voiceRecordingUrl?: string;

  /** AI-corrected / cleaned-up version of the voice transcript */
  transcribedContent?: string;

  // ── Categorisation ──────────────────────────────────────
  chapter:   StoryChapter;
  tags:      string[];            // User-defined free tags
  yearRange: {
    from?: number;                // Approx start year of the memory
    to?:   number;                // Approx end year
  };

  // ── Media ───────────────────────────────────────────────
  mediaAssets: IStoryMediaAsset[];
  coverImageUrl?: string;         // Displayed as story card thumbnail

  // ── People Mentioned ────────────────────────────────────
  peopleTagged: IStoryPerson[];

  // ── Input & Visibility ──────────────────────────────────
  inputMethod: StoryInputMethod;
  visibility:  StoryVisibility;
  visibleToMembers: Types.ObjectId[];  // Populated when visibility === "selected"

  // ── AI Enrichment ───────────────────────────────────────
  aiEnrichment?: IAIEnrichment;

  /** AI-generated follow-up question shown to continue the story */
  pendingAIQuestion?: string;

  // ── Reactions & Engagement ──────────────────────────────
  reactions: IStoryReaction[];
  viewCount: number;
  viewedBy:  Types.ObjectId[];

  // ── Legacy Flag ─────────────────────────────────────────
  /** Marked as a "legacy" story to preserve for future generations */
  isLegacy:     boolean;
  legacyMarkedBy?: Types.ObjectId;
  legacyMarkedAt?: Date;

  // ── AI Companion Session Tracking ───────────────────────
  /** Which AI conversation session produced this story (if prompted) */
  aiSessionId?: string;

  /** Which prompt/question from AI Companion triggered this story */
  aiPromptQuestion?: string;

  // ── Edit History ────────────────────────────────────────
  isEdited:    boolean;
  editHistory: { content: string; editedAt: Date }[];

  // Soft delete
  isDeleted:   boolean;
  deletedAt?:  Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // ── Instance Methods ──────────────────────────────────────
  addReaction(userId: Types.ObjectId, emoji: string, comment?: string): Promise<IUserStory>;
  markViewed(userId: Types.ObjectId): Promise<IUserStory>;
}

/** Static helpers on UserStory */
export interface IUserStoryModel extends Model<IUserStory> {
  getFamilyStoryFeed(familyId: Types.ObjectId, page?: number, limit?: number): Promise<IUserStory[]>;
  getUserStoryTimeline(userId: Types.ObjectId): Promise<IUserStory[]>;
  getLegacyStories(familyId: Types.ObjectId): Promise<IUserStory[]>;
  searchByTheme(familyId: Types.ObjectId, theme: string): Promise<IUserStory[]>;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const StoryMediaAssetSchema = new Schema<IStoryMediaAsset>(
  {
    type:         { type: String, enum: Object.values(MediaAssetType), required: true },
    url:          { type: String, required: true },
    filename:     { type: String, required: true, maxlength: 255 },
    caption:      { type: String, maxlength: 500 },
    takenAt:      { type: Date },
    location:     { type: String, maxlength: 200 },
    sizeBytes:    { type: Number },
    thumbnailUrl: { type: String },
  },
  { _id: true }
);

const StoryPersonSchema = new Schema<IStoryPerson>(
  {
    name:         { type: String, required: true, maxlength: 100 },
    relationship: { type: String, maxlength: 100 },
    userId:       { type: Schema.Types.ObjectId, ref: "User" },
    note:         { type: String, maxlength: 200 },
  },
  { _id: true }
);

const AIEnrichmentSchema = new Schema<IAIEnrichment>(
  {
    summary:          { type: String, maxlength: 1000 },
    keyThemes:        { type: [String], default: [] },
    detectedEmotion:  { type: String, maxlength: 50 },
    timePeriod:       { type: String, maxlength: 50 },
    suggestedTitle:   { type: String, maxlength: 150 },
    relatedQuestions: { type: [String], default: [] },
    embeddingVector:  { type: [Number], select: false }, // Hidden — used for search
    processedAt:      { type: Date, default: Date.now },
  },
  { _id: false }
);

const StoryReactionSchema = new Schema<IStoryReaction>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji:     { type: String, required: true, maxlength: 10 },
    comment:   { type: String, maxlength: 300 },
    reactedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const UserStorySchema = new Schema<IUserStory, IUserStoryModel>(
  {
    // ── References ────────────────────────────────────────
    userId:   { type: Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },

    // ── Core Content ──────────────────────────────────────
    title: {
      type: String, required: [true, "Story title is required"],
      trim: true, maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String, required: [true, "Story content is required"],
      maxlength: [20000, "Story cannot exceed 20,000 characters"],
    },
    voiceRecordingUrl:   { type: String },
    transcribedContent:  { type: String, maxlength: 20000 },

    // ── Categorisation ────────────────────────────────────
    chapter: {
      type: String, enum: Object.values(StoryChapter),
      default: StoryChapter.OTHER,
    },
    tags: { type: [String], default: [], index: true },
    yearRange: {
      from: { type: Number, min: 1900, max: new Date().getFullYear() },
      to:   { type: Number, min: 1900, max: new Date().getFullYear() },
    },

    // ── Media ─────────────────────────────────────────────
    mediaAssets:    { type: [StoryMediaAssetSchema], default: [] },
    coverImageUrl:  { type: String },

    // ── People ────────────────────────────────────────────
    peopleTagged: { type: [StoryPersonSchema], default: [] },

    // ── Input & Visibility ────────────────────────────────
    inputMethod: {
      type: String, enum: Object.values(StoryInputMethod),
      default: StoryInputMethod.TYPED,
    },
    visibility: {
      type: String, enum: Object.values(StoryVisibility),
      default: StoryVisibility.FAMILY_ONLY, index: true,
    },
    visibleToMembers: { type: [Schema.Types.ObjectId], ref: "User", default: [] },

    // ── AI ────────────────────────────────────────────────
    aiEnrichment:      { type: AIEnrichmentSchema },
    pendingAIQuestion: { type: String, maxlength: 500 },

    // ── Engagement ────────────────────────────────────────
    reactions: { type: [StoryReactionSchema], default: [] },
    viewCount: { type: Number, default: 0 },
    viewedBy:  { type: [Schema.Types.ObjectId], ref: "User", default: [] },

    // ── Legacy ────────────────────────────────────────────
    isLegacy:        { type: Boolean, default: false, index: true },
    legacyMarkedBy:  { type: Schema.Types.ObjectId, ref: "User" },
    legacyMarkedAt:  { type: Date },

    // ── AI Companion session ──────────────────────────────
    aiSessionId:       { type: String },
    aiPromptQuestion:  { type: String, maxlength: 500 },

    // ── Edits ─────────────────────────────────────────────
    isEdited:    { type: Boolean, default: false },
    editHistory: {
      type: [{ content: String, editedAt: { type: Date, default: Date.now } }],
      default: [],
      select: false,
    },

    // ── Soft Delete ───────────────────────────────────────
    isDeleted:  { type: Boolean, default: false, index: true },
    deletedAt:  { type: Date },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
UserStorySchema.index({ familyId: 1, visibility: 1, createdAt: -1 });
UserStorySchema.index({ userId: 1, chapter: 1 });
UserStorySchema.index({ userId: 1, "yearRange.from": 1 });
UserStorySchema.index({ familyId: 1, isLegacy: 1 });
UserStorySchema.index({ tags: 1, familyId: 1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────

UserStorySchema.methods.addReaction = async function (
  this: IUserStory,
  userId: Types.ObjectId,
  emoji: string,
  comment?: string
): Promise<IUserStory> {
  this.reactions = this.reactions.filter(
    (r) => r.userId.toString() !== userId.toString()
  );
  this.reactions.push({ userId, emoji, comment, reactedAt: new Date() });
  return this.save();
};

UserStorySchema.methods.markViewed = async function (
  this: IUserStory,
  userId: Types.ObjectId
): Promise<IUserStory> {
  const alreadyViewed = this.viewedBy.some(
    (id) => id.toString() === userId.toString()
  );
  if (!alreadyViewed) {
    this.viewedBy.push(userId);
    this.viewCount += 1;
    await this.save();
  }
  return this;
};

// ─── Static Methods ───────────────────────────────────────────────────────────

UserStorySchema.statics.getFamilyStoryFeed = function (
  familyId: Types.ObjectId,
  page: number = 1,
  limit: number = 10
) {
  return this.find({
    familyId,
    isDeleted: false,
    visibility: { $in: [StoryVisibility.FAMILY_ONLY, StoryVisibility.LEGACY] },
  })
    .populate("userId", "firstName lastName avatar role familyNickname")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

UserStorySchema.statics.getUserStoryTimeline = function (userId: Types.ObjectId) {
  return this.find({ userId, isDeleted: false })
    .sort({ "yearRange.from": 1, createdAt: 1 })
    .select("-editHistory -aiEnrichment.embeddingVector");
};

UserStorySchema.statics.getLegacyStories = function (familyId: Types.ObjectId) {
  return this.find({ familyId, isLegacy: true, isDeleted: false })
    .populate("userId", "firstName lastName avatar")
    .sort({ createdAt: -1 });
};

UserStorySchema.statics.searchByTheme = function (
  familyId: Types.ObjectId,
  theme: string
) {
  return this.find({
    familyId,
    isDeleted: false,
    $or: [
      { tags: { $regex: theme, $options: "i" } },
      { "aiEnrichment.keyThemes": { $regex: theme, $options: "i" } },
      { chapter: theme },
    ],
  })
    .populate("userId", "firstName lastName avatar")
    .sort({ createdAt: -1 });
};

// ─── Export ───────────────────────────────────────────────────────────────────
const UserStory = model<IUserStory, IUserStoryModel>("UserStory", UserStorySchema);
export default UserStory;
