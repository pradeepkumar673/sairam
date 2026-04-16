import { Document, Model, Schema, model, Types } from "mongoose";

export interface IUserStory extends Document {
  userId: Types.ObjectId;
  title: string;
  content: string;
  tags?: string[];
  mediaUrl?: string;
}

const UserStorySchema = new Schema<IUserStory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: [{ type: String }],
    mediaUrl: { type: String },
  },
  { timestamps: true }
);

const UserStory = model<IUserStory>("UserStory", UserStorySchema);
export default UserStory;