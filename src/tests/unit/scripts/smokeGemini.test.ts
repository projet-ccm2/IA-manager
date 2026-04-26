jest.mock("dotenv/config", () => ({}));

const mockConfig = {
  gcpProjectId: "test-project",
  gcpLocation: "europe-west1",
  geminiModel: "gemini-test",
};

jest.mock("../../../config/environment", () => ({ config: mockConfig }));

const mockGetAchievementAdvice = jest.fn();
jest.mock("../../../services/achievementAdvice", () => ({
  getAchievementAdvice: mockGetAchievementAdvice,
}));

const flush = () => new Promise<void>((r) => setImmediate(r));

const validResult = {
  title: "Top Chatter",
  description: "Send 10 messages.",
  goal: 10,
  reward: 50,
  secret: false,
  public: false,
  active: true,
  type: { label: "countMessage", data: null },
};

describe("smokeGemini script", () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    mockGetAchievementAdvice.mockReset();
    mockConfig.gcpProjectId = "test-project";
    process.exitCode = undefined;
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("logs success JSON when getAchievementAdvice resolves", async () => {
    mockGetAchievementAdvice.mockResolvedValueOnce(validResult);

    await import("../../../scripts/smokeGemini");
    await flush();

    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed).toMatchObject({
      ok: true,
      project: "test-project",
      location: "europe-west1",
      model: "gemini-test",
      title: "Top Chatter",
      triggerLabel: "countMessage",
    });
  });

  it("logs error JSON and sets exitCode=1 when getAchievementAdvice rejects with Error", async () => {
    mockGetAchievementAdvice.mockRejectedValueOnce(new Error("API down"));

    await import("../../../scripts/smokeGemini");
    await flush();

    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(parsed).toMatchObject({ ok: false, error: "API down" });
    expect(process.exitCode).toBe(1);
  });

  it("logs error JSON and sets exitCode=1 when rejection is not an Error", async () => {
    mockGetAchievementAdvice.mockRejectedValueOnce("network failure");

    await import("../../../scripts/smokeGemini");
    await flush();

    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(parsed).toMatchObject({ ok: false, error: "network failure" });
    expect(process.exitCode).toBe(1);
  });

  it("logs error JSON and sets exitCode=1 when gcpProjectId is missing", async () => {
    mockConfig.gcpProjectId = "";

    await import("../../../scripts/smokeGemini");
    await flush();

    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(parsed).toMatchObject({
      ok: false,
      error: expect.stringContaining("Missing Google Cloud project"),
    });
    expect(process.exitCode).toBe(1);
  });
});
