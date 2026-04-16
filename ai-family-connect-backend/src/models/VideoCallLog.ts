import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Technology or integration used for the call */
export enum CallProvider {
  WEBRTC_NATIVE = "webrtc_native",  // App's built-in WebRTC
  JITSI         = "jitsi",
  DAILY_CO      = "daily_co",
  TWILIO        = "twilio",
  AGORA         = "agora",
  ZOOM          = "zoom",          // External — deep link only
  WHATSAPP      = "whatsapp",      // External — logged manually
  FACETIME      = "facetime",      // External — logged manually
}

/** What kind of call was initiated */
export enum CallType {
  VIDEO = "video",
  AUDIO = "audio",   // Audio-only
  GROUP = "group",   // 3+ participants
  SOS   = "sos",     // Emergency call initiated by SOS alert
}

/** Lifecycle status of the call */
export enum CallStatus {
  INITIATED  = "initiated",   // Call created, invites sent
  RINGING    = "ringing",     // Recipients are being notified
  ACTIVE     = "active",      // At least two participants connected
  ON_HOLD    = "on_hold",     // Host placed call on hold
  ENDED      = "ended",       // Call terminated normally
  MISSED     = "missed",      // No one answered
  DECLINED   = "declined",    // Recipient declined
  FAILED     = "failed",      // Technical failure
  NO_ANSWER  = "no_answer",   // Timed out without pick-up
}

/** Per-participant call status */
export enum ParticipantStatus {
  INVITED   = "invited",
  RINGING   = "ringing",
  JOINED    = "joined",
  LEFT      = "left",
  DECLINED  = "declined",
  NO_ANSWER = "no_answer",
  KICKED    = "kicked",
}

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/** Individual participant record */
export interface ICallParticipant {
  userId:         Types.ObjectId;
  status:         ParticipantStatus;
  invitedAt:      Date;
  joinedAt?:      Date;
  leftAt?:        Date;
  /** Duration this participant was connected (seconds) */
  connectionDurationSeconds?: number;
  /** Whether the participant had their camera on */
  videoEnabled:   boolean;
  audioEnabled:   boolean;
  /** Network quality metric (1–5 scale) */
  connectionQuality?: number;
  /** Device info for diagnostics */
  deviceType?:    "mobile" | "tablet" | "desktop" | "tv";
  declineReason?: string;
}

/** Technical quality metrics for the call session */
export interface ICallQualityMetrics {
  /** Average round-trip time in milliseconds */
  avgRttMs?:          number;
  /** Average packet loss percentage */
  avgPacketLoss?:     number;
  /** Average video resolution achieved */
  videoResolution?:   "480p" | "720p" | "1080p";
  /** Audio codec used */
  audioCodec?:        string;
  /** Video codec used */
  videoCodec?:        string;
  /** Total data transferred (MB) */
  dataMB?:            number;
}

