import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import * as cheerio from "cheerio";
import { AppError } from "../utils/AppError.js";
import { compactWhitespace, truncate } from "../utils/text.js";

export type InputMethod = "share_link" | "file_upload" | "raw_text" | "manual_description";

export type ManualDescription = {
  working_on: string;
  decisions_made: string;
  last_message: string;
  continue_goal: string;
};

const ALLOWED_SHARE_HOSTS = new Set([
  "chatgpt.com",
  "www.chatgpt.com",
  "chat.openai.com",
  "claude.ai",
  "www.claude.ai"
]);

export const MAX_CONVERSATION_CHARS = 200_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeRole = (role: unknown) => {
  if (isRecord(role)) return normalizeRole(role.role);
  if (typeof role !== "string") return "message";
  if (/assistant/i.test(role)) return "assistant";
  if (/user|human/i.test(role)) return "user";
  if (/system/i.test(role)) return "system";
  return "message";
};

const contentToText = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(contentToText).filter(Boolean).join("\n");
  if (!isRecord(content)) return "";

  if (Array.isArray(content.parts)) {
    return content.parts.map(contentToText).filter(Boolean).join("\n");
  }

  for (const key of ["text", "content", "message", "body"]) {
    if (typeof content[key] === "string" || Array.isArray(content[key]) || isRecord(content[key])) {
      const text = contentToText(content[key]);
      if (text) return text;
    }
  }

  return "";
};

const labelMessage = (role: unknown, content: unknown) => {
  const cleanRole = normalizeRole(role);
  const text = contentToText(content);
  if (!text.trim()) return "";
  return `${cleanRole}: ${text}`;
};

const assertConversationLength = (value: string) => {
  if (value.length > MAX_CONVERSATION_CHARS) {
    throw new AppError(
      400,
      "Conversation is too long. Paste under 200,000 characters or upload a trimmed file."
    );
  }
  return value;
};

const isPrivateOrReservedIp = (address: string) => {
  if (address === "::1") return true;

  const ipv4Match = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(address)
    ? address
    : address.startsWith("::ffff:")
      ? address.slice("::ffff:".length)
      : null;

  if (!ipv4Match) return false;

  const parts = ipv4Match.split(".").map(Number);
  const [first, second] = parts;

  return (
    first === 127 ||
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
};

const rejectPrivateShareHost = async (hostname: string) => {
  let records: LookupAddress[];
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError(400, "Share link host could not be resolved.");
  }

  if (records.some((record) => isPrivateOrReservedIp(record.address))) {
    throw new AppError(400, "Share link resolved to a private or reserved IP address.");
  }
};

const maybeMessageFromObject = (value: Record<string, unknown>) => {
  if (isRecord(value.message) && (value.message.author || value.message.content)) {
    return maybeMessageFromObject(value.message);
  }

  const role = value.role ?? value.speaker ?? value.author ?? value.from;
  const content =
    value.content ?? value.text ?? (typeof value.message === "string" ? value.message : undefined) ?? value.body;
  if (!content) return null;
  const message = labelMessage(role, content);
  return message || null;
};

const extractChatGptMapping = (value: Record<string, unknown>) => {
  const mapping = value.mapping;
  if (!mapping || typeof mapping !== "object") return [];

  return Object.values(mapping as Record<string, unknown>)
    .map((node) => {
      if (!node || typeof node !== "object") return null;
      const message = (node as Record<string, unknown>).message;
      if (!message || typeof message !== "object") return null;
      const messageRecord = message as Record<string, unknown>;
      const author = messageRecord.author as Record<string, unknown> | undefined;
      const content = messageRecord.content as Record<string, unknown> | undefined;
      const role = normalizeRole(author?.role);
      if (role !== "assistant" && role !== "user") return null;
      const text = contentToText(content);
      return text ? labelMessage(role, text) : null;
    })
    .filter((item): item is string => Boolean(item));
};

