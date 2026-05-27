import { ZodError } from "zod";
import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { isProduction } from "../config/env.js";

const isPrismaError = (err: unknown) =>
  Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      typeof (err as { code?: unknown }).code === "string" &&
      (err as { code: string }).code.startsWith("P")
  );

export const notFound: ErrorRequestHandler = (err, _req, res, _next) => {
  res.status(404).json({
    error: {
      message: err?.message ?? "Not found"
    }
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err) {
    console.error("Request failed", err);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: "Validation failed.",
        details: err.flatten()
      }
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        details: err.details
      }
    });
  }

  if (isPrismaError(err)) {
    return res.status(503).json({
      error: {
        message: "Database request failed. Check the Supabase DATABASE_URL/DIRECT_URL values and make sure migrations were applied.",
        details: isProduction ? undefined : err
      }
    });
  }

  const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;
  return res.status(statusCode).json({
    error: {
      message: statusCode === 500 ? "Something went wrong." : err.message,
      details: isProduction ? undefined : err?.stack
    }
  });
};
