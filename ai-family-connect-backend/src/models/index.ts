/**
 * @file src/models/index.ts
 * ─────────────────────────────────────────────────────────────────
 * Central barrel export for all Mongoose models.
 * Import from here throughout the app:
 *   import { User, FamilyLink, Medicine } from "@models/index";
 * ─────────────────────────────────────────────────────────────────
 */

// ── Core Identity ────────────────────────────────────────────────
export { default as User }        from "./User";
export { default as FamilyLink }  from "./FamilyLink";

// ── Medicine & Health ─────────────────────────────────────────────
export { default as Medicine }    from "./Medicine";
export { default as MedicineLog } from "./MedicineLog";

// ── Wellness & Safety ─────────────────────────────────────────────
export { default as MoodEntry }   from "./MoodEntry";
export { default as FallEvent }   from "./FallEvent";
export { default as SOSAlert }    from "./SOSAlert";

// ── Communication ─────────────────────────────────────────────────
export { default as ChatMessage } from "./ChatMessage";
export { default as VideoCallLog } from "./VideoCallLog";

// ── AI Companion & Engagement ─────────────────────────────────────
export { default as UserStory }   from "./UserStory";
export { default as GameScore }   from "./GameScore";

// ── Type / Enum Re-exports ────────────────────────────────────────
export * from "./User";
export * from "./FamilyLink";
export * from "./Medicine";
export * from "./MedicineLog";
export * from "./MoodEntry";
export * from "./FallEvent";
export * from "./SOSAlert";
export * from "./ChatMessage";
export * from "./UserStory";
export * from "./GameScore";
export * from "./VideoCallLog";
