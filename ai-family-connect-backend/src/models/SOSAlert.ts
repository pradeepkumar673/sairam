import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** What kind of emergency triggered the SOS */
export enum SOSType {
  MANUAL_BUTTON  = "manual_button",    // User pressed the SOS button in app
  FALL_DETECTED  = "fall_detected",    // Automatically raised by a FallEvent
  INACTIVITY     = "inactivity",       // No activity detected for too long
  GEOFENCE_BREACH = "geofence_breach", // Elder left a safe zone
  MEDICAL        = "medical",          // Self-reported medical emergency
  SAFETY         = "safety",           // General safety concern
  PANIC          = "panic",            // Panic button — no further input needed
  TEST           = "test",             // Drill / test alert (no real emergency)
}

/** Priority level — controls notification urgency and escalation */
export enum SOSPriority {
  LOW      = 1,
  MEDIUM   = 2,
  HIGH     = 3,
  CRITICAL = 4,  // Escalates to all contacts + optional 911 prompt
}

/** Lifecycle state of the SOS alert */
export enum SOSStatus {
  ACTIVE       = "active",       // Alert firing — awaiting response
  ACKNOWLEDGED = "acknowledged", // At least one responder has seen it
  RESPONDING   = "responding",   // Help confirmed on the way
  RESOLVED     = "resolved",     // Situation handled — alert closed
  CANCELLED    = "cancelled",    // Sender cancelled (false alarm or error)
  EXPIRED      = "expired",      // Timed out with no response
}

/** How the alert was resolved */
export enum SOSResolutionType {
  SELF_RESOLVED       = "self_resolved",        // Elder confirmed they're fine
  FAMILY_HELPED       = "family_helped",         // Family member assisted
  EMERGENCY_SERVICES  = "emergency_services",    // 911/999 was dispatched
  MEDICAL_PROFESSIONAL = "medical_professional", // Doctor/nurse assisted
  FALSE_ALARM         = "false_alarm",
  OTHER               = "other",
}

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/** GPS location at the time the SOS was triggered */
export interface ISOSLocation {
  type: "Point";
  coordinates: [number, number];
  accuracy?: number;
  address?: string;           // Reverse-geocoded
  mapsLink?: string;          // Google Maps deep link
  lastUpdatedAt: Date;        // Location can be updated as user moves
}

/** Responder record — every family member who took action */
export interface ISOSResponder {
  userId:        Types.ObjectId;
  notifiedAt:    Date;
  acknowledgedAt?: Date;
  respondedAt?:  Date;
  responseNote?: string;
  distanceKm?:   number;      // Distance from elder at time of alert
  etaMinutes?:   number;      // Self-reported ETA to reach elder
}

/** SOS timeline entry */
export interface ISOSTimeline {
  timestamp: Date;
  event:     string;           // Human-readable event description
  actor?:    Types.ObjectId;
  status?:   SOSStatus;
  metadata?: Record<string, unknown>;
}

/** Resolution details — filled when SOS is closed */
export interface ISOSResolution {
  resolvedBy?:    Types.ObjectId;
  resolvedAt:     Date;
  resolutionType: SOSResolutionType;
  notes?:         string;
  injuryReported: boolean;
  medicalReport?: string;
}

