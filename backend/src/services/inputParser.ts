import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";
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

export const MAX_CONVERSATION_CHARS = 200_000;
const MAX_SHARE_REDIRECTS = 5;
const MAX_SHARE_RESPONSE_BYTES = 2_000_000;
const MIN_SHARE_CONVERSATION_CHARS = 40;
const SHARE_FETCH_TIMEOUT_MS = 10_000;
const MAX_EXTRACTED_TEXT_LEAVES = 80;
const SHARE_FETCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";
const LIKELY_TEXT_KEYS = new Set([
  "answer",
  "body",
  "content",
  "input",
  "markdown",
  "message",
  "output",
  "prompt",
  "query",
  "question",
  "response",
  "result",
  "text",
  "title"
]);

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
  const normalized = address.replace(/^\[|\]$/g, "").toLowerCase();

  const ipv4Match = isIP(normalized) === 4
    ? normalized
    : normalized.startsWith("::ffff:")
      ? normalized.slice("::ffff:".length)
      : null;

  if (!ipv4Match) return false;

  const parts = ipv4Match.split(".").map(Number);
  const [first, second] = parts;

  return (
    first === 0 ||
    first === 127 ||
    first === 10 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 169 && second === 254) ||
    first >= 224
  );
};

const isPrivateOrReservedAddress = (address: string) => {
  const normalized = address.replace(/^\[|\]$/g, "").toLowerCase();

  if (isPrivateOrReservedIp(normalized)) return true;
  if (isIP(normalized) !== 6) return false;

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
};

const rejectPrivateShareHost = async (hostname: string) => {
  let records: LookupAddress[];
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError(400, "Share link host could not be resolved.");
  }

  if (records.some((record) => isPrivateOrReservedAddress(record.address))) {
    throw new AppError(400, "Share link resolved to a private or reserved IP address.");
  }
};

const validatePublicShareUrl = async (url: URL) => {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new AppError(400, "Enter a public HTTP or HTTPS AI conversation URL.");
  }

  if (url.username || url.password) {
    throw new AppError(400, "Share links with embedded credentials are not supported.");
  }

  await rejectPrivateShareHost(url.hostname);
};

const maybeMessageFromObject = (value: Record<string, unknown>) => {
  if (isRecord(value.message) && (value.message.author || value.message.content)) {
    return maybeMessageFromObject(value.message);
  }

  const role = value.role ?? value.sender ?? value.speaker ?? value.author ?? value.from;
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

  for (const key of ["messages", "chat_messages", "conversation", "chat", "items", "turns", "linear_conversation"]) {
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

const normalizeExtractedText = (value: string) => compactWhitespace(value.replace(/\u0000/g, " "));

const looksLikeUsefulText = (value: string, key?: string) => {
  const text = normalizeExtractedText(value);
  if (text.length < 20) return false;

  const lower = text.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("data:") ||
    lower.includes("data:image/") ||
    lower.includes("__webpack") ||
    lower.includes("webpack_require") ||
    lower.includes("chunk-") ||
    /\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|woff2?)(?:\?|$)/i.test(text)
  ) {
    return false;
  }

  const normalizedKey = key?.toLowerCase();
  return (
    Boolean(normalizedKey && LIKELY_TEXT_KEYS.has(normalizedKey)) ||
    text.length >= 60 ||
    /\b(?:user|assistant|human|system)\s*:/i.test(text) ||
    /[?!]/.test(text)
  );
};

const collectLikelyTextLeaves = (
  value: unknown,
  key?: string,
  seen = new WeakSet<object>(),
  output: string[] = []
): string[] => {
  if (output.length >= MAX_EXTRACTED_TEXT_LEAVES) return output;

  if (typeof value === "string") {
    if (looksLikeUsefulText(value, key)) {
      output.push(normalizeExtractedText(value));
    }
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectLikelyTextLeaves(item, key, seen, output);
      if (output.length >= MAX_EXTRACTED_TEXT_LEAVES) break;
    }
    return output;
  }

  if (!value || typeof value !== "object" || seen.has(value)) return output;
  seen.add(value);

  for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
    collectLikelyTextLeaves(childValue, childKey, seen, output);
    if (output.length >= MAX_EXTRACTED_TEXT_LEAVES) break;
  }

  return output;
};

