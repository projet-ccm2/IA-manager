import { GoogleGenAI } from "@google/genai";
import type { AchievementAdviceResponse } from "../types/achievement";
import { RateLimitError, TimeoutError } from "../errors/achievementAdvice";
import { ACHIEVEMENT_ADVICE_SYSTEM_INSTRUCTION } from "../prompts/achievementAdvice";

// TODO: adapt from model
const ACHIEVEMENT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    goal: { type: "number" },
    reward: { type: "number" },
    label: { type: "string" },
  },
  required: ["title", "description", "goal", "reward", "label"],
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

function parseResponse(text: string | undefined): AchievementAdviceResponse {
  if (!text) throw new Error("Empty response from Gemini");
  const parsed = JSON.parse(text) as unknown;
  if (!isValidAchievement(parsed)) throw new Error("Invalid response format");
  return parsed;
}

function shouldRetry(err: unknown, attempt: number): boolean {
  return isRateLimitError(err) && attempt < MAX_RETRIES;
}

function rethrowOrMapError(err: unknown): never {
  if (err instanceof Error && err.name === "AbortError")
    throw new TimeoutError();
  if (err instanceof RateLimitError || err instanceof TimeoutError) throw err;
  if (isRateLimitError(err)) throw new RateLimitError();
  throw err;
}

export async function getAchievementAdvice(
  apiKey: string,
  model: string,
  channelName: string,
  prompt: string,
): Promise<AchievementAdviceResponse> {
  const ai = new GoogleGenAI({ apiKey });

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
              { text: `Channel: ${channelName}\n\nUser request: ${prompt}` },
            ],
          },
        ],
        config: {
          systemInstruction: ACHIEVEMENT_ADVICE_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: ACHIEVEMENT_RESPONSE_SCHEMA,
          abortSignal: controller.signal,
        },
      });
      clearTimeout(timeoutId);
      return parseResponse(response.text);
    } catch (err) {
      clearTimeout(timeoutId);
      if (shouldRetry(err, attempt)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      rethrowOrMapError(err);
    }
  }

  throw new RateLimitError();
}

function isValidAchievement(obj: unknown): obj is AchievementAdviceResponse {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    typeof o.description === "string" &&
    typeof o.goal === "number" &&
    typeof o.reward === "number" &&
    typeof o.label === "string"
  );
}
