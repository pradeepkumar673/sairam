import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Frequency pattern of the medication schedule */
export enum MedicineFrequency {
  ONCE_DAILY       = "once_daily",
  TWICE_DAILY      = "twice_daily",
  THREE_TIMES_DAY  = "three_times_daily",
  FOUR_TIMES_DAY   = "four_times_daily",
  EVERY_X_HOURS    = "every_x_hours",   // customIntervalHours required
  WEEKLY           = "weekly",
  BIWEEKLY         = "biweekly",
  MONTHLY          = "monthly",
  AS_NEEDED        = "as_needed",       // PRN — no scheduled reminders
  CUSTOM           = "custom",          // customSchedule array used
}

/** Physical form of the medication */
export enum MedicineForm {
  TABLET     = "tablet",
  CAPSULE    = "capsule",
  LIQUID     = "liquid",
  INJECTION  = "injection",
  PATCH      = "patch",
  INHALER    = "inhaler",
  DROPS      = "drops",
  CREAM      = "cream",
  SUPPOSITORY = "suppository",
  OTHER      = "other",
}

/** Current state of this prescription record */
export enum MedicineStatus {
  ACTIVE    = "active",
  PAUSED    = "paused",     // Temporarily stopped by carer
  COMPLETED = "completed",  // Course finished
  CANCELLED = "cancelled",  // Discontinued by physician
}

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/** A specific time slot in a custom schedule */
export interface ICustomScheduleSlot {
  time: string;           // "HH:MM" 24-hour format
  dosage: number;         // Amount for this specific slot (may differ from default)
  label?: string;         // e.g. "After breakfast"
}

/** Reminder configuration for this medicine */
export interface IMedicineReminder {
  enabled: boolean;
  minutesBefore: number;     // How many minutes before dose time to alert
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  repeatCount: number;       // How many times to repeat if not acknowledged
  repeatIntervalMinutes: number;
}

