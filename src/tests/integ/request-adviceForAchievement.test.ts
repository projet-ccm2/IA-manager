import request from "supertest";
import app from "../../index";
import { config } from "../../config/environment";

jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockGetAchievementAdvice = jest.fn();
jest.mock("../../services/achievementAdvice", () => ({
  getAchievementAdvice: (...args: unknown[]) =>
    mockGetAchievementAdvice(...args),
}));

describe("POST /request/adviceForAchievement", () => {
  const validAchievement = {
    title: "First Chat",
    description: "Send your first message",
    goal: 1,
    reward: 10,
    label: "Chat once",
  };

  beforeEach(() => {
    mockGetAchievementAdvice.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("returns 400 when body is empty", async () => {
    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({});

    expect(response.status).toBe(400);
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when channelName is missing", async () => {
    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ prompt: "suggest something" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "Validation error",
      message: expect.stringContaining("channelName"),
    });
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt is not a string", async () => {
    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ channelName: "ch", prompt: 123 });

    expect(response.status).toBe(400);
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt is missing", async () => {
    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ channelName: "testChannel" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "Validation error",
      message: expect.stringContaining("prompt"),
    });
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when channelName is not a string", async () => {
    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ channelName: 123, prompt: "suggest" });

    expect(response.status).toBe(400);
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when channelName is empty string", async () => {
    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ channelName: "   ", prompt: "suggest" });

    expect(response.status).toBe(400);
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt is empty string", async () => {
    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ channelName: "ch", prompt: "   " });

    expect(response.status).toBe(400);
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 200 with achievement when service succeeds", async () => {
    mockGetAchievementAdvice.mockResolvedValue(validAchievement);

    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ channelName: "myChannel", prompt: "first chat achievement" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(validAchievement);
    expect(mockGetAchievementAdvice).toHaveBeenCalledWith(
      config.geminiApiKey,
      config.geminiModel,
      "myChannel",
      "first chat achievement",
    );
  });

  it("returns 429 when service throws RateLimitError", async () => {
    const { RateLimitError } = await import("../../errors/achievementAdvice");
    mockGetAchievementAdvice.mockRejectedValue(new RateLimitError());

    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ channelName: "ch", prompt: "p" });

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      error: "Too many requests",
    });
  });

  it("returns 504 when service throws TimeoutError", async () => {
    const { TimeoutError } = await import("../../errors/achievementAdvice");
    mockGetAchievementAdvice.mockRejectedValue(new TimeoutError());

    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ channelName: "ch", prompt: "p" });

    expect(response.status).toBe(504);
    expect(response.body).toMatchObject({
      error: "Gateway timeout",
    });
  });

  it("returns 503 when service throws generic error", async () => {
    mockGetAchievementAdvice.mockRejectedValue(new Error("Network error"));

    const response = await request(app)
      .post("/request/adviceForAchievement")
      .send({ channelName: "ch", prompt: "p" });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      error: "Service unavailable",
    });
  });

  it("returns 503 when GEMINI_API_KEY is not set", async () => {
    jest.resetModules();
    jest.doMock("../../config/environment", () => ({
      config: {
        port: 3000,
        nodeEnv: "test",
        geminiApiKey: "",
        geminiModel: "gemini-2.0-flash",
        cors: { allowedOrigins: [] },
      },
    }));
    const appNoKey = (await import("../../index")).default;

    const response = await request(appNoKey)
      .post("/request/adviceForAchievement")
      .send({ channelName: "ch", prompt: "p" });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      error: "Service unavailable",
      message: expect.stringContaining("not configured"),
    });
  });
});

describe("Global error handler", () => {
  it("returns 500 for malformed JSON body", async () => {
    const response = await request(app)
      .post("/request/adviceForAchievement")
      .set("Content-Type", "application/json")
      .send("invalid json {");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ error: "Internal server error" });
  });
});
