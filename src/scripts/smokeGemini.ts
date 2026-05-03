import "dotenv/config";
import { config } from "../config/environment";
import { getAchievementAdvice } from "../services/achievementAdvice";

async function main() {
  if (!config.gcpProjectId) {
    throw new Error(
      "Missing Google Cloud project. Set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT.",
    );
  }

  const prompt =
    "Create a short Twitch achievement for a viewer who sends 10 messages.";

  const result = await getAchievementAdvice(
    config.gcpProjectId,
    config.gcpLocation,
    config.geminiModel,
    prompt,
    ["countMessage"],
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        project: config.gcpProjectId,
        location: config.gcpLocation,
        model: config.geminiModel,
        title: result.title,
        triggerLabel: result.type.label,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