const uniqueTextChunks = (chunks: string[]) => {
  const seen = new Set<string>();
  return chunks.filter((chunk) => {
    const normalized = normalizeExtractedText(chunk);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const extractConversationTextFromJson = (value: unknown) => {
  const messages = extractMessagesFromJson(value);
  if (messages.length > 0) return compactWhitespace(messages.join("\n\n"));

  return compactWhitespace(uniqueTextChunks(collectLikelyTextLeaves(value)).join("\n\n"));
};

export const parseUploadedFile = (file: Express.Multer.File) => {
  const originalName = file.originalname.toLowerCase();
  const text = file.buffer.toString("utf8");

  if (originalName.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      const extracted = extractConversationTextFromJson(parsed);
      if (extracted) return extracted;
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

const collectMetaText = (html: string) => {
  const $ = cheerio.load(html);
  const chunks = [
    $("title").first().text(),
    $("meta[name='description']").attr("content"),
    $("meta[property='og:title']").attr("content"),
    $("meta[property='og:description']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("meta[name='twitter:description']").attr("content")
  ].filter((value): value is string => typeof value === "string" && looksLikeUsefulText(value));

  return compactWhitespace(uniqueTextChunks(chunks).join("\n\n"));
};

const collectEmbeddedJsonText = (html: string) => {
  const $ = cheerio.load(html);
  const chunks: string[] = [];

  $("script[type*='json'], script#__NEXT_DATA__").each((_index, element) => {
    const raw = $(element).text();
    if (!raw) return;
    try {
      const extracted = extractConversationTextFromJson(JSON.parse(raw));
      if (extracted) chunks.push(extracted);
    } catch {
      // Ignore non-JSON script content.
    }
  });

  return compactWhitespace(chunks.join("\n\n"));
};

const readBalancedJsonCandidate = (source: string, startIndex: number) => {
  const opener = source[startIndex];
  if (opener !== "{" && opener !== "[") return null;

  const stack: string[] = [];
  let quote: string | null = null;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char === "{" ? "}" : "]");
      continue;
    }

    if ((char === "}" || char === "]") && stack.at(-1) === char) {
      stack.pop();
      if (stack.length === 0) return source.slice(startIndex, index + 1);
    }
  }

  return null;
};

const parseJsonCandidate = (candidate: string) => {
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
};

const collectJsonCandidatesAfter = (source: string, marker: string) => {
  const chunks: string[] = [];
  let searchIndex = 0;

  while (searchIndex < source.length) {
    const markerIndex = source.indexOf(marker, searchIndex);
    if (markerIndex === -1) break;

    const objectStart = source.slice(markerIndex, markerIndex + 240).search(/[{\[]/);
    if (objectStart !== -1) {
      const candidate = readBalancedJsonCandidate(source, markerIndex + objectStart);
      const parsed = candidate ? parseJsonCandidate(candidate) : null;
      const extracted = parsed ? extractConversationTextFromJson(parsed) : "";
      if (extracted) chunks.push(extracted);
    }

    searchIndex = markerIndex + marker.length;
  }

  return chunks;
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

const collectDecodedScriptStrings = (source: string) => {
  const chunks: string[] = [];
  const stringPattern = /"((?:\\.|[^"\\]){20,})"/g;

  for (const match of source.matchAll(stringPattern)) {
    const decoded = decodeEscapedJsonString(match[1] ?? "");
    const trimmed = decoded.trim();
    const parsed = (trimmed.startsWith("{") || trimmed.startsWith("[")) ? parseJsonCandidate(trimmed) : null;
    const extracted = parsed ? extractConversationTextFromJson(parsed) : "";

    if (extracted) {
      chunks.push(extracted);
    } else if (looksLikeUsefulText(decoded)) {
      chunks.push(decoded);
    }
  }

  return chunks;
};

const collectInlineScriptText = (html: string) => {
  const $ = cheerio.load(html);
  const chunks: string[] = [];
  const markers = [
    "__NEXT_DATA__",
    "__NUXT__",
    "__INITIAL_STATE__",
    "__APOLLO_STATE__",
    "__REMIX_CONTEXT",
    "__next_f.push",
    "self.__next_f.push",
    "conversation",
    "messages",
    "prompt",
    "response"
  ];
  const usefulScriptPattern = /conversation|messages|chat|prompt|response|answer|__next_f|__NUXT|__INITIAL_STATE|__APOLLO_STATE|__REMIX_CONTEXT|__NEXT_DATA__/i;

  $("script").each((_index, element) => {
    const raw = $(element).text();
    if (!raw.trim()) return;

    for (const marker of markers) {
      chunks.push(...collectJsonCandidatesAfter(raw, marker));
    }

    if (usefulScriptPattern.test(raw)) {
      chunks.push(...collectDecodedScriptStrings(raw));
    }
  });

  return compactWhitespace(uniqueTextChunks(chunks).join("\n\n"));
};

const collectJsonDocumentText = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return "";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const extracted = extractConversationTextFromJson(parsed);
    if (extracted) return extracted;
    return compactWhitespace(JSON.stringify(parsed, null, 2));
  } catch {
    return "";
  }
};

const looksLikeSharePlaceholder = (text: string) => {
  const lower = text.toLowerCase();
  return (
    lower.includes("by messaging chatgpt") ||
    lower.includes("agree to our terms") ||
    lower.includes("continue with google") ||
    lower.includes("enable javascript") ||
    lower.includes("log in to continue") ||
    lower.includes("please sign in") ||
    lower.includes("privacy policy") ||
    lower.includes("sign in to continue") ||
    lower.includes("unsupported browser") ||
    lower === "voice"
  );
};

const providerLabelFromUrl = (url: URL) => {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host.includes("chatgpt") || host.includes("openai")) return "ChatGPT";
  if (host.includes("claude") || host.includes("anthropic")) return "Claude";
  if (host.includes("gemini") || host === "g.co" || host.includes("google")) return "Gemini";
  if (host.includes("deepseek")) return "DeepSeek";
  if (host.includes("grok") || host === "x.com" || host.endsWith(".x.com")) return "Grok";

  return host;
};

