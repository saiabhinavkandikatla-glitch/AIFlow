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

const labelMessage = (role: string | undefined, content: unknown) => {
  const cleanRole = role && /assistant|user|system|human/i.test(role) ? role : "message";
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.join("\n")
        : content == null
          ? ""
          : JSON.stringify(content);
  return `${cleanRole}: ${text}`;
};

const maybeMessageFromObject = (value: Record<string, unknown>) => {
  const role = (value.role ?? value.speaker ?? value.author ?? value.from) as string | undefined;
  const content = value.content ?? value.text ?? value.message ?? value.body;
  if (!content) return null;
  return labelMessage(role, content);
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
      const parts = Array.isArray(content?.parts) ? content?.parts : [];
      const text = parts.filter((part) => typeof part === "string").join("\n");
      return text ? labelMessage(author?.role as string | undefined, text) : null;
    })
    .filter((item): item is string => Boolean(item));
};

const extractMessagesFromJson = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    const direct = value
      .map((item) => (item && typeof item === "object" ? maybeMessageFromObject(item as Record<string, unknown>) : null))
      .filter((item): item is string => Boolean(item));
    if (direct.length > 0) return direct;
    return value.flatMap(extractMessagesFromJson);
  }

  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const chatGptMessages = extractChatGptMapping(record);
  if (chatGptMessages.length > 0) return chatGptMessages;

  for (const key of ["messages", "conversation", "chat", "items", "turns"]) {
    if (Array.isArray(record[key])) {
      const messages = extractMessagesFromJson(record[key]);
      if (messages.length > 0) return messages;
    }
  }

  const direct = maybeMessageFromObject(record);
  return direct ? [direct] : [];
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
Manual Thread Description

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

const decodeEscapedJsonString = (value: string) => {
  try {
    const parsed = JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
    return parsed.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  } catch {
    return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
};

const collectReactFlightText = (html: string) => {
  const chunks: string[] = [];
  const partsPattern = /\\"parts\\",\[(?:\d+)\],\\"((?:\\\\.|(?!\\").)*)\\"/g;

  for (const match of html.matchAll(partsPattern)) {
    const text = decodeEscapedJsonString(match[1] ?? "");
    if (text.trim().length > 40) {
      chunks.push(text);
    }
  }

  return compactWhitespace(chunks.join("\n\n"));
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

  const response = await fetch(url, {
    headers: {
      "user-agent": "ThreadBridge/1.0 (+https://threadbridge.app)",
      accept: "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new AppError(response.status, "The share link could not be fetched. Make sure it is public.");
  }

  const html = await response.text();
  const embedded = collectEmbeddedJsonText(html);
  const reactFlight = collectReactFlightText(html);
  const visible = collectVisibleText(html);
  const combined = compactWhitespace([embedded, reactFlight, visible].filter(Boolean).join("\n\n"));

  if (combined.length < 80) {
    throw new AppError(422, "The page loaded, but no readable conversation was found.");
  }

  return truncate(combined);
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
    return fetchShareLinkConversation(content);
  }

  if (inputMethod === "file_upload") {
    if (!file) throw new AppError(400, "Upload a .txt or .json file.");
    return truncate(parseUploadedFile(file));
  }

  if (inputMethod === "raw_text") {
    if (typeof content !== "string" || content.trim().length < 20) {
      throw new AppError(400, "Paste at least 20 characters of conversation text.");
    }
    return truncate(compactWhitespace(content));
  }

  if (inputMethod === "manual_description") {
    if (!content || typeof content !== "object") {
      throw new AppError(400, "Manual description content is required.");
    }
    return truncate(parseManualDescription(content as ManualDescription));
  }

  throw new AppError(400, "Unsupported input method.");
};
