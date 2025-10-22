import request from "supertest";
import { createApp, startServer } from "../../../server";
import { config } from "../../../config/environment";
import { logger } from "../../../utils/logger";

const mockLogger = logger as jest.Mocked<typeof logger>;

jest.mock("../../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../../config/environment", () => ({
  config: {
    nodeEnv: "development",
    port: 3000,
  },
}));

describe("Server Functions", () => {
  let originalProcessExit: typeof process.exit;
  let originalProcessOn: typeof process.on;

  beforeEach(() => {
    originalProcessExit = process.exit;
    process.exit = jest.fn() as any;

    originalProcessOn = process.on;
    process.on = jest.fn() as any;

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.exit = originalProcessExit;
    process.on = originalProcessOn;
  });

  describe("createApp", () => {
    it("should create express app with correct configuration", () => {
      const app = createApp();

      expect(app).toBeDefined();
      expect(app.get).toBeDefined();
      expect(app.disable).toBeDefined();
      expect(app.get("x-powered-by")).toBe(false);
    });

    it("should register health endpoint", async () => {
      const app = createApp();

      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("environment", config.nodeEnv);
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe("startServer", () => {
    it("should start server and register signal handlers", () => {
      const mockApp = {
        listen: jest.fn((port, callback) => {
          if (callback) callback();
          return { close: jest.fn() };
        }),
      } as any;

      const server = startServer(mockApp);

      expect(mockApp.listen).toHaveBeenCalledWith(
        config.port,
        expect.any(Function),
      );
      expect(process.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
      expect(process.on).toHaveBeenCalledWith("SIGINT", expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Server started on port ${config.port}`,
        {
          environment: config.nodeEnv,
          port: config.port,
        },
      );
    });

    it("should handle SIGTERM signal", () => {
      const mockServer = {
        close: jest.fn((callback) => {
          if (callback) callback();
        }),
      };

      const mockApp = {
        listen: jest.fn(() => mockServer),
      } as any;

      startServer(mockApp);

      const sigtermHandler = (process.on as jest.Mock).mock.calls.find(
        (call) => call[0] === "SIGTERM",
      )?.[1];

      expect(sigtermHandler).toBeDefined();

      if (sigtermHandler) {
        sigtermHandler();
        expect(mockLogger.info).toHaveBeenCalledWith(
          "SIGTERM received, shutting down gracefully",
        );
        expect(mockServer.close).toHaveBeenCalled();
      }
    });

    it("should handle SIGINT signal", () => {
      const mockServer = {
        close: jest.fn((callback) => {
          if (callback) callback();
        }),
      };

      const mockApp = {
        listen: jest.fn(() => mockServer),
      } as any;

      startServer(mockApp);

      const sigintHandler = (process.on as jest.Mock).mock.calls.find(
        (call) => call[0] === "SIGINT",
      )?.[1];

      expect(sigintHandler).toBeDefined();

      if (sigintHandler) {
        sigintHandler();
        expect(mockLogger.info).toHaveBeenCalledWith(
          "SIGINT received, shutting down gracefully",
        );
        expect(mockServer.close).toHaveBeenCalled();
      }
    });

    it("should call process.exit after server close", () => {
      const mockServer = {
        close: jest.fn((callback) => {
          if (callback) callback();
        }),
      };

      const mockApp = {
        listen: jest.fn(() => mockServer),
      } as any;

      startServer(mockApp);

      const sigtermHandler = (process.on as jest.Mock).mock.calls.find(
        (call) => call[0] === "SIGTERM",
      )?.[1];

      expect(sigtermHandler).toBeDefined();

      if (sigtermHandler) {
        sigtermHandler();
        expect(mockLogger.info).toHaveBeenCalledWith("Server closed");
        expect(process.exit).toHaveBeenCalledWith(0);
      }
    });
  });
});
