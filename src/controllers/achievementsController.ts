import { Request, Response } from "express";
import { getAchievementAdvice } from "../services/achievementAdvice";
import { config } from "../config/environment";
import {
  InvalidOutputError,
  RateLimitError,
  TimeoutError,
} from "../errors/achievementAdvice";
import {
  isNonEmptyString,
  isSupportedTriggerLabel,
  type TriggerLabel,
} from "../types/achievement";

function sendError(
  res: Response,
  status: number,
  error: string,
  message: string,
) {
  res.status(status).json({ error, message });
}

export async function createSuggestion(req: Request, res: Response) {
  const body = req.body as unknown;
  const input = body as {
    prompt?: unknown;
    supportedTriggerLabels?: unknown;
  };

  const prompt = input?.prompt;
  if (!isNonEmptyString(prompt)) {
    sendError(
      res,
      400,
      "Validation error",
      "prompt is required and must be a non-empty string",
    );
    return;
  }

  const supportedRaw = input?.supportedTriggerLabels;
  let supportedTriggerLabels: TriggerLabel[] | undefined;
  if (supportedRaw !== undefined) {
    if (
      !Array.isArray(supportedRaw) ||
      supportedRaw.some((v) => !isSupportedTriggerLabel(v))
    ) {
      sendError(
        res,
        400,
        "Validation error",
        "supportedTriggerLabels must be an array of allowed trigger labels",
      );
      return;
    }

    supportedTriggerLabels = supportedRaw as TriggerLabel[];
  }

  if (!config.geminiApiKey) {
    sendError(res, 503, "Service unavailable", "AI service is not configured");
    return;
  }

  try {
    const suggestion = await getAchievementAdvice(
      config.geminiApiKey,
      config.geminiModel,
      prompt.trim(),
      supportedTriggerLabels,
    );
    res.status(200).json(suggestion);
  } catch (err) {
    if (err instanceof InvalidOutputError) {
      sendError(
        res,
        422,
        "Unprocessable Entity",
        "AI output invalid or incomplete",
      );
      return;
    }
    if (err instanceof RateLimitError) {
      sendError(
        res,
        429,
        "Too many requests",
        "Gemini API rate limit exceeded. Wait a few minutes or check your quota at aistudio.google.com",
      );
      return;
    }
    if (err instanceof TimeoutError) {
      sendError(
        res,
        504,
        "Gateway timeout",
        "Request timed out. Please try again.",
      );
      return;
    }

    sendError(
      res,
      503,
      "Service unavailable",
      "Unable to generate suggestion. Please try again later.",
    );
  }
}
