import { config } from "./config/environment";
import { createApp, startServer } from "./server";

const app = createApp();

if (config.nodeEnv !== "test") {
  startServer(app);
}

export default app;
