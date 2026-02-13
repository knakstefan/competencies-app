import { Competency, SubCompetency } from "@/types/competency";
import { RoleLevel, FALLBACK_LEVELS, IC_LEVELS, MANAGEMENT_LEVELS, getCriteriaForLevelWithFallback, getLevelOptions } from "@/lib/levelUtils";

export interface CompetencyExportData {
  competencies: Array<{
    title: string;
    description?: string | null;
    subCompetencies: Array<{
      title: string;
      level_criteria: Record<string, string[]>;
    }>;
  }>;
}

export function exportToJSON(
  competencies: Competency[],
  subCompetencies: SubCompetency[]
): string {
  const data: CompetencyExportData = {
    competencies: competencies
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((comp) => ({
        title: comp.title,
        description: comp.description,
        subCompetencies: subCompetencies
          .filter((sub) => sub.competencyId === comp._id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((sub) => ({
            title: sub.title,
            level_criteria: sub.levelCriteria || {},
          })),
      })),
  };
  return JSON.stringify(data, null, 2);
}

export function exportToMarkdown(
  competencies: Competency[],
  subCompetencies: SubCompetency[],
  levels?: RoleLevel[]
): string {
  const lines: string[] = [];
  const levelOptions = getLevelOptions(levels || FALLBACK_LEVELS);

  competencies
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .forEach((comp, compIndex) => {
      lines.push(`# ${compIndex + 1}. ${comp.title}`);
      if (comp.description) {
        lines.push("");
        lines.push(comp.description);
      }
      lines.push("");

      const subs = subCompetencies
        .filter((sub) => sub.competencyId === comp._id)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      subs.forEach((sub, subIndex) => {
        lines.push(`## ${compIndex + 1}.${subIndex + 1} ${sub.title}`);
        lines.push("");

        levelOptions.forEach(({ key, label }) => {
          const criteria = getCriteriaForLevelWithFallback(sub, key);

          if (criteria.length > 0) {
            lines.push(`### ${label}`);
            criteria.forEach((c) => {
              lines.push(`- ${c}`);
            });
            lines.push("");
          }
        });
      });
    });

  return lines.join("\n").trim();
}

export function detectFormat(content: string): "json" | "markdown" {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }
  return "markdown";
}

export function parseJSON(content: string): CompetencyExportData {
  const parsed = JSON.parse(content);

  if (!parsed.competencies || !Array.isArray(parsed.competencies)) {
    throw new Error("Invalid JSON format: missing 'competencies' array");
  }

  // Normalize: accept both level_criteria and legacy 5-field format
  parsed.competencies.forEach((comp: any) => {
    if (comp.subCompetencies) {
      comp.subCompetencies.forEach((sub: any) => {
        if (!sub.level_criteria || typeof sub.level_criteria !== "object") {
          // Build level_criteria from legacy fields if present
          const lc: Record<string, string[]> = {};
          if (sub.associate_level?.length) lc.associate = sub.associate_level;
          if (sub.intermediate_level?.length) lc.intermediate = sub.intermediate_level;
          if (sub.senior_level?.length) lc.senior = sub.senior_level;
          if (sub.lead_level?.length) lc.lead = sub.lead_level;
          if (sub.principal_level?.length) lc.principal = sub.principal_level;
          sub.level_criteria = lc;
        }
      });
    }
  });

  return parsed as CompetencyExportData;
}

/** Build a lookup from all recognized level names/shortcuts to their keys */
function buildLevelLookup(): Map<string, string> {
  const map = new Map<string, string>();
  const allLevels = [...IC_LEVELS, ...MANAGEMENT_LEVELS];

  for (const level of allLevels) {
    // Exact label match: "P1 Entry" → "p1_entry"
    map.set(level.label.toLowerCase(), level.key);
    // Exact key match: "p1_entry" → "p1_entry"
    map.set(level.key, level.key);
    // Short code: "p1" → "p1_entry", "m1" → "m1_team_lead"
    const shortCode = level.key.split("_")[0];
    if (!map.has(shortCode)) {
      map.set(shortCode, level.key);
    }
  }

  // Legacy names for old-format markdown
  const legacyMap: Record<string, string> = {
    associate: "p1_entry",
    intermediate: "p2_developing",
    senior: "p3_career",
    lead: "p4_advanced",
    principal: "p5_principal",
  };
  for (const [name, key] of Object.entries(legacyMap)) {
    map.set(name, key);
  }

  return map;
}

