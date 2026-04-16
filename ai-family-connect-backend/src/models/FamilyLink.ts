import { Document, Model, Schema, model, Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** The status lifecycle of a family invite/link */
export enum LinkStatus {
  PENDING  = "pending",   // Invite sent, not yet accepted
  ACTIVE   = "active",    // Member has accepted and is part of the family
  DECLINED = "declined",  // Invitee declined the request
  REMOVED  = "removed",   // Admin removed the member
  LEFT     = "left",      // Member voluntarily left the family group
}

/** Predefined relationship labels between members */
export enum RelationshipType {
  PARENT      = "parent",
  CHILD       = "child",
  GRANDPARENT = "grandparent",
  GRANDCHILD  = "grandchild",
  SIBLING     = "sibling",
  SPOUSE      = "spouse",
  GUARDIAN    = "guardian",
  CAREGIVER   = "caregiver",
  OTHER       = "other",
}

/** Permission flags that can be granted/revoked per member */
export interface IMemberPermissions {
  canViewLocation:     boolean;  // See this member's live location
  canSendAlerts:       boolean;  // Send alerts/pings to this member
  canViewHealthData:   boolean;  // Access health records
  canViewMoodData:     boolean;  // Access mood entries
  canManageMembers:    boolean;  // Add/remove family members (family-admin only)
  canViewExpenses:     boolean;  // Access shared expense tracker
  canAssignTasks:      boolean;  // Create and assign tasks to others
}

// ─── Document Interface ───────────────────────────────────────────────────────

export interface IFamilyLink extends Document {
  /** The owning family group */
  familyId: Types.ObjectId;

  /** The member being linked (undefined until invite is accepted) */
  memberId?: Types.ObjectId;

  /** The admin/family-coordinator who sent the invite */
  invitedBy: Types.ObjectId;

  /** Email address the invite was sent to */
  inviteEmail: string;

  /** Human-readable relationship label */
  relationship: RelationshipType;

  /** Custom relationship label when type === "other" */
  customRelationship?: string;

  /** Current lifecycle state of this link */
  status: LinkStatus;

  /** Secure random token included in the invite URL */
  inviteToken: string;

  /** When the invite token expires */
  inviteTokenExpires: Date;

  /** Granular permissions for this member within the family */
  permissions: IMemberPermissions;

  /** Optional personal note from the inviter */
  inviteMessage?: string;

  /** When the member accepted the invite */
  acceptedAt?: Date;

  /** When the link was removed/left */
  terminatedAt?: Date;

  /** Reason for removal (admin-filled) */
  terminationReason?: string;

  /** Whether member has admin privileges in this family */
  isFamilyAdmin: boolean;

  /** Soft delete flag */
  isDeleted: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // ── Instance Methods ──────────────────────────────────────
  isInviteValid(): boolean;
  activate(memberId: Types.ObjectId): Promise<IFamilyLink>;
}

/** Static helpers on the FamilyLink model */
export interface IFamilyLinkModel extends Model<IFamilyLink> {
  findActiveMembers(familyId: Types.ObjectId): Promise<IFamilyLink[]>;
  findByToken(token: string): Promise<IFamilyLink | null>;
  isMemberOfFamily(memberId: Types.ObjectId, familyId: Types.ObjectId): Promise<boolean>;
}

// ─── Sub-document Schema ──────────────────────────────────────────────────────

const MemberPermissionsSchema = new Schema<IMemberPermissions>(
  {
    canViewLocation:   { type: Boolean, default: true },
    canSendAlerts:     { type: Boolean, default: true },
    canViewHealthData: { type: Boolean, default: false },
    canViewMoodData:   { type: Boolean, default: true },
    canManageMembers:  { type: Boolean, default: false },
    canViewExpenses:   { type: Boolean, default: true },
    canAssignTasks:    { type: Boolean, default: true },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const FamilyLinkSchema = new Schema<IFamilyLink, IFamilyLinkModel>(
  {
    // ── Core References ─────────────────────────────────────
    familyId: {
      type: Schema.Types.ObjectId, ref: "Family",
      required: [true, "Family ID is required"],
      index: true,
    },
    memberId: {
      type: Schema.Types.ObjectId, ref: "User",
      index: true,
      // Populated once invite is accepted
    },
    invitedBy: {
      type: Schema.Types.ObjectId, ref: "User",
      required: [true, "Inviter reference is required"],
    },

    // ── Invite Details ──────────────────────────────────────
    inviteEmail: {
      type: String, required: [true, "Invite email is required"],
      lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    inviteMessage: {
      type: String, maxlength: [500, "Invite message cannot exceed 500 characters"],
    },
    inviteToken: {
      type: String, required: true,
      unique: true, index: true, select: false,
    },
    inviteTokenExpires: {
      type: Date, required: true,
    },

    // ── Relationship ─────────────────────────────────────────
    relationship: {
      type: String,
      enum: Object.values(RelationshipType),
      required: [true, "Relationship type is required"],
    },
    customRelationship: {
      type: String, maxlength: 60, trim: true,
    },

    // ── Status ───────────────────────────────────────────────
    status: {
      type: String,
      enum: Object.values(LinkStatus),
      default: LinkStatus.PENDING,
      index: true,
    },

    // ── Permissions ──────────────────────────────────────────
    permissions: {
      type: MemberPermissionsSchema,
      default: () => ({}),
    },

    // ── Admin flag ───────────────────────────────────────────
    isFamilyAdmin: { type: Boolean, default: false },

    // ── Lifecycle Timestamps ─────────────────────────────────
    acceptedAt:         { type: Date },
    terminatedAt:       { type: Date },
    terminationReason:  { type: String, maxlength: 300 },

    // ── Soft Delete ──────────────────────────────────────────
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Compound Indexes ─────────────────────────────────────────────────────────

/** Prevent duplicate active links for the same member in the same family */
FamilyLinkSchema.index(
  { familyId: 1, memberId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { status: "active" } }
);

/** Speed up "pending invites for this email in this family" lookups */
FamilyLinkSchema.index({ familyId: 1, inviteEmail: 1, status: 1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────

/** Returns true if the invite token has not yet expired */
FamilyLinkSchema.methods.isInviteValid = function (this: IFamilyLink): boolean {
  return (
    this.status === LinkStatus.PENDING &&
    this.inviteTokenExpires > new Date()
  );
};

/**
 * Transitions a PENDING link to ACTIVE once the invitee accepts.
 * Sets memberId, status, and acceptedAt in one atomic operation.
 */
FamilyLinkSchema.methods.activate = async function (
  this: IFamilyLink,
  memberId: Types.ObjectId
): Promise<IFamilyLink> {
  this.memberId   = memberId;
  this.status     = LinkStatus.ACTIVE;
  this.acceptedAt = new Date();
  return this.save();
};

// ─── Static Methods ───────────────────────────────────────────────────────────

FamilyLinkSchema.statics.findActiveMembers = function (
  familyId: Types.ObjectId
): Promise<IFamilyLink[]> {
  return this.find({ familyId, status: LinkStatus.ACTIVE, isDeleted: false })
    .populate("memberId", "firstName lastName avatar role lastActiveAt");
};

FamilyLinkSchema.statics.findByToken = function (
  token: string
): Promise<IFamilyLink | null> {
  return this.findOne({
    inviteToken: token,
    status: LinkStatus.PENDING,
    inviteTokenExpires: { $gt: new Date() },
    isDeleted: false,
  }).select("+inviteToken");
};

FamilyLinkSchema.statics.isMemberOfFamily = async function (
  memberId: Types.ObjectId,
  familyId: Types.ObjectId
): Promise<boolean> {
  const link = await this.findOne({
    memberId, familyId, status: LinkStatus.ACTIVE, isDeleted: false,
  });
  return !!link;
};

// ─── Export ───────────────────────────────────────────────────────────────────
const FamilyLink = model<IFamilyLink, IFamilyLinkModel>("FamilyLink", FamilyLinkSchema);
export default FamilyLink;
