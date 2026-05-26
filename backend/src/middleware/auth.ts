import type { NextFunction, Request, Response } from "express";
import { env, isSupabaseConfigured } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/AppError.js";

export type AuthenticatedProfile = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: "FREE" | "STARTER" | "PRO" | "TEAM";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: Date | null;
};

declare global {
  namespace Express {
    interface Request {
      auth?: {
        token: string;
        user: AuthenticatedProfile;
      };
    }
  }
}

const readBearerToken = (req: Request) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = readBearerToken(req);
    if (!token) {
      throw new AppError(401, "Missing bearer token.");
    }

    if (!isSupabaseConfigured || !supabase) {
      if (env.NODE_ENV === "development" && token === "dev-token") {
        const user = await prisma.user.upsert({
          where: { id: "00000000-0000-0000-0000-000000000001" },
          create: {
            id: "00000000-0000-0000-0000-000000000001",
            email: "dev@aiflow.local",
            name: "AIFlow Dev",
            plan: "FREE"
          },
          update: {}
        });
        req.auth = {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            plan: user.plan,
            stripeCustomerId: user.stripeCustomerId,
            stripeSubscriptionId: user.stripeSubscriptionId,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd
          }
        };
        return next();
      }

      throw new AppError(503, "Supabase is not configured on the server.");
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.email) {
      throw new AppError(401, "Invalid or expired session.");
    }

    const metadata = data.user.user_metadata ?? {};
    const existingProfile = await prisma.user.findUnique({
      where: { id: data.user.id }
    });

    const profile = await prisma.user.upsert({
      where: { id: data.user.id },
      create: {
        id: data.user.id,
        email: data.user.email,
        name: null,
        avatarUrl: metadata.avatar_url ?? metadata.picture ?? null,
        plan: "FREE"
      },
      update: {
        email: data.user.email,
        name: existingProfile?.name ?? undefined,
        avatarUrl: metadata.avatar_url ?? metadata.picture ?? undefined
      }
    });

    req.auth = {
      token,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        plan: profile.plan,
        stripeCustomerId: profile.stripeCustomerId,
        stripeSubscriptionId: profile.stripeSubscriptionId,
        subscriptionStatus: profile.subscriptionStatus,
        subscriptionCurrentPeriodEnd: profile.subscriptionCurrentPeriodEnd
      }
    };
    next();
  } catch (error) {
    next(error);
  }
};
