import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { InputMethod as PrismaInputMethod } from "../generated/prisma/enums.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { analyzeConversation, modelNames, regeneratePrompts } from "../services/gemini.js";
import { InputMethod, MAX_CONVERSATION_CHARS, normalizeInput } from "../services/inputParser.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const createThreadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many Flow creation attempts. Wait a minute, then try again." } }
});

const regenerateThreadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many Flow refinement attempts. Wait a minute, then try again." } }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1_500_000
  }
});

const optionalUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError(400, "File upload is too large. Upload a .txt or .json file under 1.5 MB."));
      return;
    }

    next(
      new AppError(
        400,
        error instanceof Error
          ? `File upload could not be read. ${error.message}`
          : "File upload could not be read. Retry with a .txt or .json file."
      )
    );
  });
};

const inputMethodSchema = z.enum(["share_link", "file_upload", "raw_text", "manual_description"]);

const patchThreadSchema = z.object({
  title: z.string().min(1).max(160).optional()
});

const parseMaybeJson = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
};

const serializeThread = <T extends {
  id: string;
  title: string;
  goal: string;
  context: string;
  keyDecisions: unknown;
  lastPoint: string;
  nextStep: string;
  tags: unknown;
  rawInput: string;
  inputMethod: string;
  createdAt: Date;
  updatedAt: Date;
  prompts?: Array<{ id: string; modelName: string; promptText: string; createdAt: Date }>;
}>(thread: T) => ({
  id: thread.id,
  title: thread.title,
  goal: thread.goal,
  context: thread.context,
  key_decisions: Array.isArray(thread.keyDecisions) ? thread.keyDecisions : [],
  last_point: thread.lastPoint,
  next_step: thread.nextStep,
  tags: Array.isArray(thread.tags) ? thread.tags : [],
  raw_input: thread.rawInput,
  input_method: thread.inputMethod.toLowerCase(),
  created_at: thread.createdAt,
  updated_at: thread.updatedAt,
  prompts:
    thread.prompts?.map((prompt) => ({
      id: prompt.id,
      model_name: prompt.modelName,
      prompt_text: prompt.promptText,
      created_at: prompt.createdAt
    })) ?? []
});

const monthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};

const monthlyThreadLimit = (plan: string) =>
  ({
    FREE: 5,
    STARTER: 20
  })[plan] ?? null;

const monthlyRegenerationLimit = (plan: string) =>
  ({
    FREE: 15,
    STARTER: 60
  })[plan] ?? null;

const enforceMonthlyRegenerationLimit = async (userId: string, plan: string) => {
  const limit = monthlyRegenerationLimit(plan);
  if (limit === null) return;

  const currentMonth = monthStart();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        promptRegenerationsThisMonth: true,
        promptRegenerationMonth: true
      }
    });

    if (!user) throw new AppError(404, "User profile not found.");

    const isCurrentMonth = user.promptRegenerationMonth?.getTime() === currentMonth.getTime();
    const regenerationCount = isCurrentMonth ? user.promptRegenerationsThisMonth : 0;

    if (regenerationCount >= limit) {
      throw new AppError(402, `You have reached your ${limit} monthly Flow refinement limit. Upgrade to continue.`, {
        plan_limit_reached: true,
        monthly_limit: limit
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        promptRegenerationMonth: currentMonth,
        promptRegenerationsThisMonth: isCurrentMonth ? { increment: 1 } : 1
      }
    });
  });
};

const prismaInputMethod = (method: InputMethod) =>
  ({
    share_link: PrismaInputMethod.SHARE_LINK,
    file_upload: PrismaInputMethod.FILE_UPLOAD,
    raw_text: PrismaInputMethod.RAW_TEXT,
    manual_description: PrismaInputMethod.MANUAL_DESCRIPTION
  })[method];

const routeId = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const ensureThreadOwner = async (threadId: string, userId: string) => {
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, userId },
    include: { prompts: { orderBy: { createdAt: "asc" } } }
  });
  if (!thread) throw new AppError(404, "Flow not found.");
  return thread;
};

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const tag = typeof req.query.tag === "string" ? req.query.tag.trim().toLowerCase() : "";

    const threads = await prisma.thread.findMany({
      where: {
        userId: req.auth!.user.id,
        ...(search
          ? {
              title: {
                contains: search,
                mode: "insensitive"
              }
            }
          : {})
      },
      include: { prompts: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" }
    });

    const filtered = tag
      ? threads.filter((thread) =>
          Array.isArray(thread.tags) ? thread.tags.some((item) => String(item).toLowerCase() === tag) : false
        )
      : threads;

    res.json({ threads: filtered.map(serializeThread) });
  })
);

