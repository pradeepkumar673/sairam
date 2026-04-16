import { Document, Model, Schema, model, Types } from "mongoose";

export interface IMoodEntry extends Document {
  userId: Types.ObjectId;
  mood: string;
  moodScore: number;
  source: "facial" | "voice" | "manual";
  notes?: string;
  tags?: string[];
  aiInsights?: any;
}

const MoodEntrySchema = new Schema<IMoodEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    mood: { type: String, required: true },
    moodScore: { type: Number, min: 1, max: 100 },
    source: { type: String, enum: ["facial", "voice", "manual"], required: true },
    notes: { type: String },
    tags: [{ type: String }],
    aiInsights: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const MoodEntry = model<IMoodEntry>("MoodEntry", MoodEntrySchema);
export default MoodEntry;