import { Document, Model, Schema, model, Types } from "mongoose";

export enum LinkStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  REMOVED = "removed",
}

export interface IFamilyLink extends Document {
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  status: LinkStatus;
  acceptedAt?: Date;
}

const FamilyLinkSchema = new Schema<IFamilyLink>(
  {
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: Object.values(LinkStatus), default: LinkStatus.PENDING },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

FamilyLinkSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const FamilyLink = model<IFamilyLink>("FamilyLink", FamilyLinkSchema);
export default FamilyLink;