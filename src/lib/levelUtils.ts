export interface RoleLevel {
  _id: string;
  roleId: string;
  key: string;
  label: string;
  description?: string;
  orderIndex: number;
}

// Fixed IC levels (5 levels)
export const IC_LEVELS: RoleLevel[] = [
  { _id: "", roleId: "", key: "p1_entry", label: "P1 Entry", description: "Early Career", orderIndex: 0 },
  { _id: "", roleId: "", key: "p2_developing", label: "P2 Developing", description: "Emerging Talent", orderIndex: 1 },
  { _id: "", roleId: "", key: "p3_career", label: "P3 Career", description: "Fully Competent", orderIndex: 2 },
  { _id: "", roleId: "", key: "p4_advanced", label: "P4 Advanced", description: "Senior/Lead", orderIndex: 3 },
  { _id: "", roleId: "", key: "p5_principal", label: "P5 Principal", description: "Expert/Authority", orderIndex: 4 },
];

// Fixed Management levels (4 levels)
export const MANAGEMENT_LEVELS: RoleLevel[] = [
  { _id: "", roleId: "", key: "m1_team_lead", label: "M1 Team Lead", description: "Tactical Supervision", orderIndex: 0 },
  { _id: "", roleId: "", key: "m2_manager", label: "M2 Manager", description: "Operational Management", orderIndex: 1 },
  { _id: "", roleId: "", key: "m3_director", label: "M3 Director", description: "Strategic Management", orderIndex: 2 },
  { _id: "", roleId: "", key: "m4_senior_director", label: "M4 Senior Director", description: "Organizational Leadership", orderIndex: 3 },
];

// Backwards-compat alias
export const FALLBACK_LEVELS = IC_LEVELS;

// Get levels for a given role type
export function getLevelsForRoleType(type: "ic" | "management"): RoleLevel[] {
  return type === "management" ? MANAGEMENT_LEVELS : IC_LEVELS;
}

// Migration mapping: old keys → new IC keys
export const OLD_TO_NEW_KEY_MAP: Record<string, string> = {
  associate: "p1_entry",
  intermediate: "p2_developing",
  senior: "p3_career",
  lead: "p4_advanced",
  principal: "p5_principal",
};

// Reverse mapping: new IC keys → old keys
export const NEW_TO_OLD_KEY_MAP: Record<string, string> = {
  p1_entry: "associate",
  p2_developing: "intermediate",
  p3_career: "senior",
  p4_advanced: "lead",
  p5_principal: "principal",
};

// --- Core navigation ---

export function getLevelKeys(levels: RoleLevel[]): string[] {
  return levels.map((l) => l.key);
}

export function getLevelLabels(levels: RoleLevel[]): string[] {
  return levels.map((l) => l.label);
}

export function getLevelOptions(levels: RoleLevel[]): Array<{ key: string; label: string }> {
  return levels.map((l) => ({ key: l.key, label: l.label }));
}

export function getLevelBelow(levels: RoleLevel[], currentKey: string): string | null {
  const keys = getLevelKeys(levels);
  const index = keys.indexOf(currentKey);
  return index > 0 ? keys[index - 1] : null;
}

export function getLevelAbove(levels: RoleLevel[], currentKey: string): string | null {
  const keys = getLevelKeys(levels);
  const index = keys.indexOf(currentKey);
  return index >= 0 && index < keys.length - 1 ? keys[index + 1] : null;
}

export function getLevelNBelow(levels: RoleLevel[], currentKey: string, n: number): string | null {
  const keys = getLevelKeys(levels);
  const index = keys.indexOf(currentKey);
  if (index < 0) return null;
  const targetIndex = index - n;
  if (targetIndex >= 0) return keys[targetIndex];
  if (index > 0) return keys[0];
  return null;
}

export function getLevelNAbove(levels: RoleLevel[], currentKey: string, n: number): string | null {
  const keys = getLevelKeys(levels);
  const index = keys.indexOf(currentKey);
  if (index < 0) return null;
  const targetIndex = index + n;
  if (targetIndex < keys.length) return keys[targetIndex];
  if (index < keys.length - 1) return keys[keys.length - 1];
  return null;
}

// --- Criteria access ---

/** Read criteria from levelCriteria record, falling back to legacy columns */
export function getCriteriaForLevel(
  levelCriteria: Record<string, string[]> | null | undefined,
  levelKey: string
): string[] {
  if (levelCriteria && levelCriteria[levelKey]) {
    return levelCriteria[levelKey];
  }
  return [];
}

/** Read criteria with fallback to legacy sub-competency columns */
export function getCriteriaForLevelWithFallback(
  sub: {
    levelCriteria?: Record<string, string[]> | null;
    associateLevel?: string[] | null;
    intermediateLevel?: string[] | null;
    seniorLevel?: string[] | null;
    leadLevel?: string[] | null;
    principalLevel?: string[] | null;
  },
  levelKey: string
): string[] {
  // 1. Direct match in levelCriteria
  if (sub.levelCriteria && sub.levelCriteria[levelKey]) {
    return sub.levelCriteria[levelKey];
  }

  // 2. Try mapped key (new→old or old→new) in levelCriteria
  const mappedKey = NEW_TO_OLD_KEY_MAP[levelKey] || OLD_TO_NEW_KEY_MAP[levelKey];
  if (mappedKey && sub.levelCriteria && sub.levelCriteria[mappedKey]) {
    return sub.levelCriteria[mappedKey];
  }

  // 3. Fallback to legacy columns with direct key
  const legacyMap: Record<string, string> = {
    associate: "associateLevel",
    intermediate: "intermediateLevel",
    senior: "seniorLevel",
    lead: "leadLevel",
    principal: "principalLevel",
  };
  const col = legacyMap[levelKey];
  if (col) {
    const val = (sub as any)[col];
    if (Array.isArray(val)) return val;
  }

  // 4. Fallback to legacy columns with reverse-mapped key
  if (mappedKey) {
    const mappedCol = legacyMap[mappedKey];
    if (mappedCol) {
      const val = (sub as any)[mappedCol];
      if (Array.isArray(val)) return val;
    }
  }

  return [];
}

// --- Scoring ---

/** (orderIndex + 1) * 2 — produces: Associate(0)=2, Intermediate(1)=4, Senior(2)=6, Lead(3)=8, Principal(4)=10 */
export function getLevelBaseScore(levels: RoleLevel[], levelKey: string): number {
  const level = levels.find((l) => l.key === levelKey);
  if (!level) return 4; // default to intermediate equivalent
  return (level.orderIndex + 1) * 2;
}

export function buildLevelBaseScores(levels: RoleLevel[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const level of levels) {
    scores[level.key] = (level.orderIndex + 1) * 2;
  }
  return scores;
}

export function getMaxChartScale(levels: RoleLevel[], memberLevelKeys: string[]): number {
  const baseScores = buildLevelBaseScores(levels);
  let maxBase = 2; // minimum
  for (const key of memberLevelKeys) {
    const score = baseScores[key.toLowerCase()] || 4;
    if (score > maxBase) maxBase = score;
  }
  return maxBase + 4; // +4 for well_above headroom
}

// --- Label/key conversion ---

export function labelToKey(levels: RoleLevel[], label: string): string {
  const level = levels.find((l) => l.label.toLowerCase() === label.toLowerCase());
  return level ? level.key : label.toLowerCase();
}

export function keyToLabel(levels: RoleLevel[], key: string): string {
  const level = levels.find((l) => l.key === key);
  return level ? level.label : key.charAt(0).toUpperCase() + key.slice(1);
}