const readClaudeShareId = (url: URL) => {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "claude.ai" && host !== "claude.com") return null;

  const [, section, id] = url.pathname.split("/");
  if (section !== "share" || !id || !/^[0-9a-f-]{32,40}$/i.test(id)) return null;

  return id;
};

const fetchClaudeShareSnapshot = async (url: URL) => {
  const shareId = readClaudeShareId(url);
  if (!shareId) return "";

  const endpoint = `https://${url.hostname}/api/chat_snapshots/${encodeURIComponent(shareId)}`;
  let response: Response;

  try {
    await fetch(url, {
      headers: {
        "user-agent": SHARE_FETCH_USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/json,text/plain"
      },
      signal: AbortSignal.timeout(SHARE_FETCH_TIMEOUT_MS)
    }).catch(() => undefined);

    response = await fetch(endpoint, {
      headers: {
        "user-agent": SHARE_FETCH_USER_AGENT,
        accept: "application/json,text/plain,*/*",
        "anthropic-client-platform": "web",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        referer: url.toString()
      },
      signal: AbortSignal.timeout(SHARE_FETCH_TIMEOUT_MS)
    });
  } catch {
    return "";
  }

  if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("json")) {
    return "";
  }

  const body = await readLimitedResponseText(response);
  const parsed = parseJsonCandidate(body);
  const extracted = parsed ? extractConversationTextFromJson(parsed) : "";

  if (!extracted) return "";

  return compactWhitespace(`
Claude Share Snapshot

Source URL: ${url.toString()}

${extracted}
`);
};

