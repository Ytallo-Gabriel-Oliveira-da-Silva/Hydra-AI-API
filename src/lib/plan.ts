export type Limits = {
  chatLimit: number | null;
  imageLimit: number | null;
  audioLimit: number | null;
  videoLimit: number | null;
};

export const defaultPlanLimits: Record<string, Limits> = {
  free: { chatLimit: null, imageLimit: 100, audioLimit: 50, videoLimit: 50 },
  plus: { chatLimit: null, imageLimit: null, audioLimit: 100, videoLimit: 40 },
  pro: { chatLimit: null, imageLimit: null, audioLimit: null, videoLimit: null },
  annual: { chatLimit: null, imageLimit: null, audioLimit: null, videoLimit: null },
};

export function getPlanSlug(plan: { slug?: string; plan?: { slug?: string } }): string {
  if (plan.slug) return plan.slug;
  if (plan.plan?.slug) return plan.plan.slug;
  return "free";
}

export function planBadgeColors(planSlug: string) {
  switch (planSlug) {
    case "free":
      return { from: "#6b4a2a", to: "#8b5a2b" };
    case "plus":
      return { from: "#c0c0c0", to: "#9ea1a7" };
    case "pro":
      return { from: "#d7d9e0", to: "#f5f7ff" };
    case "annual":
      return { from: "#f5c542", to: "#f8e38a" };
    default:
      return { from: "#6b4a2a", to: "#8b5a2b" };
  }
}
