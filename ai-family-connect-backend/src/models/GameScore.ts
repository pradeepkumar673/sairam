import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * All mini-games and gamified activities in the app.
 * Scores from each activity are tracked separately.
 */
export enum GameType {
  // Cognitive / Brain games (great for elders)
  MEMORY_MATCH      = "memory_match",      // Card flip memory game
  WORD_PUZZLE       = "word_puzzle",        // Word search / crossword
  TRIVIA_GENERAL    = "trivia_general",     // General knowledge quiz
  TRIVIA_FAMILY     = "trivia_family",      // Family-specific trivia (AI-generated)
  MATH_CHALLENGE    = "math_challenge",     // Simple arithmetic
  PATTERN_RECALL    = "pattern_recall",     // Remember & repeat a sequence
  // Physical activity games (wearable integration)
  STEP_CHALLENGE    = "step_challenge",     // Daily/weekly step count competition
  HYDRATION_STREAK  = "hydration_streak",   // Log water intake daily
  // Family bonding games
  FAMILY_QUIZ       = "family_quiz",        // Collaborative family quiz
  STORY_BUILDER     = "story_builder",      // Collaborative story writing
  PHOTO_CAPTION     = "photo_caption",      // Caption family photos
  // Wellness streaks (gamified habits)
  MEDICINE_STREAK   = "medicine_streak",    // Consecutive days 100% adherence
  MOOD_LOG_STREAK   = "mood_log_streak",    // Consecutive days mood logged
  CHECK_IN_STREAK   = "check_in_streak",    // Daily check-in streak
}

/** Difficulty level for cognitive games */
export enum GameDifficulty {
  EASY   = "easy",
  MEDIUM = "medium",
  HARD   = "hard",
}

/** Current leaderboard scope */
export enum LeaderboardScope {
  DAILY   = "daily",
  WEEKLY  = "weekly",
  MONTHLY = "monthly",
  ALL_TIME = "all_time",
}

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/** Session-level performance metrics for a single game play */
export interface IGameSession {
  sessionId:     string;
  startedAt:     Date;
  completedAt?:  Date;
  durationSeconds: number;
  rawScore:      number;
  bonusPoints:   number;       // Time bonus, streak bonus, etc.
  accuracy?:     number;       // Percentage 0–100 (for quiz/memory games)
  level?:        number;       // Game level reached
  mistakes?:     number;
  hints?:        number;       // Hints used (negatively affects score)
}

/** An earned badge/achievement */
export interface IBadge {
  badgeId:     string;         // Unique badge identifier
  name:        string;         // "Memory Master", "7-Day Streak", etc.
  description: string;
  iconUrl?:    string;
  earnedAt:    Date;
  gameType:    GameType;
  rarity:      "common" | "rare" | "epic" | "legendary";
}

/** Streak tracking for habit-based games */
export interface IStreakData {
  currentStreak:  number;      // Consecutive days/sessions
  longestStreak:  number;
  lastActivityDate: Date;
  streakBrokenAt?: Date;
  streakProtectorsUsed: number; // "Freeze" tokens that protect a streak
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IGameScore extends Document {
  /** The player */
  userId: Types.ObjectId;

  /** Family group — enables family leaderboards */
  familyId: Types.ObjectId;

  /** Which game/activity this record tracks */
  gameType: GameType;

  // ── Scoring ─────────────────────────────────────────────
  /** Cumulative lifetime score for this game type */
  totalScore: number;

  /** Personal best single-session score */
  highScore: number;
  highScoreAchievedAt?: Date;

  /** Total number of sessions played */
  totalSessions: number;

  /** Total sessions completed (not abandoned) */
  completedSessions: number;

  /** Average score across completed sessions */
  averageScore: number;

  // ── Leaderboard position (cached, updated by cron) ──────
  familyRank?: number;        // Position within the family for this game
  globalRank?: number;        // Global rank (if global leaderboard enabled)

  // ── Streak (for habit-based games) ──────────────────────
  streakData?: IStreakData;

  // ── Recent sessions (last 10 kept inline) ───────────────
  recentSessions: IGameSession[];

  // ── Difficulty progression ──────────────────────────────
  currentDifficulty: GameDifficulty;
  highestDifficultyCleared: GameDifficulty;

  // ── Achievements ────────────────────────────────────────
  badges: IBadge[];
  totalPoints: number;         // Aggregate XP/points across ALL game types (on family leaderboard)
  level: number;               // Player level (derived from totalPoints)
  levelName?: string;          // "Novice", "Champion", "Legend"

  // ── Time Tracking ───────────────────────────────────────
  totalTimePlayedSeconds: number;
  lastPlayedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // ── Instance Methods ──────────────────────────────────────
  recordSession(session: Omit<IGameSession, "sessionId">): Promise<IGameScore>;
  awardBadge(badge: Omit<IBadge, "earnedAt">): Promise<IGameScore>;
  updateStreak(): Promise<IGameScore>;
}

/** Static helpers */
export interface IGameScoreModel extends Model<IGameScore> {
  getFamilyLeaderboard(
    familyId: Types.ObjectId,
    scope?: LeaderboardScope
  ): Promise<{ userId: Types.ObjectId; displayName: string; totalPoints: number; level: number; rank: number }[]>;

