import { Document, Model, Schema, model, Types } from "mongoose";

export interface IGameScore extends Document {
  userId: Types.ObjectId;
  gameName: string;
  score: number;
  level?: number;
  duration?: number;
  metadata?: any;
}

const GameScoreSchema = new Schema<IGameScore>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gameName: { type: String, required: true },
    score: { type: Number, required: true },
    level: { type: Number },
    duration: { type: Number },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const GameScore = model<IGameScore>("GameScore", GameScoreSchema);
export default GameScore;