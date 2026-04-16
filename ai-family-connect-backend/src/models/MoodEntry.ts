import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * Primary mood classification on a 5-point scale.
 * Designed to be intuitive for both elders and students.
 */
export enum MoodLevel {
  VERY_SAD  = 1,  // 😢 Distressed / very low
  SAD       = 2,  // 😕 Sad / struggling
  NEUTRAL   = 3,  // 😐 Okay / neutral
  HAPPY     = 4,  // 🙂 Good / happy
  VERY_HAPPY = 5, // 😄 Great / very happy
}

/** Contextual emotion tags that refine the primary mood */
export enum EmotionTag {
  // Negative emotions
  ANXIOUS    = "anxious",
  LONELY     = "lonely",
  STRESSED   = "stressed",
  ANGRY      = "angry",
  CONFUSED   = "confused",
  TIRED      = "tired",
  SCARED     = "scared",
  PAIN       = "in_pain",
  // Neutral emotions
  BORED      = "bored",
  CALM       = "calm",
  NOSTALGIC  = "nostalgic",
  REFLECTIVE = "reflective",
  // Positive emotions
  GRATEFUL   = "grateful",
  EXCITED    = "excited",
  LOVED      = "loved",
  HOPEFUL    = "hopeful",
  PROUD      = "proud",
  ENERGETIC  = "energetic",
  // Student-specific
  OVERWHELMED  = "overwhelmed",
  MOTIVATED    = "motivated",
  ACCOMPLISHED = "accomplished",
}

/** What triggered or contributed to this mood entry */
export enum MoodTrigger {
  HEALTH       = "health",
  FAMILY       = "family",
  WORK_SCHOOL  = "work_school",
  SLEEP        = "sleep",
  SOCIAL       = "social",
  WEATHER      = "weather",
  NEWS         = "news",
  EXERCISE     = "exercise",
  FOOD         = "food",
  MEDICATION   = "medication",
  PAIN         = "pain",
  ACHIEVEMENT  = "achievement",
  LOSS         = "loss",
  OTHER        = "other",
}

/** How the entry was created */
export enum MoodEntrySource {
  MANUAL        = "manual",       // User actively logged it
  REMINDER      = "reminder",     // Responded to a scheduled reminder
  AI_PROMPTED   = "ai_prompted",  // AI companion asked how they're feeling
  WEARABLE      = "wearable",     // Synced from a wearable device
}

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/** AI analysis of the mood entry (populated by Gemini service) */
export interface IAIAnalysis {
  sentiment:        "positive" | "neutral" | "negative" | "mixed";
  sentimentScore:   number;        // -1.0 to 1.0
  riskLevel:        "low" | "medium" | "high" | "critical";
  detectedEmotions: string[];      // AI-extracted emotions from journal text
  suggestedActions: string[];      // e.g. ["Consider calling a family member", "Take a short walk"]
  requiresAttention: boolean;      // Flag for family notification
  analysedAt: Date;
}

