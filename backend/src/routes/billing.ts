import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { env, isRazorpayConfigured } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import {
  cancelRazorpaySubscription,
  createRazorpaySubscription,
  fetchRazorpaySubscription,
  type RazorpaySubscription,
  verifyRazorpaySignature
} from "../lib/razorpay.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

type BillingPlan = "STARTER" | "PRO" | "TEAM";

const router = Router();

const checkoutSchema = z.object({
  plan: z.enum(["starter", "pro", "team"])
});

const verifyCheckoutSchema = z.object({
  plan: z.enum(["starter", "pro", "team"]),
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});

const activeSubscriptionStatuses = new Set(["authenticated", "active"]);

const requireBilling = () => {
  if (!isRazorpayConfigured) {
    throw new AppError(503, "Razorpay Billing is not configured yet.");
  }
};

const planIdForPlan = (plan: BillingPlan) => {
  const planId =
    plan === "STARTER"
      ? env.RAZORPAY_STARTER_PLAN_ID
      : plan === "PRO"
        ? env.RAZORPAY_PRO_PLAN_ID
        : env.RAZORPAY_TEAM_PLAN_ID;

  if (!planId) {
    const label = plan === "STARTER" ? "Starter" : plan === "PRO" ? "Pro" : "Team";
    throw new AppError(503, `${label} Razorpay plan ID is not configured.`);
  }

  return planId;
};

const planFromPlanId = (planId?: string | null): BillingPlan | null => {
  if (!planId) return null;
  if (planId === env.RAZORPAY_STARTER_PLAN_ID) return "STARTER";
  if (planId === env.RAZORPAY_PRO_PLAN_ID) return "PRO";
  if (planId === env.RAZORPAY_TEAM_PLAN_ID) return "TEAM";
  return null;
};

const normalizePlan = (value: unknown): BillingPlan | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return normalized === "STARTER" || normalized === "PRO" || normalized === "TEAM" ? normalized : null;
};

const toDate = (timestamp?: number | null) => (timestamp ? new Date(timestamp * 1000) : null);

const serializeProfile = (profile: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: string;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
}) => ({
  id: profile.id,
  email: profile.email,
  name: profile.name,
  avatar_url: profile.avatarUrl,
  plan: profile.plan.toLowerCase(),
  subscription_status: profile.subscriptionStatus ?? null,
  subscription_current_period_end: profile.subscriptionCurrentPeriodEnd ?? null
});

const syncRazorpaySubscription = async (subscription: RazorpaySubscription) => {
  const plan = normalizePlan(subscription.notes?.plan) ?? planFromPlanId(subscription.plan_id);

  const userId =
    subscription.notes?.userId ??
    (
      await prisma.user.findFirst({
        where: {
          OR: [
            { paymentSubscriptionId: subscription.id },
            ...(subscription.customer_id ? [{ paymentCustomerId: subscription.customer_id }] : [])
          ]
        },
        select: { id: true }
      })
    )?.id;

  if (!userId) return null;

  return prisma.user.update({
    where: { id: userId },
    data: {
      paymentCustomerId: subscription.customer_id ?? undefined,
      paymentSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: toDate(subscription.current_end ?? subscription.end_at),
      plan: activeSubscriptionStatuses.has(subscription.status) && plan ? plan : "FREE"
    }
  });
};

const currentSubscriptionIsActive = (status?: string | null) => Boolean(status && activeSubscriptionStatuses.has(status));

router.use(requireAuth);

router.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    requireBilling();
    const body = checkoutSchema.parse(req.body);
    const plan = body.plan.toUpperCase() as BillingPlan;

    if (currentSubscriptionIsActive(req.auth!.user.subscriptionStatus)) {
      throw new AppError(
        409,
        req.auth!.user.plan === plan
          ? "You already have this active Razorpay plan."
          : "Cancel your current Razorpay subscription from Settings before switching plans."
      );
    }

    const subscription = await createRazorpaySubscription({
      planId: planIdForPlan(plan),
      userId: req.auth!.user.id,
      plan,
      email: req.auth!.user.email,
      name: req.auth!.user.name
    });

    await prisma.user.update({
      where: { id: req.auth!.user.id },
      data: {
        paymentSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status
      }
    });

    res.json({
      provider: "razorpay",
      mode: "checkout",
      key_id: env.RAZORPAY_KEY_ID,
      subscription_id: subscription.id,
      plan: plan.toLowerCase(),
      app_name: "AIFlow",
      description: `${plan[0]}${plan.slice(1).toLowerCase()} monthly subscription`,
      prefill: {
        name: req.auth!.user.name ?? undefined,
        email: req.auth!.user.email
      }
    });
  })
);

router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    requireBilling();
    if (!env.RAZORPAY_KEY_SECRET) {
      throw new AppError(503, "Razorpay key secret is not configured.");
    }

    const body = verifyCheckoutSchema.parse(req.body);
    const savedSubscriptionId = req.auth!.user.paymentSubscriptionId;

    if (!savedSubscriptionId || savedSubscriptionId !== body.razorpay_subscription_id) {
      throw new AppError(400, "Razorpay subscription does not match the current checkout session.");
    }

    const payload = `${body.razorpay_payment_id}|${savedSubscriptionId}`;
    if (!verifyRazorpaySignature(payload, body.razorpay_signature, env.RAZORPAY_KEY_SECRET)) {
      throw new AppError(400, "Razorpay payment signature verification failed.");
    }

    const subscription = await fetchRazorpaySubscription(savedSubscriptionId);
    const user = await syncRazorpaySubscription(subscription);

    if (!user) {
      throw new AppError(404, "AIFlow user was not found for this Razorpay subscription.");
    }

    res.json({ user: serializeProfile(user) });
  })
);

router.post(
  "/cancel",
  asyncHandler(async (req, res) => {
    requireBilling();
    const subscriptionId = req.auth!.user.paymentSubscriptionId;

    if (!subscriptionId || !currentSubscriptionIsActive(req.auth!.user.subscriptionStatus)) {
      throw new AppError(400, "No active Razorpay subscription is connected to this account.");
    }

    const subscription = await cancelRazorpaySubscription(subscriptionId);
    const user = await syncRazorpaySubscription(subscription);

    res.json({
      user: user ? serializeProfile(user) : serializeProfile(req.auth!.user),
      message: "Your Razorpay subscription is set to cancel at the end of the current billing cycle."
    });
  })
);

export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    requireBilling();
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new AppError(503, "Razorpay webhook secret is not configured.");
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature || Array.isArray(signature)) {
      throw new AppError(400, "Missing Razorpay signature.");
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
    if (!verifyRazorpaySignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
      throw new AppError(400, "Razorpay webhook signature verification failed.");
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        subscription?: {
          entity?: RazorpaySubscription;
        };
      };
    };

    const subscription = event.payload?.subscription?.entity;
    if (subscription) {
      await syncRazorpaySubscription(subscription);
    }

    res.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Razorpay webhook failed.";
    res.status(error instanceof AppError ? error.statusCode : 400).json({ error: { message } });
  }
};

export default router;
