import { prisma } from "./db";

const baseBanned = [
  "terrorismo",
  "explosivo",
  "pornografia infantil",
  "racismo",
  "assassinato",
  "armas biológicas",
  "ódio",
];

const countrySpecific: Record<string, string[]> = {
  US: ["opioid", "gun blueprint"],
  BR: ["falsificar documento", "tráfico"],
  EU: ["gdpr violation"],
};

export type RuleCheck = {
  allowed: boolean;
  reasons: string[];
};

export function evaluateContent(text: string, countryCode?: string | null): RuleCheck {
  const lower = text.toLowerCase();
  const reasons: string[] = [];

  for (const term of baseBanned) {
    if (lower.includes(term)) reasons.push(`Conteúdo proibido: ${term}`);
  }

  if (countryCode) {
    const extra = countrySpecific[countryCode] || countrySpecific[countryCode.slice(0, 2)];
    if (extra) {
      for (const term of extra) {
        if (lower.includes(term)) reasons.push(`Restrição regional (${countryCode}): ${term}`);
      }
    }
  }

  return { allowed: reasons.length === 0, reasons };
}

export async function registerViolation(userId: string, reasons: string[]) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { violationCount: { increment: 1 } },
  });

  if (user.violationCount + reasons.length >= 3) {
    await prisma.user.update({ where: { id: userId }, data: { blacklisted: true } });
    return { blacklisted: true };
  }

  return { blacklisted: false };
}
