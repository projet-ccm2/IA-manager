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

describe("POST /achievements/suggestions", () => {
  const validSuggestion = {
    title: "First 100 Messages",
    description:
      "Unlock this achievement after sending 100 messages in the channel.",
    goal: 100,
    reward: 250,
    secret: false,
    public: false,
    active: true,
    type: { label: "message", data: null },
  };

  beforeEach(() => {
    mockGetAchievementAdvice.mockReset();
  });

  it("returns 400 when body is empty", async () => {
    const response = await request(app)
      .post("/achievements/suggestions")
      .send({});
    expect(response.status).toBe(400);
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt is missing", async () => {
    const response = await request(app)
      .post("/achievements/suggestions")
      .send({ supportedTriggerLabels: ["message"] });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "Validation error",
    });
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt is not a string", async () => {
    const response = await request(app)
      .post("/achievements/suggestions")
      .send({ prompt: 123 });

    expect(response.status).toBe(400);
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt is empty string", async () => {
    const response = await request(app)
      .post("/achievements/suggestions")
      .send({ prompt: "   " });

    expect(response.status).toBe(400);
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 400 when supportedTriggerLabels is invalid", async () => {
    const response = await request(app)
      .post("/achievements/suggestions")
      .send({ prompt: "p", supportedTriggerLabels: ["not_allowed"] });

    expect(response.status).toBe(400);
    expect(mockGetAchievementAdvice).not.toHaveBeenCalled();
  });

  it("returns 200 with suggestion when service succeeds", async () => {
    mockGetAchievementAdvice.mockResolvedValue(validSuggestion);

    const response = await request(app)
      .post("/achievements/suggestions")
      .send({ prompt: "first chat achievement" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(validSuggestion);
    expect(mockGetAchievementAdvice).toHaveBeenCalledWith(
      config.geminiApiKey,
      config.geminiModel,
      "first chat achievement",
      undefined,
    );
  });

  it("returns 422 when service throws InvalidOutputError", async () => {
    const { InvalidOutputError } = await import(
      "../../errors/achievementAdvice"
    );
    mockGetAchievementAdvice.mockRejectedValue(new InvalidOutputError());

    const response = await request(app)
      .post("/achievements/suggestions")
      .send({ prompt: "p" });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: "Unprocessable Entity" });
  });

  it("returns 429 when service throws RateLimitError", async () => {
    const { RateLimitError } = await import("../../errors/achievementAdvice");
    mockGetAchievementAdvice.mockRejectedValue(new RateLimitError());

    const response = await request(app)
      .post("/achievements/suggestions")
      .send({ prompt: "p" });

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({ error: "Too many requests" });
  });

  it("returns 504 when service throws TimeoutError", async () => {
    const { TimeoutError } = await import("../../errors/achievementAdvice");
    mockGetAchievementAdvice.mockRejectedValue(new TimeoutError());

    const response = await request(app)
      .post("/achievements/suggestions")
      .send({ prompt: "p" });

    expect(response.status).toBe(504);
    expect(response.body).toMatchObject({ error: "Gateway timeout" });
  });

  it("returns 503 when service throws generic error", async () => {
    mockGetAchievementAdvice.mockRejectedValue(new Error("Network error"));

    const response = await request(app)
      .post("/achievements/suggestions")
      .send({ prompt: "p" });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ error: "Service unavailable" });
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
      .post("/achievements/suggestions")
      .send({ prompt: "p" });

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
      .post("/achievements/suggestions")
      .set("Content-Type", "application/json")
      .send("invalid json {");

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ error: "Internal server error" });
  });
});
