import { Document, Model, Schema, model, Types } from "mongoose";

export interface IMedicineLog extends Document {
  medicine: Types.ObjectId;
  user: Types.ObjectId;
  loggedBy: Types.ObjectId;
  status: "taken" | "missed" | "skipped";
  scheduledTime: Date;
  takenAt?: Date;
  notes?: string;
}

const MedicineLogSchema = new Schema<IMedicineLog>(
  {
    medicine: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    loggedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["taken", "missed", "skipped"], required: true },
    scheduledTime: { type: Date, required: true },
    takenAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

const MedicineLog = model<IMedicineLog>("MedicineLog", MedicineLogSchema);
export default MedicineLog;