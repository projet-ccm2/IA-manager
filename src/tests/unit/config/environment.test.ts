describe("Environment Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("validateConfig", () => {
    it("should use default values when optional env vars are not set", () => {
      delete process.env.PORT;
      delete process.env.NODE_ENV;
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.GCP_PROJECT_ID;
      delete process.env.GCP_LOCATION;
      delete process.env.GEMINI_MODEL;

      const { config } = require("../../../config/environment");

      expect(config.port).toBe(3000);
      expect(config.nodeEnv).toBe("development");
      expect(config.gcpProjectId).toBe("");
      expect(config.gcpLocation).toBe("global");
      expect(config.geminiModel).toBe("gemini-2.5-flash");
      expect(config.cors.allowedOrigins).toEqual([
        "http://localhost:3000",
        "http://localhost:8080",
        "null",
      ]);
    });

    it("should use provided environment variables", () => {
      process.env.PORT = "8080";
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS = "https://example.com,https://test.com";
      process.env.GEMINI_MODEL = "gemini-2.0-flash-lite";

      const { config } = require("../../../config/environment");

      expect(config.port).toBe(8080);
      expect(config.nodeEnv).toBe("production");
      expect(config.geminiModel).toBe("gemini-2.5-flash");
      expect(config.cors.allowedOrigins).toEqual([
        "https://example.com",
        "https://test.com",
      ]);
    });

    it("should keep supported gemini models unchanged", () => {
      process.env.GEMINI_MODEL = "gemini-2.5-flash-lite";

      const { config } = require("../../../config/environment");

      expect(config.geminiModel).toBe("gemini-2.5-flash-lite");
    });

    it("should read google cloud aliases for project and location", () => {
      delete process.env.GCP_PROJECT_ID;
      delete process.env.GCP_LOCATION;
      process.env.GOOGLE_CLOUD_PROJECT = "google-project";
      process.env.GOOGLE_CLOUD_LOCATION = "europe-west1";

      const { config } = require("../../../config/environment");

      expect(config.gcpProjectId).toBe("google-project");
      expect(config.gcpLocation).toBe("europe-west1");
    });

    it("should parse port as integer", () => {
      process.env.PORT = "9999";

      const { config } = require("../../../config/environment");

      expect(config.port).toBe(9999);
      expect(typeof config.port).toBe("number");
    });

    it("should handle empty ALLOWED_ORIGINS", () => {
      process.env.ALLOWED_ORIGINS = "";

      const { config } = require("../../../config/environment");

      expect(config.cors.allowedOrigins).toEqual([
        "http://localhost:3000",
        "http://localhost:8080",
        "null",
      ]);
    });

    it("should handle single allowed origin", () => {
      process.env.ALLOWED_ORIGINS = "https://single-origin.com";

      const { config } = require("../../../config/environment");

      expect(config.cors.allowedOrigins).toEqual(["https://single-origin.com"]);
    });
  });

  describe("config structure", () => {
    it("should have correct structure", () => {
      const { config } = require("../../../config/environment");

      expect(config).toHaveProperty("port");
      expect(config).toHaveProperty("nodeEnv");
      expect(config).toHaveProperty("gcpProjectId");
      expect(config).toHaveProperty("gcpLocation");
      expect(config).toHaveProperty("geminiModel");
      expect(config).toHaveProperty("cors");

      expect(config.cors).toHaveProperty("allowedOrigins");

      expect(typeof config.port).toBe("number");
      expect(typeof config.nodeEnv).toBe("string");
      expect(typeof config.gcpProjectId).toBe("string");
      expect(typeof config.gcpLocation).toBe("string");
      expect(Array.isArray(config.cors.allowedOrigins)).toBe(true);
    });
  });
});
