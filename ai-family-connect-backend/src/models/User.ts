import { Document, Model, Schema, model } from "mongoose";

export enum UserRole {
  ELDER = "elder",
  STUDENT = "student",
  FAMILY = "family",
}

export enum AccountStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING_VERIFICATION = "pending_verification",
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  avatar?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  isEmailVerified: boolean;
  inviteCode: string;
  lastLogin?: Date;
  fullName(): string;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    avatar: { type: String },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.FAMILY },
    accountStatus: { type: String, enum: Object.values(AccountStatus), default: AccountStatus.PENDING_VERIFICATION },
    isEmailVerified: { type: Boolean, default: false },
    inviteCode: { type: String, required: true, unique: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

UserSchema.methods.fullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

const User = model<IUser>("User", UserSchema);
export default User;