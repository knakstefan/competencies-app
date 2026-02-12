import { Competency, SubCompetency } from "@/types/competency";

export interface CompetencyExportData {
  competencies: Array<{
    title: string;
    description?: string | null;
    subCompetencies: Array<{
      title: string;
      associate_level: string[];
      intermediate_level: string[];
      senior_level: string[];
      lead_level: string[];
      principal_level: string[];
    }>;
  }>;
}

const LEVELS = ["associate", "intermediate", "senior", "lead", "principal"] as const;
const LEVEL_LABELS: Record<string, string> = {
  associate: "Associate",
  intermediate: "Intermediate",
  senior: "Senior",
  lead: "Lead",
  principal: "Principal",
};

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
            associate_level: sub.associateLevel || [],
            intermediate_level: sub.intermediateLevel || [],
            senior_level: sub.seniorLevel || [],
            lead_level: sub.leadLevel || [],
            principal_level: sub.principalLevel || [],
          })),
      })),
  };
  return JSON.stringify(data, null, 2);
}

export function exportToMarkdown(
  competencies: Competency[],
  subCompetencies: SubCompetency[]
): string {
  const lines: string[] = [];

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

        LEVELS.forEach((level) => {
          const levelKeyMap: Record<string, keyof SubCompetency> = {
            associate: "associateLevel",
            intermediate: "intermediateLevel",
            senior: "seniorLevel",
            lead: "leadLevel",
            principal: "principalLevel",
          };
          const levelKey = levelKeyMap[level];
          const criteria = (sub[levelKey] as string[]) || [];
          
          if (criteria.length > 0) {
            lines.push(`### ${LEVEL_LABELS[level]}`);
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

  return parsed as CompetencyExportData;
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
        associate_level: [],
        intermediate_level: [],
        senior_level: [],
        lead_level: [],
        principal_level: [],
      };
      currentLevel = null;
      continue;
    }

    // Match ### Level
    const h3Match = trimmedLine.match(/^###\s+(.+)$/);
    if (h3Match && currentSubCompetency) {
      collectingDescription = false;
      const levelName = h3Match[1].toLowerCase().trim();
      
      if (levelName.includes("associate")) currentLevel = "associate";
      else if (levelName.includes("intermediate")) currentLevel = "intermediate";
      else if (levelName.includes("senior")) currentLevel = "senior";
      else if (levelName.includes("lead")) currentLevel = "lead";
      else if (levelName.includes("principal")) currentLevel = "principal";
      else currentLevel = null;
      
      continue;
    }

    // Match bullet points
    const bulletMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (bulletMatch && currentSubCompetency && currentLevel) {
      const levelKey = `${currentLevel}_level` as keyof typeof currentSubCompetency;
      (currentSubCompetency[levelKey] as string[]).push(bulletMatch[1].trim());
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
