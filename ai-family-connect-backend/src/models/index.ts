/**
 * src/models/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central barrel export for ALL Mongoose models used in the app.
 *
 * Only the 10 models required by the 22 core features are exported.
 * All bloat models (Event, Expense, Task, CheckIn, Location, etc.) have been
 * removed from the codebase.
 *
 * Usage:
 *   import { User, Medicine, SOSAlert } from "@models/index";
 *   // or named:
 *   import { User }       from "../models";
 *   import { MoodEntry }  from "../models";
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 1. Identity & Family ─────────────────────────────────────────────────────
export { default as User }        from "./User";
export { default as FamilyLink }  from "./FamilyLink";

// ── 2. Medicine (Features 4, 6, 7) ───────────────────────────────────────────
export { default as Medicine }    from "./Medicine";
export { default as MedicineLog } from "./MedicineLog";

// ── 3. Mood & Emotional AI (Features 8–13) ───────────────────────────────────
export { default as MoodEntry }   from "./MoodEntry";

// ── 4. Safety (Features 1, 2, 3) ─────────────────────────────────────────────
export { default as FallEvent }   from "./FallEvent";
export { default as SOSAlert }    from "./SOSAlert";

// ── 5. Communication (Feature 18, 19) ────────────────────────────────────────
export { default as ChatMessage } from "./ChatMessage";
export { default as VideoCallLog } from "./VideoCallLog";

// ── 6. AI Companion & Engagement (Features 12, 14) ───────────────────────────
export { default as UserStory }   from "./UserStory";
export { default as GameScore }   from "./GameScore";

// ── Type & Enum Re-exports ────────────────────────────────────────────────────
// Controllers, sockets, and cron jobs can import enums directly from "@models/index"
export * from "./User";
export * from "./FamilyLink";
export * from "./Medicine";
export * from "./MedicineLog";
export * from "./MoodEntry";
export * from "./FallEvent";
export * from "./SOSAlert";
export * from "./ChatMessage";
export * from "./VideoCallLog";
export * from "./UserStory";
export * from "./GameScore";
