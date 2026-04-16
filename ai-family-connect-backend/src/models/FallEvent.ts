import { Document, Model, Schema, model, Types } from "mongoose";

export interface IFallEvent extends Document {
  userId: Types.ObjectId;
  type: "fall" | "posture_alert" | "injury_photo";
  severity: "minor" | "moderate" | "severe" | "critical" | "unknown";
  description?: string;
  location?: { latitude: number; longitude: number };
  status: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  injuryPhotoUrl?: string;
  aiAnalysis?: any;
}

const FallEventSchema = new Schema<IFallEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["fall", "posture_alert", "injury_photo"], default: "fall" },
    severity: { type: String, enum: ["minor", "moderate", "severe", "critical", "unknown"], default: "unknown" },
    description: { type: String },
    location: {
      latitude: Number,
      longitude: Number,
    },
    status: { type: String, default: "unreviewed" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    injuryPhotoUrl: { type: String },
    aiAnalysis: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const FallEvent = model<IFallEvent>("FallEvent", FallEventSchema);
export default FallEvent;