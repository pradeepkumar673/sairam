import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Three distinct member roles in the Family Connect ecosystem */
export enum UserRole {
  ELDER = "elder",       // Senior family member — receives fall/SOS monitoring
  STUDENT = "student",   // Young member — homework, mood, screen-time features
  FAMILY = "family",     // Parent / guardian — admin-level family coordinator
}

/** Account lifecycle state */
export enum AccountStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING_VERIFICATION = "pending_verification",
}

// ─── Sub-document interfaces ──────────────────────────────────────────────────

/** Emergency contact stored directly on the user document */
export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

/** Granular notification preferences per channel and feature */
export interface INotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  sosAlerts: boolean;
  medicineReminders: boolean;
  moodAlerts: boolean;
  fallAlerts: boolean;
  checkInReminders: boolean;
}

/** Health metadata relevant mainly to elders */
export interface IHealthProfile {
  bloodType?: string;           // e.g. "A+"
  allergies: string[];
  medicalConditions: string[];
  primaryPhysician?: string;
  hospitalPreference?: string;
}

/** Device/push-notification token record */
export interface IDeviceToken {
  token: string;
  platform: "ios" | "android" | "web";
  registeredAt: Date;
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IUser extends Document {
  // Identity
  firstName: string;
  lastName: string;
  email: string;
  password: string;                        // bcrypt hash — NEVER return to client
  phone?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  avatar?: string;                         // relative upload path or CDN URL

  // Role & Status
  role: UserRole;
  accountStatus: AccountStatus;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;

  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordChangedAt?: Date;

  // Family relationship
  familyId?: Types.ObjectId;              // Reference to Family document
  familyNickname?: string;               // "Grandpa Joe", "Little Mia", etc.

  // Profiles
  emergencyContacts: IEmergencyContact[];
  notificationPreferences: INotificationPreferences;
  healthProfile: IHealthProfile;
  deviceTokens: IDeviceToken[];

  // Location consent
  locationSharingEnabled: boolean;
  lastKnownLocation?: {
    type: "Point";
    coordinates: [number, number];        // [longitude, latitude]
    accuracy?: number;
    recordedAt: Date;
  };

  // Activity tracking
  lastActiveAt: Date;
  lastLoginAt?: Date;
  loginCount: number;

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps (auto-managed by Mongoose)
  createdAt: Date;
  updatedAt: Date;

  // ── Instance Methods ──────────────────────────────────────
  fullName(): string;
  isPasswordResetTokenValid(): boolean;
}

/** Static methods on the User model */
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findActiveFamilyMembers(familyId: Types.ObjectId): Promise<IUser[]>;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name:         { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone:        { type: String, required: true, trim: true },
    email:        { type: String, trim: true, lowercase: true },
    isPrimary:    { type: Boolean, default: false },
  },
  { _id: true }
);

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    email:              { type: Boolean, default: true },
    push:               { type: Boolean, default: true },
    sms:                { type: Boolean, default: false },
    sosAlerts:          { type: Boolean, default: true },
    medicineReminders:  { type: Boolean, default: true },
    moodAlerts:         { type: Boolean, default: true },
    fallAlerts:         { type: Boolean, default: true },
    checkInReminders:   { type: Boolean, default: true },
  },
  { _id: false }
);

const HealthProfileSchema = new Schema<IHealthProfile>(
  {
    bloodType:           { type: String, trim: true },
    allergies:           { type: [String], default: [] },
    medicalConditions:   { type: [String], default: [] },
    primaryPhysician:    { type: String, trim: true },
    hospitalPreference:  { type: String, trim: true },
  },
  { _id: false }
);

const DeviceTokenSchema = new Schema<IDeviceToken>(
  {
    token:        { type: String, required: true },
    platform:     { type: String, enum: ["ios", "android", "web"], required: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const UserSchema = new Schema<IUser, IUserModel>(
  {
    // ── Identity ───────────────────────────────────────────
    firstName: {
      type: String, required: [true, "First name is required"],
      trim: true, maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String, required: [true, "Last name is required"],
      trim: true, maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String, required: [true, "Email is required"],
      unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String, required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,   // Never returned in queries by default
    },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },
    avatar: { type: String, default: "" },

    // ── Role & Status ───────────────────────────────────────
    role: {
      type: String, required: true,
      enum: Object.values(UserRole),
      default: UserRole.FAMILY,
    },
    accountStatus: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.PENDING_VERIFICATION,
    },
    isEmailVerified:          { type: Boolean, default: false },
    emailVerificationToken:   { type: String, select: false },
    emailVerificationExpires: { type: Date,   select: false },

    // ── Password Reset ──────────────────────────────────────
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },
    passwordChangedAt:    { type: Date },

    // ── Family ──────────────────────────────────────────────
    familyId:       { type: Schema.Types.ObjectId, ref: "Family", index: true },
    familyNickname: { type: String, trim: true, maxlength: 40 },

    // ── Nested documents ────────────────────────────────────
    emergencyContacts:        { type: [EmergencyContactSchema], default: [] },
    notificationPreferences:  { type: NotificationPreferencesSchema, default: () => ({}) },
    healthProfile:            { type: HealthProfileSchema, default: () => ({}) },
    deviceTokens:             { type: [DeviceTokenSchema], default: [] },

    // ── Location ────────────────────────────────────────────
    locationSharingEnabled: { type: Boolean, default: true },
    lastKnownLocation: {
      type: {
        type:        { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number] },
        accuracy:    { type: Number },
        recordedAt:  { type: Date },
      },
      default: undefined,
    },

    // ── Activity ────────────────────────────────────────────
    lastActiveAt: { type: Date, default: Date.now },
    lastLoginAt:  { type: Date },
    loginCount:   { type: Number, default: 0 },

    // ── Soft Delete ─────────────────────────────────────────
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Strip sensitive fields before any JSON serialisation
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ familyId: 1, role: 1 });
UserSchema.index({ "lastKnownLocation": "2dsphere" });   // Geo queries
UserSchema.index({ isDeleted: 1, accountStatus: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
UserSchema.virtual("fullNameVirtual").get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual("age").get(function (this: IUser) {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - this.dateOfBirth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/** Returns full display name */
UserSchema.methods.fullName = function (this: IUser): string {
  return `${this.firstName} ${this.lastName}`;
};

/** Checks if the password-reset token is still within its validity window */
UserSchema.methods.isPasswordResetTokenValid = function (this: IUser): boolean {
  if (!this.passwordResetExpires) return false;
  return this.passwordResetExpires > new Date();
};

// ─── Static Methods ───────────────────────────────────────────────────────────

UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase(), isDeleted: false });
};

UserSchema.statics.findActiveFamilyMembers = function (familyId: Types.ObjectId) {
  return this.find({
    familyId,
    isDeleted: false,
    accountStatus: AccountStatus.ACTIVE,
  }).select("-password");
};

// ─── Pre-save Hook (password changed timestamp) ───────────────────────────────
UserSchema.pre<IUser>("save", function (next) {
  if (this.isModified("password") && !this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  next();
});

// ─── Export ───────────────────────────────────────────────────────────────────
const User = model<IUser, IUserModel>("User", UserSchema);
export default User;
