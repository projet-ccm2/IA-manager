import { Request, Response } from "express";
import { getAchievementAdvice } from "../services/achievementAdvice";
import { config } from "../config/environment";
import { RateLimitError, TimeoutError } from "../errors/achievementAdvice";

function sendError(
  res: Response,
  status: number,
  error: string,
  message: string,
) {
  res.status(status).json({ error, message });
}

export async function adviceForAchievement(req: Request, res: Response) {
  const body = req.body;
  const channelName = body?.channelName;
  const prompt = body?.prompt;

  if (typeof channelName !== "string" || !channelName.trim()) {
    sendError(
      res,
      400,
      "Validation error",
      "channelName is required and must be a non-empty string",
    );
    return;
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    sendError(
      res,
      400,
      "Validation error",
      "prompt is required and must be a non-empty string",
    );
    return;
  }

  if (!config.geminiApiKey) {
    sendError(res, 503, "Service unavailable", "AI service is not configured");
    return;
  }

  try {
    const achievement = await getAchievementAdvice(
      config.geminiApiKey,
      config.geminiModel,
      channelName.trim(),
      prompt.trim(),
    );
    res.status(200).json(achievement);
  } catch (err) {
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
      "Unable to generate achievement. Please try again later.",
    );
  }
}
