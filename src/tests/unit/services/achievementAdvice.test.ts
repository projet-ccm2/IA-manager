import { getAchievementAdvice } from "../../../services/achievementAdvice";
import {
  InvalidOutputError,
  RateLimitError,
  TimeoutError,
} from "../../../errors/achievementAdvice";

const mockGenerateContent = jest.fn();

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe("getAchievementAdvice", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it("returns parsed suggestion when Gemini returns valid JSON", async () => {
    const suggestion = {
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

    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(suggestion) });

    const result = await getAchievementAdvice(
      "test-api-key",
      "gemini-2.0-flash",
      "suggest an achievement",
      undefined,
    );

    expect(result).toEqual(suggestion);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.0-flash",
        config: expect.objectContaining({
          responseMimeType: "application/json",
          responseJsonSchema: expect.any(Object),
        }),
      }),
    );
  });

  it("throws InvalidOutputError when Gemini returns invalid JSON", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not valid json {" });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).rejects.toThrow(InvalidOutputError);
  });

  it("throws InvalidOutputError when Gemini returns invalid structure", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ title: "only" }),
    });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).rejects.toThrow(InvalidOutputError);
  });

  it("accepts channel_point_cost when data is a positive number", async () => {
    const suggestion = {
      title: "Spend Points",
      description: "Unlock by spending channel points.",
      goal: 10,
      reward: 1,
      secret: false,
      public: false,
      active: true,
      type: { label: "channel_point_cost", data: 25 },
    };

    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(suggestion) });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).resolves.toEqual(suggestion);
  });

  it("accepts channel_point_cost when data is a positive numeric string", async () => {
    const suggestion = {
      title: "Redeem Cost",
      description: "Unlock by redeeming at a cost.",
      goal: 10,
      reward: 1,
      secret: false,
      public: false,
      active: true,
      type: { label: "channel_point_cost", data: "25" },
    };

    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(suggestion) });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).resolves.toEqual(suggestion);
  });

  it("rejects channel_point_cost when data is non-positive", async () => {
    const suggestion = {
      title: "Invalid Cost",
      description: "Should fail validation.",
      goal: 10,
      reward: 1,
      secret: false,
      public: false,
      active: true,
      type: { label: "channel_point_cost", data: "0" },
    };

    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(suggestion) });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).rejects.toThrow(InvalidOutputError);
  });

  it("throws InvalidOutputError when AI uses a trigger label outside supportedTriggerLabels", async () => {
    const suggestion = {
      title: "First 100 Messages",
      description:
        "Unlock this achievement after sending 100 messages in the channel.",
      goal: 100,
      reward: 250,
      secret: false,
      public: false,
      active: true,
      type: { label: "message_content", data: "hello" },
    };

    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(suggestion) });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", ["message"]),
    ).rejects.toThrow(InvalidOutputError);
  });

  it("throws RateLimitError when Gemini returns 429", async () => {
    const err = new Error("Rate limit exceeded");
    (err as { status?: number }).status = 429;
    mockGenerateContent.mockRejectedValue(err);

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).rejects.toThrow(RateLimitError);
  }, 10000);

  it("throws TimeoutError when request is aborted", async () => {
    const err = new Error("Aborted");
    err.name = "AbortError";
    mockGenerateContent.mockRejectedValue(err);

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).rejects.toThrow(TimeoutError);
  });

  it("rethrows RateLimitError when already thrown", async () => {
    mockGenerateContent.mockRejectedValue(new RateLimitError());

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).rejects.toThrow(RateLimitError);
  });

  it("rethrows TimeoutError when already thrown", async () => {
    mockGenerateContent.mockRejectedValue(new TimeoutError());

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).rejects.toThrow(TimeoutError);
  });

  it("rethrows non-Error exceptions", async () => {
    mockGenerateContent.mockRejectedValue("string error");

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "prompt", undefined),
    ).rejects.toBe("string error");
  });
});