/** Refill tracking details */
export interface IRefillInfo {
  currentStock: number;      // Pills/doses remaining
  unit: string;              // "tablets", "ml", "patches", etc.
  refillAt: number;          // Trigger refill alert when stock reaches this number
  lastRefillDate?: Date;
  nextRefillDate?: Date;
  pharmacyName?: string;
  pharmacyPhone?: string;
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IMedicine extends Document {
  /** User this medicine belongs to (typically an elder) */
  userId: Types.ObjectId;

  /** Family group — enables family admins to manage elder's medicines */
  familyId: Types.ObjectId;

  /** User who added/manages this prescription (family member or elder themselves) */
  managedBy: Types.ObjectId;

  // ── Drug Identity ───────────────────────────────────────
  name: string;             // Brand or generic name
  genericName?: string;     // Generic chemical name
  manufacturer?: string;
  form: MedicineForm;
  strength: string;         // e.g. "500mg", "10ml"
  color?: string;           // Visual identifier for elderly users
  shape?: string;           // "round", "oval", "capsule-shaped"
  imageUrl?: string;        // Photo of the pill for confirmation

  // ── Dosage ──────────────────────────────────────────────
  dosage: number;           // Amount per intake
  dosageUnit: string;       // "mg", "ml", "tablet(s)", "drops"
  maxDailyDosage?: number;  // Safety ceiling

  // ── Schedule ────────────────────────────────────────────
  frequency: MedicineFrequency;
  scheduledTimes: string[];              // ["08:00", "20:00"] for fixed-time schedules
  customIntervalHours?: number;          // Used with EVERY_X_HOURS
  customSchedule?: ICustomScheduleSlot[]; // Used with CUSTOM frequency
  daysOfWeek?: number[];                 // 0=Sunday … 6=Saturday (for weekly/biweekly)

  // ── Course Dates ────────────────────────────────────────
  startDate: Date;
  endDate?: Date;            // Undefined = ongoing prescription
  prescribedBy?: string;     // Doctor's name
  prescriptionNumber?: string;

  // ── Refill Tracking ─────────────────────────────────────
  refillInfo: IRefillInfo;

  // ── Reminders ───────────────────────────────────────────
  reminder: IMedicineReminder;

  // ── Notes ───────────────────────────────────────────────
  instructions?: string;    // "Take with food", "Avoid sunlight", etc.
  sideEffectsToWatch?: string[];
  notes?: string;

  // ── Status ──────────────────────────────────────────────
  status: MedicineStatus;

  // ── Stats (updated by cron / MedicineLog aggregation) ───
  totalDosesTaken: number;
  totalDosesMissed: number;
  adherenceRate: number;     // Percentage 0–100, recalculated periodically

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // ── Instance Methods ──────────────────────────────────────
  isActive(): boolean;
  isDue(atTime?: Date): boolean;
}

/** Static helpers */
export interface IMedicineModel extends Model<IMedicine> {
  findActiveForUser(userId: Types.ObjectId): Promise<IMedicine[]>;
  findLowStock(familyId: Types.ObjectId): Promise<IMedicine[]>;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const CustomScheduleSlotSchema = new Schema<ICustomScheduleSlot>(
  {
    time:    { type: String, required: true, match: [/^\d{2}:\d{2}$/, "Time must be HH:MM"] },
    dosage:  { type: Number, required: true, min: 0 },
    label:   { type: String, maxlength: 60 },
  },
  { _id: false }
);

const MedicineReminderSchema = new Schema<IMedicineReminder>(
  {
    enabled:               { type: Boolean, default: true },
    minutesBefore:         { type: Number, default: 15, min: 0, max: 120 },
    soundEnabled:          { type: Boolean, default: true },
    vibrationEnabled:      { type: Boolean, default: true },
    repeatCount:           { type: Number, default: 3, min: 1, max: 10 },
    repeatIntervalMinutes: { type: Number, default: 5, min: 1, max: 30 },
  },
  { _id: false }
);

const RefillInfoSchema = new Schema<IRefillInfo>(
  {
    currentStock:    { type: Number, default: 0, min: 0 },
    unit:            { type: String, default: "tablets" },
    refillAt:        { type: Number, default: 7, min: 0 },
    lastRefillDate:  { type: Date },
    nextRefillDate:  { type: Date },
    pharmacyName:    { type: String, trim: true },
    pharmacyPhone:   { type: String, trim: true },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const MedicineSchema = new Schema<IMedicine, IMedicineModel>(
  {
    // ── References ────────────────────────────────────────
    userId:    { type: Schema.Types.ObjectId, ref: "User",   required: true, index: true },
    familyId:  { type: Schema.Types.ObjectId, ref: "Family", required: true, index: true },
    managedBy: { type: Schema.Types.ObjectId, ref: "User",   required: true },

    // ── Drug Identity ─────────────────────────────────────
    name:         { type: String, required: [true, "Medicine name is required"], trim: true, maxlength: 150 },
    genericName:  { type: String, trim: true, maxlength: 150 },
    manufacturer: { type: String, trim: true, maxlength: 100 },
    form: {
      type: String, enum: Object.values(MedicineForm),
      required: [true, "Medicine form is required"],
    },
    strength:  { type: String, required: [true, "Strength is required"], trim: true },
    color:     { type: String, trim: true },
    shape:     { type: String, trim: true },
    imageUrl:  { type: String },

    // ── Dosage ────────────────────────────────────────────
    dosage:         { type: Number, required: true, min: [0.01, "Dosage must be positive"] },
    dosageUnit:     { type: String, required: true, trim: true, maxlength: 20 },
    maxDailyDosage: { type: Number, min: 0 },

    // ── Schedule ──────────────────────────────────────────
    frequency: {
      type: String, enum: Object.values(MedicineFrequency),
      required: [true, "Frequency is required"],
    },
    scheduledTimes:       { type: [String], default: [] },
    customIntervalHours:  { type: Number, min: 1, max: 72 },
    customSchedule:       { type: [CustomScheduleSlotSchema], default: [] },
    daysOfWeek:           { type: [Number], validate: { validator: (arr: number[]) => arr.every(d => d >= 0 && d <= 6), message: "Days of week must be 0–6" } },

    // ── Course Dates ──────────────────────────────────────
    startDate:           { type: Date, required: [true, "Start date is required"] },
    endDate:             { type: Date },
    prescribedBy:        { type: String, trim: true, maxlength: 100 },
    prescriptionNumber:  { type: String, trim: true },

    // ── Refill ────────────────────────────────────────────
    refillInfo: { type: RefillInfoSchema, default: () => ({}) },

    // ── Reminder ─────────────────────────────────────────
    reminder: { type: MedicineReminderSchema, default: () => ({}) },

    // ── Instructions ─────────────────────────────────────
    instructions:        { type: String, maxlength: 500 },
    sideEffectsToWatch:  { type: [String], default: [] },
    notes:               { type: String, maxlength: 1000 },

    // ── Status ────────────────────────────────────────────
    status: {
      type: String, enum: Object.values(MedicineStatus),
      default: MedicineStatus.ACTIVE, index: true,
    },

    // ── Stats ─────────────────────────────────────────────
    totalDosesTaken:  { type: Number, default: 0, min: 0 },
    totalDosesMissed: { type: Number, default: 0, min: 0 },
    adherenceRate:    { type: Number, default: 100, min: 0, max: 100 },

    // ── Soft Delete ───────────────────────────────────────
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
MedicineSchema.index({ userId: 1, status: 1 });
MedicineSchema.index({ familyId: 1, status: 1 });
MedicineSchema.index({ userId: 1, "refillInfo.currentStock": 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

/** True if today is within the medicine's course dates */
MedicineSchema.virtual("isOngoing").get(function (this: IMedicine) {
  const now = new Date();
  const started = this.startDate <= now;
  const notEnded = !this.endDate || this.endDate >= now;
  return started && notEnded;
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

MedicineSchema.methods.isActive = function (this: IMedicine): boolean {
  return this.status === MedicineStatus.ACTIVE && !this.isDeleted;
};

/** Rough check: is any scheduled time within the next 30-minute window? */
MedicineSchema.methods.isDue = function (this: IMedicine, atTime: Date = new Date()): boolean {
  if (!this.isActive()) return false;
  const hhmm = atTime.toTimeString().slice(0, 5);
  return this.scheduledTimes.some((t) => {
    const [sH, sM] = t.split(":").map(Number);
    const [aH, aM] = hhmm.split(":").map(Number);
    const diffMin = (sH * 60 + sM) - (aH * 60 + aM);
    return diffMin >= 0 && diffMin <= 30;
  });
};

// ─── Static Methods ───────────────────────────────────────────────────────────

MedicineSchema.statics.findActiveForUser = function (userId: Types.ObjectId) {
  return this.find({ userId, status: MedicineStatus.ACTIVE, isDeleted: false })
    .sort({ name: 1 });
};

MedicineSchema.statics.findLowStock = function (familyId: Types.ObjectId) {
  return this.find({
    familyId,
    status: MedicineStatus.ACTIVE,
    isDeleted: false,
    $expr: { $lte: ["$refillInfo.currentStock", "$refillInfo.refillAt"] },
  });
};

// ─── Export ───────────────────────────────────────────────────────────────────
const Medicine = model<IMedicine, IMedicineModel>("Medicine", MedicineSchema);
export default Medicine;