/** Escalation config — auto-escalate if no response within N seconds */
export interface ISOSEscalation {
  level:            number;           // 1 = family, 2 = emergency contacts, 3 = auto-911 prompt
  triggeredAt?:     Date;
  waitSeconds:      number;           // Seconds to wait before escalating
  notifiedContacts: string[];         // Phone numbers notified at this level
  completed:        boolean;
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface ISOSAlert extends Document {
  /** Who triggered the SOS */
  userId: Types.ObjectId;

  /** Family group */
  familyId: Types.ObjectId;

  // ── Alert Core ──────────────────────────────────────────
  type:     SOSType;
  priority: SOSPriority;
  status:   SOSStatus;

  /** Short message from the sender (auto-generated or typed) */
  message?: string;

  /** Audio recording of the SOS (base64 URL or file path) */
  audioClipUrl?: string;

  /** Photo taken at time of SOS */
  photoUrl?: string;

  // ── Location ────────────────────────────────────────────
  location?: ISOSLocation;

  // ── Linked Events ───────────────────────────────────────
  /** Fall event that triggered this SOS (if applicable) */
  fallEventId?: Types.ObjectId;

  // ── Responders ──────────────────────────────────────────
  responders: ISOSResponder[];

  // ── Timeline ────────────────────────────────────────────
  timeline: ISOSTimeline[];

  // ── Escalation ──────────────────────────────────────────
  escalations: ISOSEscalation[];
  currentEscalationLevel: number;

  // ── Resolution ──────────────────────────────────────────
  resolution?: ISOSResolution;

  // ── Metrics ─────────────────────────────────────────────
  /** Seconds from creation to first acknowledgement */
  firstResponseSeconds?: number;

  /** Total seconds from creation to resolution */
  totalDurationSeconds?: number;

  // ── Flags ───────────────────────────────────────────────
  emergencyServicesCalled: boolean;
  isTest: boolean;
  isFalseAlarm: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // ── Instance Methods ──────────────────────────────────────
  addResponder(userId: Types.ObjectId, distanceKm?: number): Promise<ISOSAlert>;
  resolve(resolution: Partial<ISOSResolution>): Promise<ISOSAlert>;
  cancel(cancelledBy: Types.ObjectId, reason?: string): Promise<ISOSAlert>;
  updateLocation(coords: [number, number], accuracy?: number): Promise<ISOSAlert>;
}

/** Static helpers */
export interface ISOSAlertModel extends Model<ISOSAlert> {
  getActiveAlertsForFamily(familyId: Types.ObjectId): Promise<ISOSAlert[]>;
  getUserSOSHistory(userId: Types.ObjectId, limit?: number): Promise<ISOSAlert[]>;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const SOSLocationSchema = new Schema<ISOSLocation>(
  {
    type:          { type: String, enum: ["Point"], default: "Point" },
    coordinates:   { type: [Number], required: true },
    accuracy:      { type: Number },
    address:       { type: String, maxlength: 300 },
    mapsLink:      { type: String },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SOSResponderSchema = new Schema<ISOSResponder>(
  {
    userId:          { type: Schema.Types.ObjectId, ref: "User", required: true },
    notifiedAt:      { type: Date, default: Date.now },
    acknowledgedAt:  { type: Date },
    respondedAt:     { type: Date },
    responseNote:    { type: String, maxlength: 300 },
    distanceKm:      { type: Number },
    etaMinutes:      { type: Number },
  },
  { _id: true }
);

const SOSTimelineSchema = new Schema<ISOSTimeline>(
  {
    timestamp: { type: Date, default: Date.now },
    event:     { type: String, required: true, maxlength: 300 },
    actor:     { type: Schema.Types.ObjectId, ref: "User" },
    status:    { type: String, enum: Object.values(SOSStatus) },
    metadata:  { type: Schema.Types.Mixed },
  },
  { _id: true }
);

const SOSResolutionSchema = new Schema<ISOSResolution>(
  {
    resolvedBy:     { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt:     { type: Date, default: Date.now },
    resolutionType: { type: String, enum: Object.values(SOSResolutionType), required: true },
    notes:          { type: String, maxlength: 1000 },
    injuryReported: { type: Boolean, default: false },
    medicalReport:  { type: String, maxlength: 2000 },
  },
  { _id: false }
);

const SOSEscalationSchema = new Schema<ISOSEscalation>(
  {
    level:            { type: Number, required: true, min: 1 },
    triggeredAt:      { type: Date },
    waitSeconds:      { type: Number, required: true },
    notifiedContacts: { type: [String], default: [] },
    completed:        { type: Boolean, default: false },
  },
  { _id: true }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const SOSAlertSchema = new Schema<ISOSAlert, ISOSAlertModel>(
  {
    // ── References ────────────────────────────────────────
    userId:   { type: Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },

    // ── Alert Core ────────────────────────────────────────
    type: {
      type: String, enum: Object.values(SOSType),
      required: [true, "SOS type is required"],
    },
    priority: {
      type: Number, enum: [1, 2, 3, 4],
      default: SOSPriority.HIGH,
    },
    status: {
      type: String, enum: Object.values(SOSStatus),
      default: SOSStatus.ACTIVE, index: true,
    },
    message:      { type: String, maxlength: 500 },
    audioClipUrl: { type: String },
    photoUrl:     { type: String },

    // ── Location ──────────────────────────────────────────
    location: { type: SOSLocationSchema },

    // ── Linked events ─────────────────────────────────────
    fallEventId: { type: Schema.Types.ObjectId, ref: "FallEvent" },

    // ── Responders & Timeline ─────────────────────────────
    responders:  { type: [SOSResponderSchema],  default: [] },
    timeline:    { type: [SOSTimelineSchema],   default: [] },
    escalations: { type: [SOSEscalationSchema], default: [] },
    currentEscalationLevel: { type: Number, default: 0 },

    // ── Resolution ────────────────────────────────────────
    resolution: { type: SOSResolutionSchema },

    // ── Metrics ───────────────────────────────────────────
    firstResponseSeconds: { type: Number },
    totalDurationSeconds: { type: Number },

    // ── Flags ─────────────────────────────────────────────
    emergencyServicesCalled: { type: Boolean, default: false },
    isTest:        { type: Boolean, default: false, index: true },
    isFalseAlarm:  { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
SOSAlertSchema.index({ familyId: 1, status: 1 });
SOSAlertSchema.index({ userId: 1, createdAt: -1 });
SOSAlertSchema.index({ status: 1, createdAt: -1 });
SOSAlertSchema.index({ location: "2dsphere" });

// ─── Instance Methods ─────────────────────────────────────────────────────────

SOSAlertSchema.methods.addResponder = async function (
  this: ISOSAlert,
  userId: Types.ObjectId,
  distanceKm?: number
): Promise<ISOSAlert> {
  const alreadyResponding = this.responders.some(
    (r) => r.userId.toString() === userId.toString()
  );
  if (!alreadyResponding) {
    this.responders.push({ userId, notifiedAt: new Date(), distanceKm } as ISOSResponder);
  }

  if (this.status === SOSStatus.ACTIVE) {
    this.status = SOSStatus.ACKNOWLEDGED;
    this.firstResponseSeconds = Math.round(
      (Date.now() - this.createdAt.getTime()) / 1000
    );
    this.timeline.push({
      timestamp: new Date(),
      event: "Alert acknowledged by family member",
      actor: userId,
      status: SOSStatus.ACKNOWLEDGED,
    } as ISOSTimeline);
  }

  return this.save();
};

SOSAlertSchema.methods.resolve = async function (
  this: ISOSAlert,
  resolution: Partial<ISOSResolution>
): Promise<ISOSAlert> {
  this.status = SOSStatus.RESOLVED;
  this.resolution = {
    resolvedAt: new Date(),
    injuryReported: false,
    resolutionType: SOSResolutionType.OTHER,
    ...resolution,
  } as ISOSResolution;
  this.totalDurationSeconds = Math.round(
    (Date.now() - this.createdAt.getTime()) / 1000
  );
  this.timeline.push({
    timestamp: new Date(),
    event: `Alert resolved — ${resolution.resolutionType ?? "handled"}`,
    actor: resolution.resolvedBy,
    status: SOSStatus.RESOLVED,
  } as ISOSTimeline);
  return this.save();
};

SOSAlertSchema.methods.cancel = async function (
  this: ISOSAlert,
  cancelledBy: Types.ObjectId,
  reason?: string
): Promise<ISOSAlert> {
  this.status = SOSStatus.CANCELLED;
  this.timeline.push({
    timestamp: new Date(),
    event: reason ?? "Alert cancelled by sender",
    actor: cancelledBy,
    status: SOSStatus.CANCELLED,
  } as ISOSTimeline);
  this.totalDurationSeconds = Math.round(
    (Date.now() - this.createdAt.getTime()) / 1000
  );
  return this.save();
};

SOSAlertSchema.methods.updateLocation = async function (
  this: ISOSAlert,
  coords: [number, number],
  accuracy?: number
): Promise<ISOSAlert> {
  if (this.location) {
    this.location.coordinates  = coords;
    this.location.accuracy     = accuracy;
    this.location.lastUpdatedAt = new Date();
  } else {
    this.location = {
      type: "Point",
      coordinates: coords,
      accuracy,
      lastUpdatedAt: new Date(),
    };
  }
  return this.save();
};

// ─── Static Methods ───────────────────────────────────────────────────────────

SOSAlertSchema.statics.getActiveAlertsForFamily = function (familyId: Types.ObjectId) {
  return this.find({
    familyId,
    status: { $in: [SOSStatus.ACTIVE, SOSStatus.ACKNOWLEDGED, SOSStatus.RESPONDING] },
    isTest: false,
  })
    .populate("userId", "firstName lastName avatar phone")
    .sort({ createdAt: -1 });
};

SOSAlertSchema.statics.getUserSOSHistory = function (
  userId: Types.ObjectId,
  limit: number = 20
) {
  return this.find({ userId, isTest: false })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// ─── Export ───────────────────────────────────────────────────────────────────
const SOSAlert = model<ISOSAlert, ISOSAlertModel>("SOSAlert", SOSAlertSchema);
export default SOSAlert;
