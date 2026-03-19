export const SUPPORTED_TRIGGER_LABELS = [
  "message",
  "message_content",
  "channel_point_cost",
  "redeem_channel_point",
  "api_caller",
] as const;

export type TriggerLabel = (typeof SUPPORTED_TRIGGER_LABELS)[number];

export interface AchievementSuggestionRequest {
  prompt: string;
  supportedTriggerLabels?: TriggerLabel[];
}

export interface AchievementSuggestionResponse {
  title: string;
  description: string;
  goal: number;
  reward: number;
  secret: boolean;
  public: boolean;
  active: boolean;
  type: {
    label: TriggerLabel;
    data: string | number | null;
  };
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function isSupportedTriggerLabel(value: unknown): value is TriggerLabel {
  return (
    typeof value === "string" &&
    (SUPPORTED_TRIGGER_LABELS as readonly string[]).includes(value)
  );
}
