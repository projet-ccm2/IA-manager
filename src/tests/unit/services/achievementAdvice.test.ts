import { getAchievementAdvice } from "../../../services/achievementAdvice";
import { RateLimitError, TimeoutError } from "../../../errors/achievementAdvice";

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

  it("returns parsed achievement when Gemini returns valid JSON", async () => {
    const achievement = {
      title: "First Chat",
      description: "Send your first message in the channel",
      goal: 1,
      reward: 10,
      label: "Chat 1 time",
    };
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(achievement),
    });

    const result = await getAchievementAdvice(
      "test-api-key",
      "gemini-2.0-flash",
      "testChannel",
      "suggest a simple achievement"
    );

    expect(result).toEqual(achievement);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.0-flash",
        contents: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            parts: [
              {
                text: expect.stringContaining("Channel: testChannel"),
              },
            ],
          }),
        ]),
        config: expect.objectContaining({
          responseMimeType: "application/json",
          responseJsonSchema: expect.any(Object),
        }),
      })
    );
  });

  it("throws RateLimitError when Gemini returns 429", async () => {
    const err = new Error("Rate limit exceeded");
    (err as { status?: number }).status = 429;
    mockGenerateContent.mockRejectedValue(err);

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "channel", "prompt")
    ).rejects.toThrow(RateLimitError);
  }, 10000);

  it("throws TimeoutError when request is aborted", async () => {
    const err = new Error("Aborted");
    err.name = "AbortError";
    mockGenerateContent.mockRejectedValue(err);

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "channel", "prompt")
    ).rejects.toThrow(TimeoutError);
  });

  it("throws when Gemini returns null JSON", async () => {
    mockGenerateContent.mockResolvedValue({ text: "null" });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "channel", "prompt")
    ).rejects.toThrow("Invalid response format");
  });

  it("throws when Gemini returns empty text", async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "channel", "prompt")
    ).rejects.toThrow("Empty response from Gemini");
  });

  it("throws when Gemini returns invalid JSON", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not valid json {" });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "channel", "prompt")
    ).rejects.toThrow();
  });

  it("throws when response does not match schema", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ title: "only title", description: 123 }),
    });

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "channel", "prompt")
    ).rejects.toThrow("Invalid response format");
  });

  it("rethrows RateLimitError when already thrown", async () => {
    mockGenerateContent.mockRejectedValue(new RateLimitError());

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "channel", "prompt")
    ).rejects.toThrow(RateLimitError);
  });

  it("rethrows TimeoutError when already thrown", async () => {
    mockGenerateContent.mockRejectedValue(new TimeoutError());

    await expect(
      getAchievementAdvice("key", "gemini-2.0-flash", "channel", "prompt")
    ).rejects.toThrow(TimeoutError);
  });

  it("rethrows non-Error exceptions", async () => {
    mockGenerateContent.mockRejectedValue("string error");

    await expect(getAchievementAdvice("key", "gemini-2.0-flash", "channel", "prompt")).rejects.toBe(
      "string error"
    );
  });
});
