import { Document, Model, Schema, model, Types } from "mongoose";

export interface IMedicine extends Document {
  user: Types.ObjectId;
  addedBy: Types.ObjectId;
  name: string;
  dosage: number;
  unit: string;
  frequency: string;
  timesPerDay: string[];
  startDate: Date;
  endDate?: Date;
  totalQuantity?: number;
  currentStock?: number;
  refillThreshold: number;
  notes?: string;
  isActive: boolean;
  scheduledTimes: string[];
}

const MedicineSchema = new Schema<IMedicine>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    dosage: { type: Number, required: true },
    unit: { type: String, default: "mg" },
    frequency: { type: String, required: true },
    timesPerDay: [{ type: String }],
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    totalQuantity: { type: Number },
    currentStock: { type: Number },
    refillThreshold: { type: Number, default: 5 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    scheduledTimes: [{ type: String }],
  },
  { timestamps: true }
);

const Medicine = model<IMedicine>("Medicine", MedicineSchema);
export default Medicine;