const LEVEL_LOOKUP = buildLevelLookup();

function resolveMarkdownLevelKey(headerText: string): string {
  const lower = headerText.toLowerCase().trim();

  // Try exact match first
  if (LEVEL_LOOKUP.has(lower)) return LEVEL_LOOKUP.get(lower)!;

  // Try partial match (e.g., "Associate Designer" still matches "associate")
  for (const [name, key] of LEVEL_LOOKUP.entries()) {
    if (lower.includes(name) || name.includes(lower)) return key;
  }

  // Fallback: convert to snake_case
  return lower.replace(/\s+/g, "_");
}

export function parseMarkdown(content: string): CompetencyExportData {
  const lines = content.split("\n");
  const competencies: CompetencyExportData["competencies"] = [];

  let currentCompetency: CompetencyExportData["competencies"][0] | null = null;
  let currentSubCompetency: CompetencyExportData["competencies"][0]["subCompetencies"][0] | null = null;
  let currentLevel: string | null = null;
  let collectingDescription = false;
  let descriptionLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Match # 1. Title or # Title
    const h1Match = trimmedLine.match(/^#\s+(?:\d+\.\s*)?(.+)$/);
    if (h1Match) {
      // Save previous competency
      if (currentCompetency) {
        if (currentSubCompetency) {
          currentCompetency.subCompetencies.push(currentSubCompetency);
        }
        if (descriptionLines.length > 0) {
          currentCompetency.description = descriptionLines.join("\n").trim();
        }
        competencies.push(currentCompetency);
      }

      currentCompetency = {
        title: h1Match[1].trim(),
        description: null,
        subCompetencies: [],
      };
      currentSubCompetency = null;
      currentLevel = null;
      collectingDescription = true;
      descriptionLines = [];
      continue;
    }

    // Match ## 1.1 Title or ## Title
    const h2Match = trimmedLine.match(/^##\s+(?:\d+\.\d+\s*)?(.+)$/);
    if (h2Match && currentCompetency) {
      // Save description if we were collecting it
      if (collectingDescription && descriptionLines.length > 0) {
        currentCompetency.description = descriptionLines.join("\n").trim();
      }
      collectingDescription = false;

      // Save previous sub-competency
      if (currentSubCompetency) {
        currentCompetency.subCompetencies.push(currentSubCompetency);
      }

      currentSubCompetency = {
        title: h2Match[1].trim(),
        level_criteria: {},
      };
      currentLevel = null;
      continue;
    }

    // Match ### Level
    const h3Match = trimmedLine.match(/^###\s+(.+)$/);
    if (h3Match && currentSubCompetency) {
      collectingDescription = false;
      const levelName = h3Match[1].trim();
      currentLevel = resolveMarkdownLevelKey(levelName);

      if (currentLevel && !currentSubCompetency.level_criteria[currentLevel]) {
        currentSubCompetency.level_criteria[currentLevel] = [];
      }

      continue;
    }

    // Match bullet points
    const bulletMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (bulletMatch && currentSubCompetency && currentLevel) {
      if (!currentSubCompetency.level_criteria[currentLevel]) {
        currentSubCompetency.level_criteria[currentLevel] = [];
      }
      currentSubCompetency.level_criteria[currentLevel].push(bulletMatch[1].trim());
      continue;
    }

    // Collect description lines (non-empty lines after h1 before h2)
    if (collectingDescription && trimmedLine && !trimmedLine.startsWith("#")) {
      descriptionLines.push(trimmedLine);
    }
  }

  // Don't forget the last items
  if (currentCompetency) {
    if (currentSubCompetency) {
      currentCompetency.subCompetencies.push(currentSubCompetency);
    }
    if (collectingDescription && descriptionLines.length > 0) {
      currentCompetency.description = descriptionLines.join("\n").trim();
    }
    competencies.push(currentCompetency);
  }

  if (competencies.length === 0) {
    throw new Error("No competencies found in the markdown content");
  }

  return { competencies };
}

export function parseContent(content: string): CompetencyExportData {
  const format = detectFormat(content);

  if (format === "json") {
    return parseJSON(content);
  }
  return parseMarkdown(content);
}