  getUserAllGameStats(userId: Types.ObjectId): Promise<IGameScore[]>;

  getTopScoreForGame(
    familyId: Types.ObjectId,
    gameType: GameType
  ): Promise<IGameScore | null>;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const GameSessionSchema = new Schema<IGameSession>(
  {
    sessionId:       { type: String, required: true },
    startedAt:       { type: Date, required: true },
    completedAt:     { type: Date },
    durationSeconds: { type: Number, required: true, min: 0 },
    rawScore:        { type: Number, required: true, min: 0 },
    bonusPoints:     { type: Number, default: 0 },
    accuracy:        { type: Number, min: 0, max: 100 },
    level:           { type: Number, min: 1 },
    mistakes:        { type: Number, min: 0 },
    hints:           { type: Number, min: 0 },
  },
  { _id: false }
);

const BadgeSchema = new Schema<IBadge>(
  {
    badgeId:     { type: String, required: true },
    name:        { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 300 },
    iconUrl:     { type: String },
    earnedAt:    { type: Date, default: Date.now },
    gameType:    { type: String, enum: Object.values(GameType), required: true },
    rarity:      { type: String, enum: ["common", "rare", "epic", "legendary"], default: "common" },
  },
  { _id: true }
);

const StreakDataSchema = new Schema<IStreakData>(
  {
    currentStreak:         { type: Number, default: 0, min: 0 },
    longestStreak:         { type: Number, default: 0, min: 0 },
    lastActivityDate:      { type: Date, default: Date.now },
    streakBrokenAt:        { type: Date },
    streakProtectorsUsed:  { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Level Calculation Helper ─────────────────────────────────────────────────

function calculateLevel(totalPoints: number): { level: number; levelName: string } {
  const thresholds = [
    { level: 1,  name: "Newcomer",     min: 0 },
    { level: 2,  name: "Explorer",     min: 100 },
    { level: 3,  name: "Player",       min: 300 },
    { level: 4,  name: "Enthusiast",   min: 600 },
    { level: 5,  name: "Achiever",     min: 1000 },
    { level: 6,  name: "Challenger",   min: 1500 },
    { level: 7,  name: "Expert",       min: 2200 },
    { level: 8,  name: "Master",       min: 3000 },
    { level: 9,  name: "Champion",     min: 4200 },
    { level: 10, name: "Legend",       min: 6000 },
  ];
  const tier = [...thresholds].reverse().find((t) => totalPoints >= t.min);
  return { level: tier?.level ?? 1, levelName: tier?.name ?? "Newcomer" };
}

// ─── Main Schema ──────────────────────────────────────────────────────────────

const GameScoreSchema = new Schema<IGameScore, IGameScoreModel>(
  {
    // ── References ────────────────────────────────────────
    userId:   { type: Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },

    // ── Game Identity ─────────────────────────────────────
    gameType: {
      type: String, enum: Object.values(GameType),
      required: [true, "Game type is required"],
    },

    // ── Scores ────────────────────────────────────────────
    totalScore:       { type: Number, default: 0, min: 0 },
    highScore:        { type: Number, default: 0, min: 0 },
    highScoreAchievedAt: { type: Date },
    totalSessions:    { type: Number, default: 0, min: 0 },
    completedSessions: { type: Number, default: 0, min: 0 },
    averageScore:     { type: Number, default: 0 },

    // ── Leaderboard ───────────────────────────────────────
    familyRank: { type: Number },
    globalRank: { type: Number },

    // ── Streak ────────────────────────────────────────────
    streakData: { type: StreakDataSchema },

    // ── Sessions ──────────────────────────────────────────
    recentSessions: { type: [GameSessionSchema], default: [] },

    // ── Difficulty ────────────────────────────────────────
    currentDifficulty: {
      type: String, enum: Object.values(GameDifficulty),
      default: GameDifficulty.EASY,
    },
    highestDifficultyCleared: {
      type: String, enum: Object.values(GameDifficulty),
      default: GameDifficulty.EASY,
    },

    // ── Achievements ──────────────────────────────────────
    badges:      { type: [BadgeSchema], default: [] },
    totalPoints: { type: Number, default: 0 },
    level:       { type: Number, default: 1 },
    levelName:   { type: String, default: "Newcomer" },

    // ── Time ──────────────────────────────────────────────
    totalTimePlayedSeconds: { type: Number, default: 0, min: 0 },
    lastPlayedAt:           { type: Date },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Compound Unique Index (one doc per user+game) ────────────────────────────
GameScoreSchema.index({ userId: 1, gameType: 1 }, { unique: true });
GameScoreSchema.index({ familyId: 1, totalPoints: -1 });
GameScoreSchema.index({ familyId: 1, gameType: 1, highScore: -1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────

GameScoreSchema.methods.recordSession = async function (
  this: IGameScore,
  session: Omit<IGameSession, "sessionId">
): Promise<IGameScore> {
  const { v4: uuidv4 } = await import("uuid");
  const newSession: IGameSession = { ...session, sessionId: uuidv4() };

  this.totalSessions += 1;
  if (newSession.completedAt) this.completedSessions += 1;

  const sessionScore = newSession.rawScore + newSession.bonusPoints;
  this.totalScore += sessionScore;
  this.totalTimePlayedSeconds += newSession.durationSeconds;

  if (sessionScore > this.highScore) {
    this.highScore = sessionScore;
    this.highScoreAchievedAt = new Date();
  }

  this.averageScore = this.completedSessions > 0
    ? Math.round(this.totalScore / this.completedSessions)
    : 0;

  // Keep only last 10 sessions inline
  this.recentSessions.unshift(newSession);
  if (this.recentSessions.length > 10) {
    this.recentSessions = this.recentSessions.slice(0, 10);
  }

  // Update level & points
  this.totalPoints += sessionScore;
  const { level, levelName } = calculateLevel(this.totalPoints);
  this.level     = level;
  this.levelName = levelName;
  this.lastPlayedAt = new Date();

  return this.save();
};

GameScoreSchema.methods.awardBadge = async function (
  this: IGameScore,
  badge: Omit<IBadge, "earnedAt">
): Promise<IGameScore> {
  const alreadyHas = this.badges.some((b) => b.badgeId === badge.badgeId);
  if (!alreadyHas) {
    this.badges.push({ ...badge, earnedAt: new Date() });
    await this.save();
  }
  return this;
};

GameScoreSchema.methods.updateStreak = async function (
  this: IGameScore
): Promise<IGameScore> {
  if (!this.streakData) {
    this.streakData = {
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: new Date(),
      streakProtectorsUsed: 0,
    };
  } else {
    const lastDate = new Date(this.streakData.lastActivityDate);
    const today    = new Date();
    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      // Consecutive day
      this.streakData.currentStreak += 1;
      if (this.streakData.currentStreak > this.streakData.longestStreak) {
        this.streakData.longestStreak = this.streakData.currentStreak;
      }
    } else if (diffDays > 1) {
      // Streak broken
      this.streakData.streakBrokenAt = today;
      this.streakData.currentStreak  = 1;
    }
    // diffDays === 0 → same day, no change
    this.streakData.lastActivityDate = today;
  }

  return this.save();
};

// ─── Static Methods ───────────────────────────────────────────────────────────

GameScoreSchema.statics.getFamilyLeaderboard = async function (
  familyId: Types.ObjectId,
  _scope: LeaderboardScope = LeaderboardScope.ALL_TIME
) {
  const results = await this.aggregate([
    { $match: { familyId } },
    {
      $group: {
        _id:         "$userId",
        totalPoints: { $sum: "$totalPoints" },
        level:       { $max: "$level" },
        levelName:   { $last: "$levelName" },
      },
    },
    { $sort: { totalPoints: -1 } },
    { $limit: 50 },
    {
      $lookup: {
        from:         "users",
        localField:   "_id",
        foreignField: "_id",
        as:           "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        userId:      "$_id",
        displayName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
        avatar:      "$user.avatar",
        totalPoints: 1,
        level:       1,
        levelName:   1,
        rank:        0,
      },
    },
  ]);

  return results.map((r: Record<string, unknown>, i: number) => ({ ...r, rank: i + 1 }));
};

GameScoreSchema.statics.getUserAllGameStats = function (userId: Types.ObjectId) {
  return this.find({ userId }).sort({ totalPoints: -1 });
};

GameScoreSchema.statics.getTopScoreForGame = function (
  familyId: Types.ObjectId,
  gameType: GameType
) {
  return this.findOne({ familyId, gameType })
    .sort({ highScore: -1 })
    .populate("userId", "firstName lastName avatar");
};

// ─── Export ───────────────────────────────────────────────────────────────────
const GameScore = model<IGameScore, IGameScoreModel>("GameScore", GameScoreSchema);
export default GameScore;
