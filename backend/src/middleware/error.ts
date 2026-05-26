import { ZodError } from "zod";
import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { isProduction } from "../config/env.js";

export const notFound: ErrorRequestHandler = (err, _req, res, _next) => {
  res.status(404).json({
    error: {
      message: err?.message ?? "Not found"
    }
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
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

  const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;
  return res.status(statusCode).json({
    error: {
      message: statusCode === 500 ? "Something went wrong." : err.message,
      details: isProduction ? undefined : err?.stack
    }
  });
};
