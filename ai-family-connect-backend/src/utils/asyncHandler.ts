/**
 * utils/asyncHandler.ts
 * Wraps async route handlers to catch errors and forward to Express error middleware
 */
import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncFn): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
