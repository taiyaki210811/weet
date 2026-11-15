export type UserProfile = {
  id: string;
  email: string;
  is_pro: boolean;
  daily_calls_count: number;
  last_call_date: string;
  is_banned: boolean;
};

export const PLAN_LIMITS = {
  free: {
    name: "Free",
    dailyCalls: 25,
    maxSeconds: 150, // 2分30秒
    canReunion: false,
    canPrivateRoom: false,
    canVoiceChanger: false,
    canProAvatars: false,
    canAllTopics: false,
  },
  pro: {
    name: "PRO",
    dailyCalls: 120,
    maxSeconds: 600, // 10分
    canReunion: true,
    canPrivateRoom: true,
    canVoiceChanger: true,
    canProAvatars: true,
    canAllTopics: true,
  },
} as const;

export function getTodayJST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}