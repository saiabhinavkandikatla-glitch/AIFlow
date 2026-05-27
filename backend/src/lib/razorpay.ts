import crypto from "node:crypto";
import { env, isRazorpayConfigured } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const RAZORPAY_API_URL = "https://api.razorpay.com/v1";

export type RazorpaySubscription = {
  id: string;
  plan_id: string;
  customer_id?: string | null;
  status: string;
  current_end?: number | null;
  end_at?: number | null;
  short_url?: string | null;
  notes?: Record<string, string | undefined> | null;
};

type RazorpayErrorBody = {
  error?: {
    code?: string;
    description?: string;
    field?: string;
  };
};

const authHeader = () => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, "Razorpay is not configured yet.");
  }

  return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;
};

export const razorpayRequest = async <T>(path: string, init: RequestInit = {}) => {
  if (!isRazorpayConfigured) {
    throw new AppError(503, "Razorpay is not configured yet.");
  }

  const response = await fetch(`${RAZORPAY_API_URL}${path}`, {
    ...init,
    headers: {
      authorization: authHeader(),
      "content-type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as RazorpayErrorBody | null;
    throw new AppError(
      response.status,
      body?.error?.description ?? `Razorpay request failed with status ${response.status}.`,
      {
        code: body?.error?.code,
        field: body?.error?.field
      }
    );
  }

  return (await response.json()) as T;
};

export const createRazorpaySubscription = (payload: {
  planId: string;
  userId: string;
  plan: string;
  email: string;
  name?: string | null;
}) =>
  razorpayRequest<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: payload.planId,
      total_count: 120,
      quantity: 1,
      customer_notify: true,
      notes: {
        userId: payload.userId,
        plan: payload.plan,
        email: payload.email,
        name: payload.name ?? undefined
      }
    })
  });

export const fetchRazorpaySubscription = (subscriptionId: string) =>
  razorpayRequest<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);

export const cancelRazorpaySubscription = (subscriptionId: string) =>
  razorpayRequest<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({
      cancel_at_cycle_end: true
    })
  });

export const signRazorpayPayload = (payload: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

export const verifyRazorpaySignature = (payload: string, signature: string, secret: string) => {
  const expected = signRazorpayPayload(payload, secret);
  const actual = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
};