/** Recording info (if call was recorded) */
export interface ICallRecording {
  url:            string;
  durationSeconds: number;
  sizeBytes:      number;
  expiresAt:      Date;         // Recordings auto-delete after N days
  consentGiven:   boolean;
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IVideoCallLog extends Document {
  /** Family group this call belongs to */
  familyId: Types.ObjectId;

  /** Who initiated the call */
  initiatedBy: Types.ObjectId;

  // ── Call Configuration ──────────────────────────────────
  type:     CallType;
  provider: CallProvider;
  status:   CallStatus;

  /** Room identifier used by the call provider */
  roomId:  string;

  /** Full URL to join the call (used for external providers) */
  joinUrl?: string;

  /** Display title for group calls ("Sunday Family Call", etc.) */
  title?: string;

  /** Was this a scheduled call? */
  isScheduled:    boolean;
  scheduledFor?:  Date;

  // ── Participants ────────────────────────────────────────
  participants: ICallParticipant[];

  /** Total unique participants who actually joined */
  totalParticipantsJoined: number;

  // ── Timing ──────────────────────────────────────────────
  initiatedAt: Date;
  startedAt?:  Date;    // First participant answers
  endedAt?:    Date;

  /** Call duration in seconds (from first answer to end) */
  durationSeconds?: number;

  // ── Quality & Recording ─────────────────────────────────
  qualityMetrics?: ICallQualityMetrics;
  recording?:      ICallRecording;

  // ── SOS / Emergency ─────────────────────────────────────
  /** SOS alert that triggered this call (if applicable) */
  sosAlertId?: Types.ObjectId;
  isEmergencyCall: boolean;

  // ── End Reason ──────────────────────────────────────────
  endReason?:  string;    // "host_ended", "all_left", "timeout", "error"
  errorCode?:  string;    // Provider-specific error code on FAILED calls

  // ── Feedback ────────────────────────────────────────────
  /** Post-call feedback from participants */
  feedbackRatings: { userId: Types.ObjectId; rating: number; comment?: string }[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // ── Instance Methods ──────────────────────────────────────
  participantJoined(userId: Types.ObjectId): Promise<IVideoCallLog>;
  participantLeft(userId: Types.ObjectId): Promise<IVideoCallLog>;
  endCall(reason?: string): Promise<IVideoCallLog>;
}

/** Static helpers */
export interface IVideoCallLogModel extends Model<IVideoCallLog> {
  getCallHistory(familyId: Types.ObjectId, limit?: number): Promise<IVideoCallLog[]>;
  getUserCallStats(userId: Types.ObjectId): Promise<{
    totalCalls: number;
    totalDurationSeconds: number;
    missedCalls: number;
  }>;
  getRecentMissedCalls(userId: Types.ObjectId): Promise<IVideoCallLog[]>;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const CallParticipantSchema = new Schema<ICallParticipant>(
  {
    userId:                   { type: Schema.Types.ObjectId, ref: "User", required: true },
    status:                   { type: String, enum: Object.values(ParticipantStatus), default: ParticipantStatus.INVITED },
    invitedAt:                { type: Date, default: Date.now },
    joinedAt:                 { type: Date },
    leftAt:                   { type: Date },
    connectionDurationSeconds:{ type: Number, min: 0 },
    videoEnabled:             { type: Boolean, default: true },
    audioEnabled:             { type: Boolean, default: true },
    connectionQuality:        { type: Number, min: 1, max: 5 },
    deviceType:               { type: String, enum: ["mobile", "tablet", "desktop", "tv"] },
    declineReason:            { type: String, maxlength: 200 },
  },
  { _id: true }
);

const CallQualityMetricsSchema = new Schema<ICallQualityMetrics>(
  {
    avgRttMs:        { type: Number },
    avgPacketLoss:   { type: Number, min: 0, max: 100 },
    videoResolution: { type: String, enum: ["480p", "720p", "1080p"] },
    audioCodec:      { type: String, maxlength: 50 },
    videoCodec:      { type: String, maxlength: 50 },
    dataMB:          { type: Number, min: 0 },
  },
  { _id: false }
);

const CallRecordingSchema = new Schema<ICallRecording>(
  {
    url:             { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    sizeBytes:       { type: Number, required: true },
    expiresAt:       { type: Date, required: true },
    consentGiven:    { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const VideoCallLogSchema = new Schema<IVideoCallLog, IVideoCallLogModel>(
  {
    // ── References ────────────────────────────────────────
    familyId:    { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    initiatedBy: { type: Schema.Types.ObjectId, ref: "User",   required: true },

    // ── Config ────────────────────────────────────────────
    type: {
      type: String, enum: Object.values(CallType),
      required: [true, "Call type is required"],
    },
    provider: {
      type: String, enum: Object.values(CallProvider),
      default: CallProvider.WEBRTC_NATIVE,
    },
    status: {
      type: String, enum: Object.values(CallStatus),
      default: CallStatus.INITIATED, index: true,
    },
    roomId:   { type: String, required: true, index: true, unique: true },
    joinUrl:  { type: String },
    title:    { type: String, maxlength: 150 },

    isScheduled:   { type: Boolean, default: false },
    scheduledFor:  { type: Date },

    // ── Participants ──────────────────────────────────────
    participants:              { type: [CallParticipantSchema], default: [] },
    totalParticipantsJoined:   { type: Number, default: 0 },

    // ── Timing ────────────────────────────────────────────
    initiatedAt:     { type: Date, default: Date.now, required: true },
    startedAt:       { type: Date },
    endedAt:         { type: Date, index: true },
    durationSeconds: { type: Number, min: 0 },

    // ── Quality ───────────────────────────────────────────
    qualityMetrics: { type: CallQualityMetricsSchema },
    recording:      { type: CallRecordingSchema },

    // ── Emergency ─────────────────────────────────────────
    sosAlertId:       { type: Schema.Types.ObjectId, ref: "SOSAlert" },
    isEmergencyCall:  { type: Boolean, default: false, index: true },

    // ── End details ───────────────────────────────────────
    endReason:  { type: String, maxlength: 100 },
    errorCode:  { type: String, maxlength: 50 },

    // ── Feedback ──────────────────────────────────────────
    feedbackRatings: {
      type: [{
        userId:  { type: Schema.Types.ObjectId, ref: "User" },
        rating:  { type: Number, min: 1, max: 5 },
        comment: { type: String, maxlength: 300 },
      }],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
VideoCallLogSchema.index({ familyId: 1, initiatedAt: -1 });
VideoCallLogSchema.index({ "participants.userId": 1, initiatedAt: -1 });
VideoCallLogSchema.index({ familyId: 1, status: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

VideoCallLogSchema.virtual("wasAnswered").get(function (this: IVideoCallLog) {
  return [CallStatus.ACTIVE, CallStatus.ENDED].includes(this.status);
});

VideoCallLogSchema.virtual("participantCount").get(function (this: IVideoCallLog) {
  return this.participants.length;
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

VideoCallLogSchema.methods.participantJoined = async function (
  this: IVideoCallLog,
  userId: Types.ObjectId
): Promise<IVideoCallLog> {
  const participant = this.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );
  const now = new Date();

  if (participant) {
    participant.status   = ParticipantStatus.JOINED;
    participant.joinedAt = now;
  } else {
    // Allow drop-in participants
    this.participants.push({
      userId,
      status:       ParticipantStatus.JOINED,
      invitedAt:    now,
      joinedAt:     now,
      videoEnabled: true,
      audioEnabled: true,
    } as ICallParticipant);
  }

  // Transition call to ACTIVE on first join
  if (this.status === CallStatus.RINGING || this.status === CallStatus.INITIATED) {
    this.status    = CallStatus.ACTIVE;
    this.startedAt = now;
  }

  this.totalParticipantsJoined = this.participants.filter(
    (p) => p.status === ParticipantStatus.JOINED || p.leftAt
  ).length;

  return this.save();
};

VideoCallLogSchema.methods.participantLeft = async function (
  this: IVideoCallLog,
  userId: Types.ObjectId
): Promise<IVideoCallLog> {
  const participant = this.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );
  const now = new Date();

  if (participant && participant.joinedAt) {
    participant.status = ParticipantStatus.LEFT;
    participant.leftAt = now;
    participant.connectionDurationSeconds = Math.round(
      (now.getTime() - participant.joinedAt.getTime()) / 1000
    );
  }

  // If no active participants remain, auto-end call
  const stillActive = this.participants.filter(
    (p) => p.status === ParticipantStatus.JOINED
  ).length;
  if (stillActive === 0) {
    await this.endCall("all_left");
    return this;
  }

  return this.save();
};

VideoCallLogSchema.methods.endCall = async function (
  this: IVideoCallLog,
  reason?: string
): Promise<IVideoCallLog> {
  const now = new Date();
  this.status    = CallStatus.ENDED;
  this.endedAt   = now;
  this.endReason = reason ?? "host_ended";

  if (this.startedAt) {
    this.durationSeconds = Math.round(
      (now.getTime() - this.startedAt.getTime()) / 1000
    );
  }

  return this.save();
};

// ─── Static Methods ───────────────────────────────────────────────────────────

VideoCallLogSchema.statics.getCallHistory = function (
  familyId: Types.ObjectId,
  limit: number = 20
) {
  return this.find({ familyId, status: { $ne: CallStatus.INITIATED } })
    .populate("initiatedBy", "firstName lastName avatar")
    .populate("participants.userId", "firstName lastName avatar")
    .sort({ initiatedAt: -1 })
    .limit(limit);
};

VideoCallLogSchema.statics.getUserCallStats = async function (userId: Types.ObjectId) {
  const [result] = await this.aggregate([
    { $match: { "participants.userId": userId } },
    {
      $group: {
        _id: null,
        totalCalls:     { $sum: 1 },
        totalDuration:  { $sum: { $ifNull: ["$durationSeconds", 0] } },
        missedCalls:    { $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] } },
      },
    },
  ]);

  return result
    ? { totalCalls: result.totalCalls, totalDurationSeconds: result.totalDuration, missedCalls: result.missedCalls }
    : { totalCalls: 0, totalDurationSeconds: 0, missedCalls: 0 };
};

VideoCallLogSchema.statics.getRecentMissedCalls = function (userId: Types.ObjectId) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  return this.find({
    "participants.userId": userId,
    status: { $in: [CallStatus.MISSED, CallStatus.NO_ANSWER] },
    initiatedAt: { $gte: since },
  })
    .populate("initiatedBy", "firstName lastName avatar")
    .sort({ initiatedAt: -1 });
};

// ─── Export ───────────────────────────────────────────────────────────────────
const VideoCallLog = model<IVideoCallLog, IVideoCallLogModel>("VideoCallLog", VideoCallLogSchema);
export default VideoCallLog;
