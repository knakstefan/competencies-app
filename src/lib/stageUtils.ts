interface StageInfo {
  _id: string;
  title: string;
  stageType: string;
  orderIndex: number;
}

// Legacy string key → label mapping for backward compat
const LEGACY_STAGE_LABELS: Record<string, string> = {
  manager_interview: "Manager Interview",
  portfolio_review: "Portfolio Review",
  team_interview: "Team Interview",
  hired: "Hired",
  rejected: "Rejected",
};

/**
 * Returns true for terminal states (hired/rejected).
 */
export function isTerminalStage(stage: string): boolean {
  return stage === "hired" || stage === "rejected";
}

/**
 * Resolves a currentStage value (which can be a stage _id or a legacy string key)
 * to a human-readable label.
 */
export function getStageLabel(currentStage: string, stages: StageInfo[]): string {
  // Terminal states
  if (currentStage === "hired") return "Hired";
  if (currentStage === "rejected") return "Rejected";

  // Try matching by DB stage ID
  const dbStage = stages.find((s) => s._id === currentStage);
  if (dbStage) return dbStage.title;

  // Legacy fallback
  return LEGACY_STAGE_LABELS[currentStage] || currentStage.replace(/_/g, " ");
}

/**
 * Resolves a currentStage value to full stage info.
 * Returns null for terminal stages or unresolvable values.
 */
export function resolveStage(
  currentStage: string,
  stages: StageInfo[]
): StageInfo | null {
  if (isTerminalStage(currentStage)) return null;

  // Try matching by DB stage ID
  const dbStage = stages.find((s) => s._id === currentStage);
  if (dbStage) return dbStage;

  // Legacy fallback — try matching by legacy key to stage title
  const legacyLabel = LEGACY_STAGE_LABELS[currentStage];
  if (legacyLabel) {
    return stages.find((s) => s.title === legacyLabel) || null;
  }

  return null;
}

/**
 * Finds the index of the current stage in the ordered stages array.
 * Returns -1 if not found (terminal or unresolvable).
 */
export function getStageIndex(currentStage: string, stages: StageInfo[]): number {
  const stage = resolveStage(currentStage, stages);
  if (!stage) return -1;
  return stages.findIndex((s) => s._id === stage._id);
}
