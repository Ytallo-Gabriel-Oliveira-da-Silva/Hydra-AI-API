import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

export type AgentMemoryEntry = {
  id: string;
  kind: "preference" | "ops" | "fact";
  title: string;
  summary: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
};

type PersonalizationState = {
  tone?: string;
  traits?: string[];
  instructions?: string;
  nickname?: string;
  occupation?: string;
  about?: string;
  memorySaved?: boolean;
  memoryHistory?: boolean;
  webSearch?: boolean;
};

type StoredSettings = {
  settingsState?: {
    personalization?: PersonalizationState;
  };
  agentMemory?: {
    entries?: AgentMemoryEntry[];
  };
};

export type UserAgentContext = {
  personalization: PersonalizationState;
  memories: AgentMemoryEntry[];
};

function parseSettings(payload: string | null | undefined): StoredSettings {
  if (!payload) return {};

  try {
    const parsed = JSON.parse(payload) as StoredSettings;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeMemory(entry: AgentMemoryEntry): AgentMemoryEntry {
  return {
    ...entry,
    keywords: Array.from(new Set(entry.keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean))).slice(0, 12),
    title: entry.title.trim().slice(0, 120),
    summary: entry.summary.trim().slice(0, 400),
  };
}

function tokenize(text: string) {
  return Array.from(new Set(text.toLowerCase().match(/[a-z0-9à-ÿ-]{3,}/gi) || []));
}

export async function getUserAgentContext(userId: string): Promise<UserAgentContext> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const parsed = parseSettings(settings?.payload);

  return {
    personalization: parsed.settingsState?.personalization || {},
    memories: (parsed.agentMemory?.entries || []).filter((entry) => entry?.summary).slice(-20),
  };
}

export function findRelevantMemories(memories: AgentMemoryEntry[], query: string, limit = 4) {
  const queryTokens = tokenize(query);

  return memories
    .map((entry) => {
      const haystack = `${entry.title} ${entry.summary} ${entry.keywords.join(" ")}`.toLowerCase();
      const score = queryTokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.entry);
}

export async function saveAgentMemory(userId: string, entry: Omit<AgentMemoryEntry, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const parsed = parseSettings(settings?.payload);
  const currentEntries = parsed.agentMemory?.entries || [];
  const normalized = normalizeMemory({
    ...entry,
    id: nanoid(10),
    createdAt: now,
    updatedAt: now,
  });

  const duplicateIndex = currentEntries.findIndex((current) => current.title.toLowerCase() === normalized.title.toLowerCase());
  const nextEntries = [...currentEntries];

  if (duplicateIndex >= 0) {
    nextEntries[duplicateIndex] = {
      ...nextEntries[duplicateIndex],
      ...normalized,
      id: nextEntries[duplicateIndex].id,
      createdAt: nextEntries[duplicateIndex].createdAt,
      updatedAt: now,
    };
  } else {
    nextEntries.push(normalized);
  }

  const nextPayload: StoredSettings = {
    ...parsed,
    agentMemory: {
      entries: nextEntries.slice(-30),
    },
  };

  await prisma.userSettings.upsert({
    where: { userId },
    update: { payload: JSON.stringify(nextPayload) },
    create: { userId, payload: JSON.stringify(nextPayload) },
  });
}

export function buildOpsMemoryEntry(issue: string, resolution: string) {
  const keywords = tokenize(`${issue} ${resolution}`);
  return {
    kind: "ops" as const,
    title: issue.slice(0, 120),
    summary: resolution.slice(0, 400),
    keywords,
  };
}