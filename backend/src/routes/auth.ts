import { Router } from "express";
import { z } from "zod";
import { env, isSupabaseConfigured } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  avatar_url: z.string().url().optional().or(z.literal(""))
});

const requireSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new AppError(503, "Supabase Auth is not configured.");
  }
  return supabase;
};

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const body = signupSchema.parse(req.body);
    const client = requireSupabase();

    const { data, error } = await client.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          name: body.name
        },
        emailRedirectTo: `${env.FRONTEND_URL}/auth/callback`
      }
    });

    if (error) throw new AppError(400, error.message);

    if (data.user?.email) {
      await prisma.user.upsert({
        where: { id: data.user.id },
        create: {
          id: data.user.id,
          email: data.user.email,
          name: body.name ?? null,
          avatarUrl: null,
          plan: "FREE"
        },
        update: {
          email: data.user.email,
          name: body.name ?? undefined
        }
      });
    }

    res.status(201).json({
      user: data.user,
      session: data.session,
      message: data.session ? "Signed up successfully." : "Check your email to verify your account."
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const client = requireSupabase();

    const { data, error } = await client.auth.signInWithPassword({
      email: body.email,
      password: body.password
    });

    if (error) throw new AppError(401, error.message);
    if (!data.user?.email || !data.session) throw new AppError(401, "Login failed.");

    const metadata = data.user.user_metadata ?? {};
    const profile = await prisma.user.upsert({
      where: { id: data.user.id },
      create: {
        id: data.user.id,
        email: data.user.email,
        name: metadata.name ?? metadata.full_name ?? null,
        avatarUrl: metadata.avatar_url ?? metadata.picture ?? null,
        plan: "FREE"
      },
      update: {
        email: data.user.email,
        name: metadata.name ?? metadata.full_name ?? undefined,
        avatarUrl: metadata.avatar_url ?? metadata.picture ?? undefined
      }
    });

    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        avatar_url: profile.avatarUrl,
        plan: profile.plan.toLowerCase()
      },
      session: data.session
    });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const threadCount = await prisma.thread.count({
      where: { userId: req.auth!.user.id }
    });

    res.json({
      user: {
        id: req.auth!.user.id,
        email: req.auth!.user.email,
        name: req.auth!.user.name,
        avatar_url: req.auth!.user.avatarUrl,
        plan: req.auth!.user.plan.toLowerCase()
      },
      stats: {
        total_threads: threadCount
      }
    });
  })
);

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = updateProfileSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.auth!.user.id },
      data: {
        name: body.name,
        avatarUrl: body.avatar_url === "" ? null : body.avatar_url
      }
    });

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        avatar_url: updated.avatarUrl,
        plan: updated.plan.toLowerCase()
      }
    });
  })
);

router.delete(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.user.delete({
      where: { id: req.auth!.user.id }
    });

    res.status(204).send();
  })
);

export default router;
