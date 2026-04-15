import { Request, Response } from "express";
import { getAchievementAdvice } from "../services/achievementAdvice";
import { config } from "../config/environment";
import { logger } from "../utils/logger";
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
  logger.warn("Request error", { status, error, message });
  res.status(status).json({ error, message });
}

export async function createSuggestion(req: Request, res: Response) {
  logger.debug("Incoming suggestion request", {
    body: req.body,
    contentType: req.headers["content-type"],
  });

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
    logger.debug("Calling AI service", {
      model: config.geminiModel,
      promptLength: prompt.trim().length,
      supportedTriggerLabels,
    });

    const suggestion = await getAchievementAdvice(
      config.geminiApiKey,
      config.geminiModel,
      prompt.trim(),
      supportedTriggerLabels,
    );

    logger.info("Suggestion generated successfully", {
      title: suggestion.title,
      triggerLabel: suggestion.type.label,
    });

    res.status(200).json(suggestion);
  } catch (err) {
    const errorContext = {
      errorName: err instanceof Error ? err.name : "Unknown",
      errorMessage: err instanceof Error ? err.message : String(err),
      prompt: prompt.trim(),
      supportedTriggerLabels,
    };

    if (err instanceof InvalidOutputError) {
      logger.error("AI returned invalid output", errorContext);
      sendError(
        res,
        422,
        "Unprocessable Entity",
        "AI output invalid or incomplete",
      );
      return;
    }
    if (err instanceof RateLimitError) {
      logger.error("Gemini rate limit hit", errorContext);
      sendError(
        res,
        429,
        "Too many requests",
        "Gemini API rate limit exceeded. Wait a few minutes or check your quota at aistudio.google.com",
      );
      return;
    }
    if (err instanceof TimeoutError) {
      logger.error("AI request timed out", errorContext);
      sendError(
        res,
        504,
        "Gateway timeout",
        "Request timed out. Please try again.",
      );
      return;
    }

    logger.error("Unexpected error in suggestion generation", {
      ...errorContext,
      stack: err instanceof Error ? err.stack : undefined,
    });

    sendError(
      res,
      503,
      "Service unavailable",
      "Unable to generate suggestion. Please try again later.",
    );
  }
}