router.post(
  "/create",
  createThreadLimiter,
  optionalUpload,
  asyncHandler(async (req, res) => {
    let stage = "validating the input";

    try {
      const inputMethod = inputMethodSchema.parse(req.body.input_method ?? req.body.inputMethod);
      const content =
        inputMethod === "manual_description" && !req.body.content
          ? {
              working_on: req.body.working_on,
              decisions_made: req.body.decisions_made,
              last_message: req.body.last_message,
              continue_goal: req.body.continue_goal
            }
          : parseMaybeJson(req.body.content);

      stage = "checking your monthly usage";
      const monthlyCount = await prisma.thread.count({
        where: {
          userId: req.auth!.user.id,
          createdAt: {
            gte: monthStart()
          }
        }
      });

      const limit = monthlyThreadLimit(req.auth!.user.plan);
      if (limit !== null && monthlyCount >= limit) {
        throw new AppError(402, `You have reached your ${limit} Flow monthly limit. Upgrade to continue.`, {
          plan_limit_reached: true,
          monthly_limit: limit
        });
      }

      stage = "reading the conversation input";
      const normalizedConversation = await normalizeInput({
        inputMethod,
        content,
        file: req.file ?? undefined
      });

      if (normalizedConversation.length > MAX_CONVERSATION_CHARS) {
        throw new AppError(
          400,
          "Conversation is too long. Paste under 200,000 characters or upload a trimmed file."
        );
      }

      stage = "analyzing the conversation";
      const analysis = await analyzeConversation(normalizedConversation);

      stage = "saving the generated Flow";
      const thread = await prisma.thread.create({
        data: {
          userId: req.auth!.user.id,
          title: analysis.title,
          goal: analysis.goal,
          context: analysis.context,
          keyDecisions: analysis.key_decisions,
          lastPoint: analysis.last_point,
          nextStep: analysis.next_step,
          tags: analysis.tags,
          rawInput: normalizedConversation,
          inputMethod: prismaInputMethod(inputMethod),
          prompts: {
            create: modelNames.map((model) => ({
              modelName: model,
              promptText: analysis.prompts[model]
            }))
          }
        },
        include: { prompts: { orderBy: { createdAt: "asc" } } }
      });

      res.status(201).json({ thread: serializeThread(thread) });
    } catch (error) {
      if (error instanceof AppError || error instanceof z.ZodError) {
        throw error;
      }

      console.error(`Flow creation failed while ${stage}`, error);
      throw new AppError(500, `Flow creation failed while ${stage}.`, {
        stage,
        cause: error instanceof Error ? error.message : String(error)
      });
    }
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const thread = await ensureThreadOwner(routeId(req.params.id), req.auth!.user.id);
    res.json({ thread: serializeThread(thread) });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = routeId(req.params.id);
    await ensureThreadOwner(id, req.auth!.user.id);
    const body = patchThreadSchema.parse(req.body);
    const updated = await prisma.thread.update({
      where: { id, userId: req.auth!.user.id },
      data: {
        title: body.title
      },
      include: { prompts: { orderBy: { createdAt: "asc" } } }
    });

    res.json({ thread: serializeThread(updated) });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = routeId(req.params.id);
    await ensureThreadOwner(id, req.auth!.user.id);
    await prisma.thread.delete({ where: { id, userId: req.auth!.user.id } });
    res.status(204).send();
  })
);

router.post(
  "/:id/regenerate",
  regenerateThreadLimiter,
  asyncHandler(async (req, res) => {
    const id = routeId(req.params.id);
    const thread = await ensureThreadOwner(id, req.auth!.user.id);
    await enforceMonthlyRegenerationLimit(req.auth!.user.id, req.auth!.user.plan);

    const prompts = await regeneratePrompts({
      title: thread.title,
      goal: thread.goal,
      context: thread.context,
      key_decisions: Array.isArray(thread.keyDecisions) ? thread.keyDecisions.map(String) : [],
      last_point: thread.lastPoint,
      next_step: thread.nextStep,
      tags: Array.isArray(thread.tags) ? thread.tags.map(String) : []
    });

    await prisma.$transaction(
      modelNames.map((model) =>
        prisma.generatedPrompt.upsert({
          where: {
            threadId_modelName: {
              threadId: thread.id,
              modelName: model
            }
          },
          create: {
            threadId: thread.id,
            modelName: model,
            promptText: prompts[model]
          },
          update: {
            promptText: prompts[model]
          }
        })
      )
    );

    const updated = await ensureThreadOwner(id, req.auth!.user.id);
    res.json({ thread: serializeThread(updated) });
  })
);

export default router;
