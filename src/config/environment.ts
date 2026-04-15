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

function validateConfig(): Config {
  return {
    port: Number.parseInt(process.env.PORT || "3000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    gcpProjectId: process.env.GCP_PROJECT_ID || "",
    gcpLocation: process.env.GCP_LOCATION || "europe-west1",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash-lite",
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["http://localhost:3000", "http://localhost:8080", "null"],
    },
  };
}

export const config = validateConfig();
