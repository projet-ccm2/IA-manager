interface Config {
  port: number;
  nodeEnv: string;
  gcpProjectId: string;
  gcpLocation: string;
  geminiModel: string;
  cors: {
    allowedOrigins: string[];
  };
}

function resolveGeminiModel(rawModel: string | undefined): string {
  const model = rawModel || "gemini-2.5-flash";

  if (
    model === "gemini-2.0-flash-001" ||
    model === "gemini-2.0-flash-lite-001" ||
    model === "gemini-2.0-flash" ||
    model === "gemini-2.0-flash-lite"
  ) {
    return "gemini-2.5-flash";
  }

  return model;
}

function readProjectId(): string {
  return process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "";
}

function readLocation(): string {
  return (
    process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "global"
  );
}

function validateConfig(): Config {
  return {
    port: Number.parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    gcpProjectId: readProjectId(),
    gcpLocation: readLocation(),
    geminiModel: resolveGeminiModel(process.env.GEMINI_MODEL),
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["http://localhost:3000", "http://localhost:8080", "null"],
    },
  };
}

export const config = validateConfig();
