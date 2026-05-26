import type { Request, Response } from "express";
import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { env, isStripeConfigured } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { stripe } from "../lib/stripe.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

type BillingPlan = "STARTER" | "PRO" | "TEAM";

const router = Router();

const checkoutSchema = z.object({
  plan: z.enum(["starter", "pro", "team"])
});

const activeSubscriptionStatuses = new Set(["active", "trialing"]);

const requireBilling = () => {
  if (!isStripeConfigured || !stripe) {
    throw new AppError(503, "Stripe Billing is not configured yet.");
  }
  return stripe;
};

const priceForPlan = (plan: BillingPlan) => {
  const priceId =
    plan === "STARTER"
      ? env.STRIPE_STARTER_PRICE_ID
      : plan === "PRO"
        ? env.STRIPE_PRO_PRICE_ID
        : env.STRIPE_TEAM_PRICE_ID;
  if (!priceId) {
    const label = plan === "STARTER" ? "Starter" : plan === "PRO" ? "Pro" : "Team";
    throw new AppError(503, `${label} Stripe price ID is not configured.`);
  }
  return priceId;
};

const planFromPriceId = (priceId?: string | null): BillingPlan | null => {
  if (!priceId) return null;
  if (priceId === env.STRIPE_STARTER_PRICE_ID) return "STARTER";
  if (priceId === env.STRIPE_PRO_PRICE_ID) return "PRO";
  if (priceId === env.STRIPE_TEAM_PRICE_ID) return "TEAM";
  return null;
};

const normalizePlan = (value: unknown): BillingPlan | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return normalized === "STARTER" || normalized === "PRO" || normalized === "TEAM" ? normalized : null;
};

const toDate = (timestamp?: number | null) => (timestamp ? new Date(timestamp * 1000) : null);

const routeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const createOrReuseCustomer = async (user: {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId?: string | null;
}) => {
  const client = requireBilling();
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await client.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: {
      userId: user.id
    }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id }
  });

  return customer.id;
};

export const syncStripeSubscription = async (subscription: Stripe.Subscription) => {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id;
  const plan = normalizePlan(subscription.metadata.plan) ?? planFromPriceId(priceId);

  const userId =
    subscription.metadata.userId ??
    (
      await prisma.user.findFirst({
        where: {
          OR: [{ stripeSubscriptionId: subscription.id }, { stripeCustomerId: customerId }]
        },
        select: { id: true }
      })
    )?.id;

  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
      plan: activeSubscriptionStatuses.has(subscription.status) && plan ? plan : "FREE"
    }
  });
};

const syncCheckoutSession = async (session: Stripe.Checkout.Session) => {
  const userId = session.client_reference_id ?? session.metadata?.userId;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (userId && customerId) {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId }
    });
  }

  if (!subscriptionId) return;

  const subscription = await requireBilling().subscriptions.retrieve(subscriptionId);
  await syncStripeSubscription(subscription);
};

const createPortalUrl = async (customerId: string) => {
  const session = await requireBilling().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.FRONTEND_URL}/app/settings`
  });
  return session.url;
};

router.use(requireAuth);

router.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    const client = requireBilling();
    const body = checkoutSchema.parse(req.body);
    const plan = body.plan.toUpperCase() as BillingPlan;
    const priceId = priceForPlan(plan);

    const customerId = await createOrReuseCustomer({
      id: req.auth!.user.id,
      email: req.auth!.user.email,
      name: req.auth!.user.name,
      stripeCustomerId: req.auth!.user.stripeCustomerId
    });

    if (
      req.auth!.user.stripeSubscriptionId &&
      req.auth!.user.subscriptionStatus &&
      activeSubscriptionStatuses.has(req.auth!.user.subscriptionStatus)
    ) {
      return res.json({ url: await createPortalUrl(customerId), mode: "portal" });
    }

    const session = await client.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: req.auth!.user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      metadata: {
        userId: req.auth!.user.id,
        plan
      },
      subscription_data: {
        metadata: {
          userId: req.auth!.user.id,
          plan
        }
      },
      success_url: `${env.FRONTEND_URL}/app/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/pricing?billing=cancelled`
    });

    if (!session.url) throw new AppError(500, "Stripe did not return a checkout URL.");
    res.json({ url: session.url, mode: "checkout" });
  })
);

router.post(
  "/portal",
  asyncHandler(async (req, res) => {
    const customerId = await createOrReuseCustomer({
      id: req.auth!.user.id,
      email: req.auth!.user.email,
      name: req.auth!.user.name,
      stripeCustomerId: req.auth!.user.stripeCustomerId
    });

    res.json({ url: await createPortalUrl(customerId) });
  })
);

router.get(
  "/sync-checkout-session/:sessionId",
  asyncHandler(async (req, res) => {
    const session = await requireBilling().checkout.sessions.retrieve(routeParam(req.params.sessionId));
    const ownerId = session.client_reference_id ?? session.metadata?.userId;

    if (ownerId !== req.auth!.user.id) {
      throw new AppError(403, "This checkout session does not belong to your account.");
    }

    if (session.status === "complete") {
      await syncCheckoutSession(session);
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.user.id }
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatarUrl,
        plan: user.plan.toLowerCase(),
        subscription_status: user.subscriptionStatus,
        subscription_current_period_end: user.subscriptionCurrentPeriodEnd
      }
    });
  })
);

export const stripeWebhook = async (req: Request, res: Response) => {
  try {
    const client = requireBilling();
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError(503, "Stripe webhook secret is not configured.");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature)) {
      throw new AppError(400, "Missing Stripe signature.");
    }

    const event = client.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case "checkout.session.completed":
        await syncCheckoutSession(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscription(event.data.object);
        break;
      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe webhook failed.";
    res.status(error instanceof AppError ? error.statusCode : 400).json({ error: { message } });
  }
};

export default router;
