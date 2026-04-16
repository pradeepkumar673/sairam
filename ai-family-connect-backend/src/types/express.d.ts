/**
 * types/express.d.ts
 * Extends Express Request type with custom fields
 */

import { IUser } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      language?: string;
    }
  }
}

export {};
