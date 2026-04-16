/**
 * types/socket.d.ts
 * Extends Socket.io Socket type with authenticated user data
 */

import "socket.io";

declare module "socket.io" {
  interface Socket {
    data: {
      userId: string;
      familyId?: string;
      role?: string;
      name?: string;
    };
  }
}
