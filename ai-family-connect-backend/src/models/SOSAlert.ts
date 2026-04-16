import { Document, Model, Schema, model, Types } from "mongoose";

export interface ISOSAlert extends Document {
  triggeredBy: Types.ObjectId;
  message: string;
  location?: { latitude: number; longitude: number; address?: string };
  status: "active" | "resolved";
  notifiedMembers: Types.ObjectId[];
  resolvedAt?: Date;
}

const SOSAlertSchema = new Schema<ISOSAlert>(
  {
    triggeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    status: { type: String, enum: ["active", "resolved"], default: "active" },
    notifiedMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

const SOSAlert = model<ISOSAlert>("SOSAlert", SOSAlertSchema);
export default SOSAlert;