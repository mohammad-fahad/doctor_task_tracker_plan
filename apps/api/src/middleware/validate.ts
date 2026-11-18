import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../utils/ApiError.js";

export type ValidationSource = "body" | "query" | "params";

export type ValidatedData = Record<ValidationSource, Record<string, unknown>>;

declare global {
  // Required to extend Express's Response.locals type for validated request data.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      validated: ValidatedData;
    }
  }
}

export function initializeValidated(_req: Request, res: Response, next: NextFunction) {
  res.locals.validated = { body: {}, query: {}, params: {} };
  next();
}

export function validate<T extends object>(schema: ZodType<T>, source: ValidationSource = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new ApiError(400, "Validation failed", result.error.flatten()));
    }
    res.locals.validated = {
      ...res.locals.validated,
      [source]: { ...res.locals.validated[source], ...result.data },
    };
    next();
  };
}

export function validated<T>(res: Response, source: ValidationSource): T {
  return res.locals.validated[source] as T;
}
