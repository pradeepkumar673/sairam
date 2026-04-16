import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** The outcome of a scheduled (or PRN) dose */
export enum DoseStatus {
  TAKEN   = "taken",    // Member confirmed they took the dose
  MISSED  = "missed",   // Scheduled time passed without acknowledgement
  SKIPPED = "skipped",  // Intentionally skipped (with optional reason)
  DELAYED = "delayed",  // Taken, but significantly after the scheduled time
  PENDING = "pending",  // Reminder sent, waiting for confirmation
}

/** Who or what recorded this log entry */
export enum LogSource {
  SELF          = "self",           // Elder/user confirmed themselves
  CAREGIVER     = "caregiver",      // Family member marked on elder's behalf
  AUTO_MISSED   = "auto_missed",    // Cron job flagged as missed after grace period
  AI_SUGGESTION = "ai_suggestion",  // AI detected likely non-compliance and logged
}

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/** GPS/location snapshot at the time of the dose log (optional) */
export interface IDoseLocation {
  type: "Point";
  coordinates: [number, number];   // [longitude, latitude]
  accuracy?: number;               // metres
}

/** Vital signs recorded alongside a dose (optional, elder-focused) */
export interface IVitalSnapshot {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;              // bpm
  bloodSugarLevel?: number;        // mmol/L or mg/dL (units field)
  bloodSugarUnit?: "mmol/L" | "mg/dL";
  oxygenSaturation?: number;       // %
  temperature?: number;            // °C
  weight?: number;                 // kg
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IMedicineLog extends Document {
  /** Which medicine this log belongs to */
  medicineId: Types.ObjectId;

  /** The patient/user who was supposed to take the dose */
  userId: Types.ObjectId;

  /** Family group (for aggregated family reports) */
  familyId: Types.ObjectId;

  /** Who logged this entry */
  loggedBy: Types.ObjectId;

  // ── Dose Details ────────────────────────────────────────
  /** Scheduled time this dose was supposed to be taken ("HH:MM") */
  scheduledTime: string;

  /** Full datetime this dose was scheduled for */
  scheduledAt: Date;

  /** Actual datetime the dose was taken (null if missed/skipped) */
  takenAt?: Date;

  /** Minutes late compared to scheduledAt (negative = early) */
  delayMinutes?: number;

  /** Actual dosage taken (may differ from prescribed if adjusted) */
  actualDosage?: number;
  actualDosageUnit?: string;

  /** Outcome of this dose window */
  status: DoseStatus;

  /** Who/what created this log entry */
  source: LogSource;

  // ── Context ─────────────────────────────────────────────
  /** Reason for skipping (user-provided) */
  skipReason?: string;

  /** Any notes added by user or caregiver */
  notes?: string;

  /** Optional vitals captured at dose time */
  vitalSnapshot?: IVitalSnapshot;

  /** Location at time of logging */
  location?: IDoseLocation;

  /** Side effects reported after this dose */
  sideEffectsReported?: string[];

  /** Whether a family member was notified about this log event */
  familyNotified: boolean;
  familyNotifiedAt?: Date;

  /** Alert was raised (missed dose → SOS-level concern) */
  alertRaised: boolean;
  alertId?: Types.ObjectId;       // Reference to Alert document if raised

  /** Day number in the treatment course (1-indexed) */
  courseDay?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Static helpers on MedicineLog */
export interface IMedicineLogModel extends Model<IMedicineLog> {
  /** Calculate adherence rate for a user over the past N days */
  getAdherenceRate(userId: Types.ObjectId, days?: number): Promise<number>;

  /** Find all missed doses in a family today */
  getTodayMissedDoses(familyId: Types.ObjectId): Promise<IMedicineLog[]>;

  /** Aggregate daily summary for a medicine */
  getDailySummary(
    medicineId: Types.ObjectId,
    date: Date
  ): Promise<{ taken: number; missed: number; skipped: number }>;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const DoseLocationSchema = new Schema<IDoseLocation>(
  {
    type:        { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
    accuracy:    { type: Number },
  },
  { _id: false }
);

const VitalSnapshotSchema = new Schema<IVitalSnapshot>(
  {
    bloodPressureSystolic:   { type: Number, min: 0, max: 300 },
    bloodPressureDiastolic:  { type: Number, min: 0, max: 200 },
    heartRate:               { type: Number, min: 0, max: 300 },
    bloodSugarLevel:         { type: Number, min: 0 },
    bloodSugarUnit:          { type: String, enum: ["mmol/L", "mg/dL"] },
    oxygenSaturation:        { type: Number, min: 0, max: 100 },
    temperature:             { type: Number, min: 30, max: 45 },
    weight:                  { type: Number, min: 0, max: 600 },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const MedicineLogSchema = new Schema<IMedicineLog, IMedicineLogModel>(
  {
    // ── References ────────────────────────────────────────
    medicineId: {
      type: Schema.Types.ObjectId, ref: "Medicine",
      required: [true, "Medicine reference is required"], index: true,
    },
    userId: {
      type: Schema.Types.ObjectId, ref: "User",
      required: [true, "User reference is required"], index: true,
    },
    familyId: {
      type: Schema.Types.ObjectId, ref: "Family",
      required: [true, "Family reference is required"], index: true,
    },
    loggedBy: {
      type: Schema.Types.ObjectId, ref: "User",
      required: [true, "Logger reference is required"],
    },

    // ── Dose Details ──────────────────────────────────────
    scheduledTime: {
      type: String, required: true,
      match: [/^\d{2}:\d{2}$/, "Scheduled time must be in HH:MM format"],
    },
    scheduledAt: { type: Date, required: [true, "Scheduled datetime is required"] },
    takenAt:     { type: Date },
    delayMinutes: { type: Number },

    actualDosage:     { type: Number, min: 0 },
    actualDosageUnit: { type: String, trim: true },

    status: {
      type: String, enum: Object.values(DoseStatus),
      default: DoseStatus.PENDING, index: true,
    },
    source: {
      type: String, enum: Object.values(LogSource),
      default: LogSource.SELF,
    },

    // ── Context ───────────────────────────────────────────
    skipReason:          { type: String, maxlength: 300 },
    notes:               { type: String, maxlength: 500 },
    vitalSnapshot:       { type: VitalSnapshotSchema },
    location:            { type: DoseLocationSchema },
    sideEffectsReported: { type: [String], default: [] },

    // ── Notifications ─────────────────────────────────────
    familyNotified:   { type: Boolean, default: false },
    familyNotifiedAt: { type: Date },

    // ── Alert escalation ──────────────────────────────────
    alertRaised: { type: Boolean, default: false },
    alertId:     { type: Schema.Types.ObjectId, ref: "Alert" },

    // ── Course tracking ───────────────────────────────────
    courseDay: { type: Number, min: 1 },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
MedicineLogSchema.index({ medicineId: 1, scheduledAt: -1 });
MedicineLogSchema.index({ userId: 1, scheduledAt: -1 });
MedicineLogSchema.index({ familyId: 1, status: 1, scheduledAt: -1 });
MedicineLogSchema.index({ userId: 1, status: 1 });

/** 2dsphere for location-based queries */
MedicineLogSchema.index({ location: "2dsphere" });

// ─── Pre-save: auto-calculate delay ──────────────────────────────────────────
MedicineLogSchema.pre<IMedicineLog>("save", function (next) {
  if (this.takenAt && this.scheduledAt) {
    this.delayMinutes = Math.round(
      (this.takenAt.getTime() - this.scheduledAt.getTime()) / 60000
    );
    // Auto-classify as DELAYED if taken 30+ minutes late
    if (this.status === DoseStatus.TAKEN && this.delayMinutes > 30) {
      this.status = DoseStatus.DELAYED;
    }
  }
  next();
});

// ─── Static Methods ───────────────────────────────────────────────────────────

MedicineLogSchema.statics.getAdherenceRate = async function (
  userId: Types.ObjectId,
  days: number = 30
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [result] = await this.aggregate([
    {
      $match: {
        userId,
        scheduledAt: { $gte: since },
        status: { $ne: DoseStatus.PENDING },
      },
    },
    {
      $group: {
        _id: null,
        total:  { $sum: 1 },
        taken:  { $sum: { $cond: [{ $in: ["$status", [DoseStatus.TAKEN, DoseStatus.DELAYED]] }, 1, 0] } },
      },
    },
    {
      $project: {
        adherence: {
          $multiply: [{ $divide: ["$taken", "$total"] }, 100],
        },
      },
    },
  ]);

  return result ? Math.round(result.adherence) : 100;
};

MedicineLogSchema.statics.getTodayMissedDoses = function (familyId: Types.ObjectId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    familyId,
    status: DoseStatus.MISSED,
    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate("userId", "firstName lastName avatar")
    .populate("medicineId", "name strength form");
};

MedicineLogSchema.statics.getDailySummary = async function (
  medicineId: Types.ObjectId,
  date: Date
) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const [result] = await this.aggregate([
    { $match: { medicineId, scheduledAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        taken:   { $sum: { $cond: [{ $in: ["$status", ["taken", "delayed"]] }, 1, 0] } },
        missed:  { $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] } },
        skipped: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
      },
    },
  ]);

  return result || { taken: 0, missed: 0, skipped: 0 };
};

// ─── Export ───────────────────────────────────────────────────────────────────
const MedicineLog = model<IMedicineLog, IMedicineLogModel>("MedicineLog", MedicineLogSchema);
export default MedicineLog;
