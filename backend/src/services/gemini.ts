import { GoogleGenAI } from "@google/genai";
import { env, isGeminiConfigured } from "../config/env.js";
import { compactWhitespace, titleCase, truncate } from "../utils/text.js";

const MODEL_NAMES = ["ChatGPT", "Claude", "Gemini", "DeepSeek", "Grok"] as const;

export type ModelName = (typeof MODEL_NAMES)[number];

export type ThreadAnalysis = {
  title: string;
  goal: string;
  context: string;
  key_decisions: string[];
  last_point: string;
  next_step: string;
  tags: string[];
  prompts: Record<ModelName, string>;
};

const gemini = isGeminiConfigured ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

const SYSTEM_PROMPT =
  "You are an AI context analyst. Your job is to analyze conversations and extract structured intelligence so users can seamlessly continue that conversation in a different AI model. Be precise, concise, and smart.";

const requiredPrompt = (model: ModelName) =>
  `Continue in ${model}: include enough context, the user's intent, decisions already made, the current state, and the exact next action. Tailor phrasing to ${model}'s strengths.`;

const extractJsonObject = (text: string) => {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found in Gemini response.");
  }
  return JSON.parse(text.slice(first, last + 1)) as Partial<ThreadAnalysis>;
};

const coerceStringArray = (value: unknown, fallback: string[]) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 12) : fallback;

const coercePrompts = (value: unknown, base: Omit<ThreadAnalysis, "prompts">): Record<ModelName, string> => {
  const incoming = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return MODEL_NAMES.reduce(
    (acc, model) => {
      const direct = incoming[model];
      const lower = incoming[model.toLowerCase()];
      acc[model] = typeof direct === "string" ? direct : typeof lower === "string" ? lower : buildPrompt(model, base);
      return acc;
    },
    {} as Record<ModelName, string>
  );
};

const normalizeAnalysis = (value: Partial<ThreadAnalysis>, fallback: ThreadAnalysis): ThreadAnalysis => {
  const base = {
    title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : fallback.title,
    goal: typeof value.goal === "string" && value.goal.trim() ? value.goal.trim() : fallback.goal,
    context: typeof value.context === "string" && value.context.trim() ? value.context.trim() : fallback.context,
    key_decisions: coerceStringArray(value.key_decisions, fallback.key_decisions),
    last_point: typeof value.last_point === "string" && value.last_point.trim() ? value.last_point.trim() : fallback.last_point,
    next_step: typeof value.next_step === "string" && value.next_step.trim() ? value.next_step.trim() : fallback.next_step,
    tags: coerceStringArray(value.tags, fallback.tags)
  };

  return {
    ...base,
    prompts: coercePrompts(value.prompts, base)
  };
};