const buildShareLinkFallback = ({
  sourceUrl,
  finalUrl,
  meta,
  visible
}: {
  sourceUrl: URL;
  finalUrl?: string;
  meta: string;
  visible: string;
}) => {
  const readableSignals = compactWhitespace([meta, visible].filter(Boolean).join("\n\n"));

  return compactWhitespace(`
Public AI Conversation Share Link

Provider: ${providerLabelFromUrl(sourceUrl)}
Source URL: ${sourceUrl.toString()}
${finalUrl && finalUrl !== sourceUrl.toString() ? `Resolved URL: ${finalUrl}` : ""}

Readable page signals:
${readableSignals || "The provider returned a public page, but did not expose the full transcript in server-readable HTML, JSON, or metadata."}

Extraction note:
The conversation page loaded successfully, but the complete transcript appears to be hidden behind client-side rendering, login gating, bot protection, or a provider-specific private payload. Treat this Flow as a link-based handoff and preserve that limitation clearly. Continue by helping the user recover or continue the work from the available link context; if exact message history is required, ask for a pasted transcript or .txt/.json export.
`);
};

const fetchPublicShareUrl = async (url: URL, redirectCount = 0): Promise<Response> => {
  await validatePublicShareUrl(url);

  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "manual",
      headers: {
        "user-agent": SHARE_FETCH_USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/json,text/plain"
      },
      signal: AbortSignal.timeout(SHARE_FETCH_TIMEOUT_MS)
    });
  } catch {
    throw new AppError(
      502,
      "AIFlow could not reach that share link. Try pasting the conversation as raw text, or upload a .txt/.json export."
    );
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new AppError(response.status, "The share link redirected without a destination URL.");
    }

    if (redirectCount >= MAX_SHARE_REDIRECTS) {
      throw new AppError(400, "The share link redirected too many times.");
    }

    return fetchPublicShareUrl(new URL(location, url), redirectCount + 1);
  }

  return response;
};

const assertReadableShareResponse = (response: Response) => {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType && !/(text|html|json|xml|javascript)/.test(contentType)) {
    throw new AppError(
      415,
      "The share link returned a file type AIFlow cannot read. Paste the conversation as raw text or upload a .txt/.json export."
    );
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SHARE_RESPONSE_BYTES) {
    throw new AppError(413, "The share link response is too large. Paste a trimmed conversation or upload a .txt/.json export.");
  }
};

const readLimitedResponseText = async (response: Response) => {
  assertReadableShareResponse(response);

  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > MAX_SHARE_RESPONSE_BYTES) {
      await reader.cancel();
      throw new AppError(413, "The share link response is too large. Paste a trimmed conversation or upload a .txt/.json export.");
    }

    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
};

export const fetchShareLinkConversation = async (shareUrl: string) => {
  let url: URL;
  try {
    url = new URL(shareUrl);
  } catch {
    throw new AppError(400, "Enter a valid public AI conversation URL.");
  }

  const providerSnapshot = await fetchClaudeShareSnapshot(url);
  if (providerSnapshot) {
    return assertConversationLength(truncate(providerSnapshot, MAX_CONVERSATION_CHARS));
  }

  const response = await fetchPublicShareUrl(url);
  if (!response.ok) {
    throw new AppError(response.status, "The share link could not be fetched. Make sure it is public.");
  }

  const body = await readLimitedResponseText(response);
  const jsonDocument = collectJsonDocumentText(body);
  const embedded = collectEmbeddedJsonText(body);
  const reactFlight = collectReactFlightText(body);
  const inlineScript = collectInlineScriptText(body);
  const meta = collectMetaText(body);
  const visible = collectVisibleText(body);
  const structuredConversation = compactWhitespace([jsonDocument, embedded, reactFlight, inlineScript].filter(Boolean).join("\n\n"));
  const combined = structuredConversation || compactWhitespace([meta, visible].filter(Boolean).join("\n\n"));

  if (combined.length < MIN_SHARE_CONVERSATION_CHARS || (!structuredConversation && !meta && looksLikeSharePlaceholder(combined))) {
    return assertConversationLength(
      buildShareLinkFallback({
        sourceUrl: url,
        finalUrl: response.url,
        meta,
        visible
      })
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
