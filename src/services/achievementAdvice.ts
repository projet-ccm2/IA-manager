import { GoogleGenAI } from "@google/genai";
import type {
  AchievementSuggestionResponse,
  TriggerLabel,
} from "../types/achievement";
import {
  isBoolean,
  isNonEmptyString,
  isNonNegativeInt,
  isPositiveInt,
  isSupportedTriggerLabel,
  SUPPORTED_TRIGGER_LABELS,
} from "../types/achievement";
import {
  InvalidOutputError,
  RateLimitError,
  TimeoutError,
} from "../errors/achievementAdvice";
import { ACHIEVEMENT_ADVICE_SYSTEM_INSTRUCTION } from "../prompts/achievementAdvice";

const ACHIEVEMENT_SUGGESTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    goal: { type: "integer" },
    reward: { type: "integer" },
    secret: { type: "boolean" },
    public: { type: "boolean" },
    active: { type: "boolean" },
    type: {
      type: "object",
      properties: {
        label: { type: "string" },
        data: {},
      },
      required: ["label", "data"],
    },
  },
  required: [
    "title",
    "description",
    "goal",
    "reward",
    "secret",
    "public",
    "active",
    "type",
  ],
};

const TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

function isRateLimitError(err: unknown): boolean {
  const status =
    (err as { status?: number }).status ??
    (err as { statusCode?: number }).statusCode;
  if (status === 429) return true;
  const msg = (err as Error)?.message?.toLowerCase() ?? "";
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("resource exhausted")
  );
}

function isValidTriggerTypeData(label: TriggerLabel, data: unknown): boolean {
  if (label === "message") return data === null;
  if (label === "message_content") return isNonEmptyString(data);
  if (label === "redeem_channel_point") return isNonEmptyString(data);
  if (label === "api_caller") return isNonEmptyString(data);
  if (label === "channel_point_cost") {
    if (typeof data === "number") return Number.isFinite(data) && data > 0;
    if (typeof data === "string") {
      const v = Number.parseFloat(data);
      return Number.isFinite(v) && v > 0;
    }
    return false;
  }
  return false;
}

function isValidSuggestion(obj: unknown): obj is AchievementSuggestionResponse {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;

  if (!isNonEmptyString(o.title)) return false;
  if (!isNonEmptyString(o.description)) return false;
  if (!isPositiveInt(o.goal)) return false;
  if (!isNonNegativeInt(o.reward)) return false;
  if (!isBoolean(o.secret)) return false;
  if (!isBoolean(o.public)) return false;
  if (!isBoolean(o.active)) return false;

  if (!o.type || typeof o.type !== "object") return false;
  const t = o.type as Record<string, unknown>;
  if (!isSupportedTriggerLabel(t.label)) return false;
  const label = t.label as TriggerLabel;

  if (!("data" in t)) return false;
  if (!isValidTriggerTypeData(label, t.data)) return false;

  return true;
}

function toInvalidOutput(): InvalidOutputError {
  return new InvalidOutputError("AI output invalid or incomplete");
}

function parseSuggestion(
  text: string | undefined,
): AchievementSuggestionResponse {
  if (!text) throw toInvalidOutput();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw toInvalidOutput();
  }

  if (!isValidSuggestion(parsed)) throw toInvalidOutput();
  return parsed;
}

function shouldRetry(err: unknown, attempt: number): boolean {
  return isRateLimitError(err) && attempt < MAX_RETRIES;
}

function mapOrThrow(err: unknown): never {
  if (err instanceof Error && err.name === "AbortError")
    throw new TimeoutError();
  if (
    err instanceof RateLimitError ||
    err instanceof TimeoutError ||
    err instanceof InvalidOutputError
  )
    throw err;
  if (isRateLimitError(err)) throw new RateLimitError();
  throw err;
}

export async function getAchievementAdvice(
  apiKey: string,
  model: string,
  prompt: string,
  supportedTriggerLabels?: TriggerLabel[],
): Promise<AchievementSuggestionResponse> {
  const ai = new GoogleGenAI({ apiKey });
  const supported = supportedTriggerLabels?.length
    ? supportedTriggerLabels
    : [...SUPPORTED_TRIGGER_LABELS];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `User prompt:\n${prompt}\n\nsupportedTriggerLabels:\n${supported.join(", ")}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: ACHIEVEMENT_ADVICE_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: ACHIEVEMENT_SUGGESTION_RESPONSE_SCHEMA,
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timeoutId);
      const suggestion = parseSuggestion(response.text);
      if (supportedTriggerLabels?.length) {
        if (!supportedTriggerLabels.includes(suggestion.type.label)) {
          throw new InvalidOutputError(
            "AI output uses an unsupported trigger label",
          );
        }
      }
      return suggestion;
    } catch (err) {
      clearTimeout(timeoutId);
      if (shouldRetry(err, attempt)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      mapOrThrow(err);
    }
  }

  throw new RateLimitError();
}