const keywordTags = (conversationText: string) => {
  const stopWords = new Set([
    "about",
    "after",
    "again",
    "assistant",
    "because",
    "before",
    "being",
    "could",
    "from",
    "have",
    "into",
    "that",
    "their",
    "there",
    "these",
    "this",
    "user",
    "want",
    "were",
    "what",
    "when",
    "with",
    "would",
    "your"
  ]);

  const counts = new Map<string, number>();
  for (const match of conversationText.toLowerCase().matchAll(/[a-z][a-z0-9-]{3,}/g)) {
    const word = match[0];
    if (stopWords.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
};

const guessTitle = (conversationText: string) => {
  const firstUsefulLine =
    conversationText
      .split("\n")
      .map((line) => line.replace(/^(user|assistant|human|message|system)\s*:\s*/i, "").trim())
      .find((line) => line.length > 18) ?? "Imported AI Conversation";

  const words = firstUsefulLine.split(/\s+/).slice(0, 8).join(" ");
  return titleCase(words.replace(/[^\w\s-]/g, ""));
};

const buildPrompt = (model: ModelName, base: Omit<ThreadAnalysis, "prompts">) => {
  const decisions = base.key_decisions.map((decision) => `- ${decision}`).join("\n");
  const tags = base.tags.length ? base.tags.join(", ") : "context-transfer";

  if (model === "Claude") {
    return compactWhitespace(`
I want to continue a prior conversation with careful reasoning and concise synthesis.

Topic: ${base.title}
Goal: ${base.goal}

Context:
${base.context}

Decisions already made:
${decisions}

Where we left off:
${base.last_point}

Please continue from here with a nuanced but practical answer. Next step: ${base.next_step}
Tags: ${tags}
`);
  }

  if (model === "Gemini") {
    return compactWhitespace(`
Continue this cross-model AI conversation. First reconcile the context, then move directly into the next useful action.

Conversation title: ${base.title}
User goal: ${base.goal}
Current context: ${base.context}
Key decisions: ${base.key_decisions.join("; ")}
Last point reached: ${base.last_point}
Requested continuation: ${base.next_step}

Use structured reasoning, surface any missing assumptions, and give the user an actionable continuation.
`);
  }

  if (model === "DeepSeek") {
    return compactWhitespace(`
Task: continue this prior AI conversation with strong problem-solving and implementation focus.

Title: ${base.title}
Goal: ${base.goal}
Context: ${base.context}
Decisions:
${decisions}
Last point: ${base.last_point}

Proceed with the next concrete step: ${base.next_step}
Keep the response direct, technically precise, and optimized for execution.
`);
  }

  if (model === "Grok") {
    return compactWhitespace(`
Pick up this conversation from another AI model. Be sharp, candid, and useful.

Title: ${base.title}
Goal: ${base.goal}
Context: ${base.context}
What is already decided: ${base.key_decisions.join("; ")}
Last thing reached: ${base.last_point}
Next move: ${base.next_step}

Continue naturally and call out any questionable assumptions before acting.
`);
  }

  return compactWhitespace(`
I am transferring a conversation from another AI assistant. Please continue from this exact state.

Title: ${base.title}
Goal: ${base.goal}

Context summary:
${base.context}

Key decisions:
${decisions}

Where the prior conversation stopped:
${base.last_point}

Please continue by doing this next:
${base.next_step}

Use a clear structure, ask only if blocked, and preserve the decisions already made.
`);
};

const fallbackAnalysis = (conversationText: string): ThreadAnalysis => {
  const clean = compactWhitespace(conversationText);
  const tags = keywordTags(clean);
  const decisions = clean
    .split(/\n+/)
    .filter((line) => /\b(decided|decision|agreed|choose|selected|will|must|should)\b/i.test(line))
    .map((line) => line.replace(/^(user|assistant|human|message|system)\s*:\s*/i, "").trim())
    .slice(0, 4);

  const base = {
    title: guessTitle(clean),
    goal: "Continue the transferred AI conversation with the original context intact.",
    context: truncate(clean, 1200),
    key_decisions: decisions.length > 0 ? decisions : ["No explicit decisions were detected in the provided input."],
    last_point: truncate(clean.split(/\n+/).slice(-4).join("\n"), 600),
    next_step: "Resume from the last point and answer the user's next question or continue the unfinished work.",
    tags: tags.length > 0 ? tags : ["handoff", "conversation"]
  };

  return {
    ...base,
    prompts: MODEL_NAMES.reduce(
      (acc, model) => {
        acc[model] = buildPrompt(model, base);
        return acc;
      },
      {} as Record<ModelName, string>
    )
  };
};

export const analyzeConversation = async (conversationText: string): Promise<ThreadAnalysis> => {
  const fallback = fallbackAnalysis(conversationText);

  if (!gemini) {
    return fallback;
  }

  const userPrompt = `
Analyze this conversation and return a JSON object with these fields:
title, goal, context, key_decisions (array), last_point, next_step, tags (array), prompts.

The prompts object must contain optimized continuation prompts for exactly these keys:
ChatGPT, Claude, Gemini, DeepSeek, Grok.

Each prompt should be tailored to that model's style and capabilities.
Return only valid JSON, no markdown.

Prompt expectations:
${MODEL_NAMES.map((model) => `- ${requiredPrompt(model)}`).join("\n")}

Conversation:
${conversationText}
`;

  try {
    const response = await gemini.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 5000,
        responseMimeType: "application/json"
      }
    });

    const text = response.text ?? "";

    return normalizeAnalysis(extractJsonObject(text), fallback);
  } catch (error) {
    console.warn("Gemini analysis failed; using fallback analysis.", error);
    return fallback;
  }
};

export const regeneratePrompts = async (analysis: Omit<ThreadAnalysis, "prompts">) => {
  if (!gemini) {
    return MODEL_NAMES.reduce(
      (acc, model) => {
        acc[model] = buildPrompt(model, analysis);
        return acc;
      },
      {} as Record<ModelName, string>
    );
  }

  const prompt = `
Generate optimized continuation prompts for these AI models: ChatGPT, Claude, Gemini, DeepSeek, Grok.
Return only JSON in this shape: {"prompts":{"ChatGPT":"...","Claude":"...","Gemini":"...","DeepSeek":"...","Grok":"..."}}

Flow title: ${analysis.title}
Goal: ${analysis.goal}
Context: ${analysis.context}
Key decisions: ${analysis.key_decisions.join("; ")}
Last point: ${analysis.last_point}
Next step: ${analysis.next_step}
Tags: ${analysis.tags.join(", ")}
`;

  try {
    const response = await gemini.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 3500,
        responseMimeType: "application/json"
      }
    });

    const text = response.text ?? "";

    const parsed = extractJsonObject(text) as { prompts?: unknown };
    return coercePrompts(parsed.prompts, analysis);
  } catch (error) {
    console.warn("Gemini prompt regeneration failed; using fallback prompts.", error);
    return MODEL_NAMES.reduce(
      (acc, model) => {
        acc[model] = buildPrompt(model, analysis);
        return acc;
      },
      {} as Record<ModelName, string>
    );
  }
};

export const modelNames = MODEL_NAMES;