const extractMessagesFromJson = (value: unknown, seen = new WeakSet<object>()): string[] => {
  if (Array.isArray(value)) {
    const direct = value
      .map((item) => (item && typeof item === "object" ? maybeMessageFromObject(item as Record<string, unknown>) : null))
      .filter((item): item is string => Boolean(item));
    if (direct.length > 0) return direct;
    return value.flatMap((item) => extractMessagesFromJson(item, seen));
  }

  if (!value || typeof value !== "object") return [];
  if (seen.has(value)) return [];
  seen.add(value);

  const record = value as Record<string, unknown>;
  const chatGptMessages = extractChatGptMapping(record);
  if (chatGptMessages.length > 0) return chatGptMessages;

  for (const key of ["messages", "conversation", "chat", "items", "turns", "linear_conversation"]) {
    if (Array.isArray(record[key])) {
      const messages = extractMessagesFromJson(record[key], seen);
      if (messages.length > 0) return messages;
    }
  }

  const direct = maybeMessageFromObject(record);
  if (direct) return [direct];

  for (const nested of Object.values(record)) {
    const messages = extractMessagesFromJson(nested, seen);
    if (messages.length > 0) return messages;
  }

  return [];
};

export const parseUploadedFile = (file: Express.Multer.File) => {
  const originalName = file.originalname.toLowerCase();
  const text = file.buffer.toString("utf8");

  if (originalName.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      const messages = extractMessagesFromJson(parsed);
      if (messages.length > 0) {
        return compactWhitespace(messages.join("\n\n"));
      }
      return compactWhitespace(JSON.stringify(parsed, null, 2));
    } catch {
      throw new AppError(400, "The uploaded JSON file could not be parsed.");
    }
  }

  if (originalName.endsWith(".txt")) {
    return compactWhitespace(text);
  }

  throw new AppError(400, "Only .txt and .json chat export files are supported.");
};

export const parseManualDescription = (content: ManualDescription) =>
  compactWhitespace(`
Manual Flow Description

What the user was working on:
${content.working_on}

Decisions made:
${content.decisions_made}

Last message or question:
${content.last_message}

What the user wants to continue:
${content.continue_goal}
`);

const collectVisibleText = (html: string) => {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const primaryText = $("main").text() || $("article").text() || $("body").text();
  return compactWhitespace(primaryText);
};

const collectEmbeddedJsonText = (html: string) => {
  const $ = cheerio.load(html);
  const chunks: string[] = [];

  $("script[type='application/json'], script#__NEXT_DATA__").each((_index, element) => {
    const raw = $(element).text();
    if (!raw) return;
    try {
      const messages = extractMessagesFromJson(JSON.parse(raw));
      if (messages.length > 0) chunks.push(messages.join("\n\n"));
    } catch {
      // Ignore non-JSON script content.
    }
  });

  return compactWhitespace(chunks.join("\n\n"));
};

const decodeJavaScriptStringLiteral = (value: string) => {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return null;
  }
};

const decodeEscapedJsonString = (value: string) => {
  const parsed = decodeJavaScriptStringLiteral(value);
  if (parsed !== null) {
    return parsed.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }

  return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
};

const decodeReactRouterStream = (value: string) => {
  const parsed = decodeJavaScriptStringLiteral(value);
  if (parsed !== null) {
    return parsed;
  }

    return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
};

const resolveReactRouterValue = (
  payload: unknown[],
  value: unknown,
  seen = new Set<number>(),
  depth = 0
): unknown => {
  if (depth > 90) return undefined;

  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < payload.length) {
    if (seen.has(value)) return undefined;
    const nextSeen = new Set(seen);
    nextSeen.add(value);
    return resolveReactRouterValue(payload, payload[value], nextSeen, depth + 1);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => resolveReactRouterValue(payload, item, seen, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (isRecord(value)) {
    const record: Record<string, unknown> = {};
    for (const [rawKey, rawValue] of Object.entries(value)) {
      const keyRef = /^_(\d+)$/.exec(rawKey);
      const resolvedKey = keyRef
        ? resolveReactRouterValue(payload, Number(keyRef[1]), seen, depth + 1)
        : rawKey;
      const key = typeof resolvedKey === "string" ? resolvedKey : rawKey;
      const resolvedValue = resolveReactRouterValue(payload, rawValue, seen, depth + 1);
      if (resolvedValue !== undefined) record[key] = resolvedValue;
    }
    return record;
  }

  if (typeof value === "number" && value < 0) return undefined;
  return value;
};

const collectReactRouterStreamText = (html: string) => {
  const chunks: string[] = [];
  const streamPattern = /streamController\.enqueue\("((?:\\.|[^"\\])*)"\)/g;

  for (const match of html.matchAll(streamPattern)) {
    const decoded = decodeReactRouterStream(match[1] ?? "");
    if (!decoded.trim().startsWith("[")) continue;

    try {
      const payload = JSON.parse(decoded) as unknown;
      if (!Array.isArray(payload) || payload.length === 0) continue;
      const resolved = resolveReactRouterValue(payload, payload[0]);
      const messages = extractMessagesFromJson(resolved);
      if (messages.length > 0) chunks.push(messages.join("\n\n"));
    } catch {
      // Ignore stream chunks that are not complete JSON payloads.
    }
  }

  return compactWhitespace(chunks.join("\n\n"));
};