/** Physical context at time of mood log */
export interface IPhysicalContext {
  sleptWell?: boolean;
  hoursSlept?: number;
  exercisedToday?: boolean;
  painLevel?: number;            // 0–10 scale
  appetiteLevel?: "poor" | "normal" | "good";
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IMoodEntry extends Document {
  /** Who logged this mood */
  userId: Types.ObjectId;

  /** Family group for shared visibility */
  familyId: Types.ObjectId;

  // ── Core Mood Data ──────────────────────────────────────
  /** Primary mood rating 1–5 */
  moodLevel: MoodLevel;

  /** Descriptive emoji the user selected (stored for UI rendering) */
  moodEmoji?: string;

  /** Fine-grained emotion tags (multi-select) */
  emotions: EmotionTag[];

  /** Identified triggers/context for this mood */
  triggers: MoodTrigger[];

  // ── Journaling ──────────────────────────────────────────
  /** Free-text journal entry (passed to AI for analysis) */
  journalText?: string;

  /** Voice memo transcription (if recorded via app) */
  voiceTranscription?: string;

  /** Whether the journal entry contains potential crisis keywords */
  containsCrisisKeywords: boolean;

  // ── AI Analysis ─────────────────────────────────────────
  aiAnalysis?: IAIAnalysis;

  // ── Physical Context ────────────────────────────────────
  physicalContext?: IPhysicalContext;

  // ── Entry Metadata ──────────────────────────────────────
  source: MoodEntrySource;

  /** Was the family notified about this entry? (only when risk >= medium) */
  familyNotified: boolean;
  familyNotifiedAt?: Date;
  notifiedMembers: Types.ObjectId[];

  /** Was a professional support suggestion shown to the user? */
  professionalSupportSuggested: boolean;

  /** Did the user acknowledge and read any AI suggestions? */
  suggestionsAcknowledged: boolean;

  /** Privacy toggle — hide this entry from family view */
  isPrivate: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Static helpers on MoodEntry */
export interface IMoodEntryModel extends Model<IMoodEntry> {
  /** Get mood trend for a user over N days */
  getMoodTrend(userId: Types.ObjectId, days: number): Promise<{ date: string; average: number }[]>;

  /** Find high-risk entries requiring family attention */
  getHighRiskEntries(familyId: Types.ObjectId, since?: Date): Promise<IMoodEntry[]>;

  /** Weekly average mood score for a user */
  getWeeklyAverage(userId: Types.ObjectId): Promise<number>;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const AIAnalysisSchema = new Schema<IAIAnalysis>(
  {
    sentiment:          { type: String, enum: ["positive", "neutral", "negative", "mixed"] },
    sentimentScore:     { type: Number, min: -1, max: 1 },
    riskLevel:          { type: String, enum: ["low", "medium", "high", "critical"] },
    detectedEmotions:   { type: [String], default: [] },
    suggestedActions:   { type: [String], default: [] },
    requiresAttention:  { type: Boolean, default: false },
    analysedAt:         { type: Date, default: Date.now },
  },
  { _id: false }
);

const PhysicalContextSchema = new Schema<IPhysicalContext>(
  {
    sleptWell:       { type: Boolean },
    hoursSlept:      { type: Number, min: 0, max: 24 },
    exercisedToday:  { type: Boolean },
    painLevel:       { type: Number, min: 0, max: 10 },
    appetiteLevel:   { type: String, enum: ["poor", "normal", "good"] },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const MoodEntrySchema = new Schema<IMoodEntry, IMoodEntryModel>(
  {
    // ── References ────────────────────────────────────────
    userId:   { type: Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },

    // ── Core Mood ─────────────────────────────────────────
    moodLevel: {
      type: Number,
      required: [true, "Mood level is required"],
      min: [1, "Mood level minimum is 1"],
      max: [5, "Mood level maximum is 5"],
      enum: [1, 2, 3, 4, 5],
    },
    moodEmoji: { type: String, maxlength: 10 },
    emotions:  { type: [String], enum: Object.values(EmotionTag), default: [] },
    triggers:  { type: [String], enum: Object.values(MoodTrigger), default: [] },

    // ── Journaling ────────────────────────────────────────
    journalText:           { type: String, maxlength: [2000, "Journal text cannot exceed 2000 characters"] },
    voiceTranscription:    { type: String, maxlength: 3000 },
    containsCrisisKeywords: { type: Boolean, default: false, index: true },

    // ── AI Analysis ───────────────────────────────────────
    aiAnalysis: { type: AIAnalysisSchema },

    // ── Physical Context ──────────────────────────────────
    physicalContext: { type: PhysicalContextSchema },

    // ── Metadata ─────────────────────────────────────────
    source: {
      type: String, enum: Object.values(MoodEntrySource),
      default: MoodEntrySource.MANUAL,
    },
    familyNotified:   { type: Boolean, default: false },
    familyNotifiedAt: { type: Date },
    notifiedMembers:  { type: [Schema.Types.ObjectId], ref: "User", default: [] },

    professionalSupportSuggested: { type: Boolean, default: false },
    suggestionsAcknowledged:      { type: Boolean, default: false },
    isPrivate:                    { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
MoodEntrySchema.index({ userId: 1, createdAt: -1 });
MoodEntrySchema.index({ familyId: 1, createdAt: -1 });
MoodEntrySchema.index({ familyId: 1, "aiAnalysis.riskLevel": 1, createdAt: -1 });
MoodEntrySchema.index({ userId: 1, moodLevel: 1, createdAt: -1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

/** Human-readable mood label */
MoodEntrySchema.virtual("moodLabel").get(function (this: IMoodEntry) {
  const labels: Record<number, string> = {
    1: "Very Sad", 2: "Sad", 3: "Neutral", 4: "Happy", 5: "Very Happy",
  };
  return labels[this.moodLevel] ?? "Unknown";
});

// ─── Static Methods ───────────────────────────────────────────────────────────

MoodEntrySchema.statics.getMoodTrend = async function (
  userId: Types.ObjectId,
  days: number = 7
): Promise<{ date: string; average: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return this.aggregate([
    { $match: { userId, createdAt: { $gte: since }, isPrivate: false } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        average: { $avg: "$moodLevel" },
        count:   { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: "$_id", average: { $round: ["$average", 1] }, count: 1, _id: 0 } },
  ]);
};

MoodEntrySchema.statics.getHighRiskEntries = function (
  familyId: Types.ObjectId,
  since: Date = new Date(Date.now() - 86400000) // default: last 24h
): Promise<IMoodEntry[]> {
  return this.find({
    familyId,
    isPrivate: false,
    createdAt: { $gte: since },
    $or: [
      { "aiAnalysis.riskLevel": { $in: ["high", "critical"] } },
      { containsCrisisKeywords: true },
      { moodLevel: 1 },
    ],
  })
    .populate("userId", "firstName lastName avatar role")
    .sort({ createdAt: -1 });
};

MoodEntrySchema.statics.getWeeklyAverage = async function (
  userId: Types.ObjectId
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [result] = await this.aggregate([
    { $match: { userId, createdAt: { $gte: since } } },
    { $group: { _id: null, average: { $avg: "$moodLevel" } } },
  ]);

  return result ? Math.round(result.average * 10) / 10 : 0;
};

// ─── Export ───────────────────────────────────────────────────────────────────
const MoodEntry = model<IMoodEntry, IMoodEntryModel>("MoodEntry", MoodEntrySchema);
export default MoodEntry;
