import { Document, Model, Schema, model, Types } from "mongoose";

export interface IVideoCallLog extends Document {
  initiatedBy: Types.ObjectId;
  familyId: Types.ObjectId;
  participants: Types.ObjectId[];
  duration: number;
  callType: "video" | "audio";
  status: string;
  notes?: string;
}

const VideoCallLogSchema = new Schema<IVideoCallLog>(
  {
    initiatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    duration: { type: Number },
    callType: { type: String, enum: ["video", "audio"], default: "video" },
    status: { type: String, default: "completed" },
    notes: { type: String },
  },
  { timestamps: true }
);

const VideoCallLog = model<IVideoCallLog>("VideoCallLog", VideoCallLogSchema);
export default VideoCallLog;