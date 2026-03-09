import { prisma } from "./db";
import { defaultPlanLimits, getPlanSlug } from "./plan";

export type UsageKind = "chat" | "image" | "audio" | "video";

export async function ensureUsage(userId: string, monthKey: string) {
  return prisma.quotaUsage.upsert({
    where: { userId_month: { userId, month: monthKey } },
    update: {},
    create: { userId, month: monthKey },
  });
}

export function currentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

type MinimalUser = { id: string; plan?: { slug: string }; slug?: string };

export async function canUse(user: MinimalUser, kind: UsageKind, monthKey: string) {
  const planSlug = getPlanSlug(user);
  const limits = defaultPlanLimits[planSlug] ?? defaultPlanLimits.free;
  const usage = await ensureUsage(user.id, monthKey);

  const map = {
    chat: { used: usage.chatCount, limit: limits.chatLimit },
    image: { used: usage.imageCount, limit: limits.imageLimit },
    audio: { used: usage.audioCount, limit: limits.audioLimit },
    video: { used: usage.videoCount, limit: limits.videoLimit },
  } as const;

  const { used, limit } = map[kind];
  if (limit === null) return { allowed: true, used, limit };
  return { allowed: used < limit, used, limit };
}

export async function incrementUsage(userId: string, kind: UsageKind, monthKey: string) {
  const data = {
    chat: { chatCount: { increment: 1 } },
    image: { imageCount: { increment: 1 } },
    audio: { audioCount: { increment: 1 } },
    video: { videoCount: { increment: 1 } },
  } as const;

  await prisma.quotaUsage.update({
    where: { userId_month: { userId, month: monthKey } },
    data: data[kind],
  });
}