const collectReactFlightText = (html: string) => {
  const chunks: string[] = [];
  const routerStream = collectReactRouterStreamText(html);
  if (routerStream) chunks.push(routerStream);

  const partsPattern = /\\"parts\\",\[(?:\d+)\],\\"((?:\\\\.|(?!\\").)*)\\"/g;

  for (const match of html.matchAll(partsPattern)) {
    const text = decodeEscapedJsonString(match[1] ?? "");
    if (text.trim().length > 40) {
      chunks.push(text);
    }
  }

  return compactWhitespace(chunks.join("\n\n"));
};

const looksLikeSharePlaceholder = (text: string) => {
  const lower = text.toLowerCase();
  return (
    lower.includes("by messaging chatgpt") ||
    lower.includes("agree to our terms") ||
    lower.includes("privacy policy") ||
    lower === "voice"
  );
};

export const fetchShareLinkConversation = async (shareUrl: string) => {
  let url: URL;
  try {
    url = new URL(shareUrl);
  } catch {
    throw new AppError(400, "Enter a valid ChatGPT or Claude share URL.");
  }

  if (!ALLOWED_SHARE_HOSTS.has(url.hostname)) {
    throw new AppError(400, "Only public ChatGPT and Claude share links are supported.");
  }

  await rejectPrivateShareHost(url.hostname);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "user-agent": "AIFlow/1.0 (+https://aiflow.app)",
        accept: "text/html,application/xhtml+xml"
      }
    });
  } catch {
    throw new AppError(
      502,
      "AIFlow could not reach that share link. Try pasting the conversation as raw text, or upload a .txt/.json export."
    );
  }

  if (!response.ok) {
    throw new AppError(response.status, "The share link could not be fetched. Make sure it is public.");
  }

  const html = await response.text();
  const embedded = collectEmbeddedJsonText(html);
  const reactFlight = collectReactFlightText(html);
  const visible = collectVisibleText(html);
  const structuredConversation = compactWhitespace([embedded, reactFlight].filter(Boolean).join("\n\n"));
  const combined = structuredConversation || visible;

  if (combined.length < 160 || (!structuredConversation && looksLikeSharePlaceholder(combined))) {
    throw new AppError(
      422,
      "The share link loaded, but AIFlow could not read the conversation. Paste the conversation as raw text or upload a .txt/.json export instead."
    );
  }

  return assertConversationLength(truncate(combined, MAX_CONVERSATION_CHARS));
};

export const normalizeInput = async ({
  inputMethod,
  content,
  file
}: {
  inputMethod: InputMethod;
  content?: unknown;
  file?: Express.Multer.File;
}) => {
  if (inputMethod === "share_link") {
    if (typeof content !== "string") throw new AppError(400, "Share link content must be a URL string.");
    return assertConversationLength(await fetchShareLinkConversation(content));
  }

  if (inputMethod === "file_upload") {
    if (!file) throw new AppError(400, "Upload a .txt or .json file.");
    return assertConversationLength(truncate(parseUploadedFile(file), MAX_CONVERSATION_CHARS));
  }

  if (inputMethod === "raw_text") {
    if (typeof content !== "string" || content.trim().length < 20) {
      throw new AppError(400, "Paste at least 20 characters of conversation text.");
    }
    return assertConversationLength(truncate(compactWhitespace(content), MAX_CONVERSATION_CHARS));
  }

  if (inputMethod === "manual_description") {
    if (!content || typeof content !== "object") {
      throw new AppError(400, "Manual description content is required.");
    }
    return assertConversationLength(truncate(parseManualDescription(content as ManualDescription), MAX_CONVERSATION_CHARS));
  }

  throw new AppError(400, "Unsupported input method.");
};
