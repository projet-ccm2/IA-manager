export interface AchievementAdviceRequest {
  channelName: string;
  prompt: string;
}

export interface AchievementAdviceResponse {
  title: string;
  description: string;
  goal: number;
  reward: number;
  label: string;
}
