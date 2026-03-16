"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuthAction } from "./auth.helpers";
import { IC_DEFAULT_LEVELS, MANAGEMENT_DEFAULT_LEVELS } from "./roleLevels";

export const generatePromotionPlan = action({
  args: {
    memberId: v.id("teamMembers"),
    roleId: v.optional(v.id("roles")),
  },
  handler: async (ctx, args): Promise<{ planId: string; planContent: any }> => {
    await requireAuthAction(ctx);
    // Fetch all data server-side
    const member: any = await ctx.runQuery(api.teamMembers.get, {
      id: args.memberId,
    });
    if (!member) throw new Error("Member not found");

    const competencies: any[] = args.roleId
      ? await ctx.runQuery(api.competencies.listByRole, { roleId: args.roleId })
      : await ctx.runQuery(api.competencies.list, {});
    const subCompetencies: any[] = args.roleId
      ? await ctx.runQuery(api.competencies.listSubCompetenciesByRole, { roleId: args.roleId })
      : await ctx.runQuery(api.competencies.listSubCompetencies, {});
    const allAssessments: any[] = await ctx.runQuery(
      api.assessments.getCompletedForMember,
      { memberId: args.memberId }
    );
    const progress: any[] = await ctx.runQuery(api.progress.listForMember, {
      memberId: args.memberId,
    });

    // Fetch all evaluations for this member's progress
    const progressIds = progress.map((p: any) => p._id);
    let evaluations: any[] = [];
    if (progressIds.length > 0) {
      evaluations = await ctx.runQuery(api.evaluations.listForProgressIds, {
        progressIds,
      });
    }

    // Build comprehensive context for AI
    const progressMap = new Map();
    progress.forEach((p: any) => {
      const evals = evaluations.filter((e) => e.progressId === p._id);
      progressMap.set(p.subCompetencyId, { ...p, evaluations: evals });
    });

    // Calculate trending data
    const evalToScore: Record<string, number> = {
      well_above: 5,
      above: 4,
      target: 3,
      below: 2,
      well_below: 1,
    };

    const trendingData: Array<{
      competencyId: string;
      competencyTitle: string;
      trend: string;
      change: number;
      firstScore: number;
      lastScore: number;
    }> = [];

    if (allAssessments && allAssessments.length >= 2) {
      const progressByAssessment = new Map<string, any[]>();
      progress.forEach((p: any) => {
        if (p.assessmentId) {
          if (!progressByAssessment.has(p.assessmentId)) {
            progressByAssessment.set(p.assessmentId, []);
          }
          progressByAssessment.get(p.assessmentId)!.push(p);
        }
      });

      competencies.forEach((comp: any) => {
        const compSubIds = subCompetencies
          .filter((s: any) => s.competencyId === comp._id)
          .map((s: any) => s._id);

        const firstAssessment = allAssessments[0];
        const lastAssessment = allAssessments[allAssessments.length - 1];

        // Calculate score for first assessment
        const firstAssessmentProgress =
          progressByAssessment.get(firstAssessment._id) || [];
        const firstCompProgress = firstAssessmentProgress.filter((p) =>
          compSubIds.includes(p.subCompetencyId)
        );
        const firstCompProgressIds = firstCompProgress.map((p) => p._id);
        const firstEvals = evaluations.filter((e) =>
          firstCompProgressIds.includes(e.progressId)
        );

        let firstAvg = 0;
        if (firstEvals.length > 0) {
          const firstTotal = firstEvals.reduce(
            (sum, e) => sum + (evalToScore[e.evaluation] || 0),
            0
          );
          firstAvg = firstTotal / firstEvals.length;
        }

        // Calculate score for last assessment
        const lastAssessmentProgress =
          progressByAssessment.get(lastAssessment._id) || [];
        const lastCompProgress = lastAssessmentProgress.filter((p) =>
          compSubIds.includes(p.subCompetencyId)
        );
        const lastCompProgressIds = lastCompProgress.map((p) => p._id);
        const lastEvals = evaluations.filter((e) =>
          lastCompProgressIds.includes(e.progressId)
        );

        let lastAvg = 0;
        if (lastEvals.length > 0) {
          const lastTotal = lastEvals.reduce(
            (sum, e) => sum + (evalToScore[e.evaluation] || 0),
            0
          );
          lastAvg = lastTotal / lastEvals.length;
        }

        const change = lastAvg - firstAvg;
        let trend = "stable";
        if (change > 0.3) trend = "improving";
        if (change < -0.3) trend = "declining";

        trendingData.push({
          competencyId: comp._id,
          competencyTitle: comp.title,
          trend,
          change: Math.round(change * 100) / 100,
          firstScore: Math.round(firstAvg * 100) / 100,
          lastScore: Math.round(lastAvg * 100) / 100,
        });
      });
    }

    // Organize data by competency
    const competencyData: any[] = competencies.map((comp: any) => {
      const subs = subCompetencies
        .filter((s: any) => s.competencyId === comp._id)
        .map((sub: any) => {
          const subProgress = progressMap.get(sub._id);
          return {
            title: sub.title,
            code: sub.code,
            currentLevel: subProgress?.currentLevel || "Not assessed",
            evaluations: subProgress?.evaluations || [],
            notes: subProgress?.notes || null,
          };
        });

      const trend = trendingData.find((t) => t.competencyId === comp._id);

      return {
        _id: comp._id,
        title: comp.title,
        code: comp.code,
        subCompetencies: subs,
        trending: trend || null,
      };
    });

    // Derive role levels from role type
    const IC_LEVELS = [
      { key: "p1_entry", label: "P1 Entry" },
      { key: "p2_developing", label: "P2 Developing" },
      { key: "p3_career", label: "P3 Career" },
      { key: "p4_advanced", label: "P4 Advanced" },
      { key: "p5_principal", label: "P5 Principal" },
    ];
    const MANAGEMENT_LEVELS = [
      { key: "m1_team_lead", label: "M1 Team Lead" },
      { key: "m2_manager", label: "M2 Manager" },
      { key: "m3_director", label: "M3 Director" },
      { key: "m4_senior_director", label: "M4 Senior Director" },
    ];
    const OLD_TO_NEW_KEY: Record<string, string> = {
      associate: "p1_entry",
      intermediate: "p2_developing",
      senior: "p3_career",
      lead: "p4_advanced",
      principal: "p5_principal",
    };
    let roleLevels = IC_LEVELS;
    if (args.roleId) {
      const role: any = await ctx.runQuery(api.roles.get, { id: args.roleId });
      if (role?.type === "management") {
        roleLevels = MANAGEMENT_LEVELS;
      }
    }
    const roleLevelKeys = roleLevels.map((l) => l.key);

    // Calculate role progression path
    // member.role is a display label like "P3 Career" — normalize to key format
    let currentLevelKey = member.role.toLowerCase().replace(/\s+/g, "_");
    if (!roleLevelKeys.includes(currentLevelKey)) {
      // Try legacy mapping (e.g., "senior" → "p3_career")
      currentLevelKey = OLD_TO_NEW_KEY[currentLevelKey] || currentLevelKey;
    }
    const currentRoleIndex = roleLevelKeys.indexOf(currentLevelKey);
    const targetIndex =
      currentRoleIndex >= 0 && currentRoleIndex < roleLevelKeys.length - 1
        ? currentRoleIndex + 1
        : currentRoleIndex >= 0
          ? currentRoleIndex
          : -1;
    const targetRole = targetIndex >= 0 ? roleLevels[targetIndex].label : member.role;

    // Build AI prompt
    const systemPrompt = `You are an expert career development advisor for product designers.
Your role is to analyze a team member's competency assessments and create a detailed, actionable promotion plan to help them advance to the next career level.

Focus on:
1. Identifying specific skill gaps based on their assessment data
2. Providing concrete, measurable development goals
3. Suggesting practical learning resources and activities
4. Setting realistic timelines for skill development
5. Highlighting their strengths and how to leverage them

Be specific, actionable, and encouraging. Structure your response as a comprehensive promotion plan.`;

    const userPrompt: string = `Create a concise, structured promotion plan for ${member.name}, currently a ${member.role} designer, to advance to ${targetRole} level.

CURRENT ASSESSMENT DATA:
${JSON.stringify(competencyData, null, 2)}

TRENDING DATA (showing progression across ${allAssessments?.length || 0} assessments):
${JSON.stringify(trendingData, null, 2)}

EVALUATION LEGEND (5-point scale):
- "well_above" (5): Significantly exceeding target level expectations
- "above" (4): Performing above target level expectations
- "target" (3): Meeting target level expectations
- "below" (2): Below target level expectations
- "well_below" (1): Significantly below target level expectations

TRENDING LEGEND:
- "improving": Score increased by more than 0.3 across assessments
- "stable": Score remained relatively stable
- "declining": Score decreased by more than 0.3 across assessments

Create a promotion plan with the following sections. Return ONLY valid JSON matching this exact structure:

{
  "summary": "A comprehensive 4-5 sentence paragraph that: (1) Provides an overview of ${member.name}'s current performance level and key accomplishments, (2) Highlights their strongest competencies with specific examples from the assessment data, (3) Identifies the main areas requiring development for ${targetRole} level, (4) References any notable trends (improving or declining competencies), and (5) Gives an overall readiness assessment with an estimated timeline. Be specific and reference actual competency areas from their assessment.",
  "trendingAnalysis": {
    "hasMultipleAssessments": true,
    "assessmentCount": 2,
    "overallTrend": "improving/stable/declining",
    "competencyTrends": [
      {
        "competency": "Competency name",
        "trend": "improving/stable/declining",
        "change": 0.5,
        "insight": "Brief insight about this trend and what it means for their development"
      }
    ],
    "trendSummary": "2-3 sentences summarizing the overall trajectory and what the trends indicate for promotion readiness"
  },
  "strengths": [
    {
      "title": "Strength name",
      "description": "1-2 sentences explaining this strength and its value"
    }
  ],
  "developmentAreas": [
    {
      "title": "Competency name",
      "gap": "1 sentence explaining the gap",
      "actions": ["Specific action 1", "Specific action 2"],
      "timeline": "3-6 months"
    }
  ],
  "resources": [
    {
      "area": "Development area name",
      "items": [
        { "name": "Resource name", "description": "Brief description", "link": "For books, include Amazon purchase link (https://www.amazon.com/s?k=book-title). For other resources, use the direct URL or omit if not applicable." }
      ]
    }
  ],
  "milestones": [
    {
      "title": "Milestone name",
      "description": "Clear, measurable outcome"
    }
  ],
  "timeline": "2-3 sentences with specific timeframes for ${targetRole} readiness"
}

REQUIREMENTS:
- Include the trendingAnalysis section ONLY if trending data is provided (hasMultipleAssessments should be true if there are 2+ assessments)
- For trendingAnalysis, analyze each competency's trend and provide insights about what the trend means for development
- Include 2-3 strengths
- Include 3-5 development areas (prioritize declining competencies if any)
- Group resources by development area (books, courses, articles, etc.)
- For any books recommended, include an Amazon purchase link in the format: https://www.amazon.com/s?k=book-title-here (URL encode the book title)
- For online courses or articles, include direct URLs when applicable
- Include 3-4 milestones
- Keep all text concise and actionable
- Be professional but encouraging
- Reference trends in the summary when available`;

    // Call Anthropic Claude
    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
      ],
    });

    const planContent = response.content[0]?.type === "text" ? response.content[0].text : null;
    if (!planContent) {
      throw new Error("No text response from Anthropic");
    }

    // Parse the JSON response
    let planStructure;
    try {
      // Handle code fences that Claude may wrap around JSON
      const jsonMatch =
        planContent.match(/```json\s*([\s\S]*?)\s*```/) ||
        planContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : planContent;
      planStructure = JSON.parse(jsonStr);

      // Validate that required fields exist and aren't raw JSON strings
      if (!planStructure.summary || typeof planStructure.summary !== "string") {
        planStructure.summary = "Plan generated successfully. See details below.";
      }
      if (!Array.isArray(planStructure.strengths)) planStructure.strengths = [];
      if (!Array.isArray(planStructure.developmentAreas)) planStructure.developmentAreas = [];
      if (!Array.isArray(planStructure.resources)) planStructure.resources = [];
      if (!Array.isArray(planStructure.milestones)) planStructure.milestones = [];
      if (!planStructure.timeline || typeof planStructure.timeline !== "string") {
        planStructure.timeline = "";
      }
    } catch {
      // Fallback: try to extract any JSON object from the response
      const jsonObjectMatch = planContent.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          planStructure = JSON.parse(jsonObjectMatch[0]);
        } catch {
          planStructure = null;
        }
      }

      if (!planStructure) {
        planStructure = {
          summary: "The promotion plan could not be parsed. Please try regenerating.",
          strengths: [],
          developmentAreas: [],
          resources: [],
          milestones: [],
          timeline: "",
          fullPlan: planContent,
        };
      }
    }

    // Save to database
    const planId: any = await ctx.runMutation(api.promotionPlans.create, {
      memberId: args.memberId,
      memberCurrentRole: member.role,
      targetLevel: targetRole,
      planContent: planStructure,
    });

    return { planId, planContent: planStructure };
  },
});

export const generateJobDescription = action({
  args: {
    roleId: v.id("roles"),
    levelKey: v.string(),
    levelLabel: v.string(),
    roleFocus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthAction(ctx);

    // Fetch role, levels, competencies, sub-competencies
    const role: any = await ctx.runQuery(api.roles.get, { id: args.roleId });
    if (!role) throw new Error("Role not found");

    let roleLevels: any[] = await ctx.runQuery(api.roleLevels.listByRole, {
      roleId: args.roleId,
    });

    // Fall back to hardcoded defaults if no DB levels exist
    if (roleLevels.length === 0) {
      const defaults = role.type === "management" ? MANAGEMENT_DEFAULT_LEVELS : IC_DEFAULT_LEVELS;
      roleLevels = defaults.map((l: any) => ({ ...l, roleId: args.roleId }));
    }

    // Validate the selected level exists
    const selectedLevel = roleLevels.find((l: any) => l.key === args.levelKey);
    if (!selectedLevel) throw new Error("Selected level not found for this role");

    const competencies: any[] = await ctx.runQuery(api.competencies.listByRole, {
      roleId: args.roleId,
    });
    const subCompetencies: any[] = await ctx.runQuery(
      api.competencies.listSubCompetenciesByRole,
      { roleId: args.roleId }
    );

    // Build competency framework context with level-specific criteria
    const frameworkData = competencies.map((comp: any) => {
      const subs = subCompetencies
        .filter((s: any) => s.competencyId === comp._id)
        .map((sub: any) => {
          let criteria: string[] = [];
          if (sub.levelCriteria && sub.levelCriteria[args.levelKey]) {
            criteria = sub.levelCriteria[args.levelKey];
          }
          return {
            title: sub.title,
            criteria,
          };
        })
        .filter((s: any) => s.criteria.length > 0);

      return {
        competency: comp.title,
        description: comp.description || "",
        subCompetencies: subs,
      };
    }).filter((c: any) => c.subCompetencies.length > 0);

    // Guard: if zero criteria exist for the selected level
    const totalCriteria = frameworkData.reduce(
      (sum: number, c: any) =>
        sum + c.subCompetencies.reduce((s: number, sub: any) => s + sub.criteria.length, 0),
      0
    );
    if (totalCriteria === 0) {
      throw new Error(
        `No competency criteria found for level "${args.levelLabel}". Please add criteria to your competency framework for this level before generating a job description.`
      );
    }

    // Build career ladder context
    const careerLadder = roleLevels
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
      .map((l: any) => `${l.label}${l.description ? ` — ${l.description}` : ""}`)
      .join("\n");

    const systemPrompt = `You are an expert technical recruiter who writes compelling, accurate job descriptions for design roles. You ground every requirement and responsibility in the provided competency framework — never invent skills or requirements that aren't supported by the framework data. Responsibilities should focus on activities and outcomes — what the person actually does day-to-day — not process or methodology. Write in inclusive, bias-free language. Do not include compensation, benefits, or company-specific perks.`;

    const userPrompt = `Generate a structured job description for the following role and level.

ROLE: ${role.title}
TYPE: ${role.type === "ic" ? "Individual Contributor" : "Management"}
${role.description ? `ROLE DESCRIPTION: ${role.description}` : ""}
${args.roleFocus ? `\nROLE FOCUS: ${args.roleFocus}\nThis is a subtle emphasis, not a redefinition of the role. The role focus may change after the hire, so treat it as a light highlight rather than the core of the job description. Mention it in the summary to give context on the immediate team or focus area. A few responsibility and requirement bullets can reflect this focus, but the majority should remain grounded in the general competency framework for this level.\n` : ""}
TARGET LEVEL: ${args.levelLabel}
${selectedLevel.description ? `LEVEL DESCRIPTION: ${selectedLevel.description}` : ""}

CAREER LADDER (for context on where this level sits):
${careerLadder}

COMPETENCY FRAMEWORK (criteria specific to the ${args.levelLabel} level):
${JSON.stringify(frameworkData, null, 2)}

Return ONLY valid JSON matching this exact structure:

{
  "title": "Job title (e.g. Senior Product Designer)",
  "summary": "3-4 sentence role overview that describes what this person does, the impact they have, and what makes this level distinct",
  "portfolioCallout": "A short sentence asking applicants to include a link to their portfolio when applying",
  "responsibilities": ["Activity-focused bullets that weave in competency expectations naturally"],
  "requirements": ["Must-have skills and experience"],
  "niceToHave": ["Preferred qualifications"],
  "levelContext": "1-2 sentences describing where this level sits in the career ladder and what distinguishes it from adjacent levels"
}

REQUIREMENTS:
- Ground responsibilities and requirements in the actual competency criteria provided — do not invent skills
- Write responsibilities as activity-focused statements starting with verbs — describe what the person does, not process
- Weave competency expectations into responsibilities naturally rather than listing them separately
- Requirements should reflect the level of experience and skill depth implied by the criteria — describe experience in qualitative terms (e.g. "deep experience", "proven track record"), never use numeric years or quantities
- Nice-to-have items can extend slightly beyond the framework but should stay relevant
- Use inclusive, bias-free language throughout
- Do not include compensation, benefits, or company-specific information
- Keep the tone professional yet approachable`;

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : null;
    if (!content) throw new Error("No text response from Anthropic");

    // Parse JSON response (same code-fence stripping pattern)
    let parsed;
    try {
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr);
    } catch {
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          parsed = JSON.parse(objectMatch[0]);
        } catch {
          parsed = null;
        }
      }
      if (!parsed) {
        throw new Error("Failed to parse AI response as JSON. Please try again.");
      }
    }

    // Validate/sanitize fields
    const jdContent = {
      title: String(parsed.title || `${args.levelLabel} ${role.title}`),
      summary: String(parsed.summary || ""),
      portfolioCallout: String(parsed.portfolioCallout || ""),
      responsibilities: Array.isArray(parsed.responsibilities)
        ? parsed.responsibilities.map(String).filter((s: string) => s.length > 0)
        : [],
      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements.map(String).filter((s: string) => s.length > 0)
        : [],
      niceToHave: Array.isArray(parsed.niceToHave)
        ? parsed.niceToHave.map(String).filter((s: string) => s.length > 0)
        : [],
      levelContext: String(parsed.levelContext || ""),
    };

    // Upsert into jobDescriptions table
    await ctx.runMutation(api.jobDescriptions.upsert, {
      roleId: args.roleId,
      levelKey: args.levelKey,
      levelLabel: args.levelLabel,
      content: jdContent,
      generatedBy: identity.subject,
    });

    return jdContent;
  },
});

export const generateAssessmentPrompts = action({
  args: {
    memberId: v.id("teamMembers"),
    assessmentId: v.id("assessments"),
    roleId: v.optional(v.id("roles")),
  },
  handler: async (ctx, args): Promise<Array<{ subCompetencyId: string; prompts: Array<{ question: string; lookFor: string }> }>> => {
    await requireAuthAction(ctx);
    const member: any = await ctx.runQuery(api.teamMembers.get, { id: args.memberId });
    if (!member) throw new Error("Member not found");

    const competencies: any[] = args.roleId
      ? await ctx.runQuery(api.competencies.listByRole, { roleId: args.roleId })
      : await ctx.runQuery(api.competencies.list, {});
    const subCompetencies: any[] = args.roleId
      ? await ctx.runQuery(api.competencies.listSubCompetenciesByRole, { roleId: args.roleId })
      : await ctx.runQuery(api.competencies.listSubCompetencies, {});

    // Determine role type for level context
    let roleType = "ic";
    if (args.roleId) {
      const role: any = await ctx.runQuery(api.roles.get, { id: args.roleId });
      if (role?.type === "management") roleType = "management";
    }

    const IC_LEVEL_KEYS = ["p1_entry", "p2_developing", "p3_career", "p4_advanced", "p5_principal"];
    const MGMT_LEVEL_KEYS = ["m1_team_lead", "m2_manager", "m3_director", "m4_senior_director"];
    const levelKeys = roleType === "management" ? MGMT_LEVEL_KEYS : IC_LEVEL_KEYS;

    // Build framework context: each sub-competency with its criteria at the member's level
    const NEW_TO_OLD: Record<string, string> = {
      p1_entry: "associate", p2_developing: "intermediate", p3_career: "senior",
      p4_advanced: "lead", p5_principal: "principal",
    };
    const memberLevelKey = member.role.toLowerCase().replace(/\s+/g, "_");

    // Resolve criteria for the member's level
    function getCriteria(sub: any, key: string): string[] {
      if (sub.levelCriteria) {
        if (sub.levelCriteria[key]) return sub.levelCriteria[key];
        const mapped = NEW_TO_OLD[key];
        if (mapped && sub.levelCriteria[mapped]) return sub.levelCriteria[mapped];
      }
      return [];
    }

    const subCompetencyContext = subCompetencies.map((sub: any) => {
      const comp = competencies.find((c: any) => c._id === sub.competencyId);
      const criteria = getCriteria(sub, memberLevelKey);
      return {
        id: sub._id,
        title: sub.title,
        competency: comp?.title || "Unknown",
        criteria,
      };
    }).filter((s) => s.criteria.length > 0);

    if (subCompetencyContext.length === 0) {
      // No criteria found — store empty and return
      await ctx.runMutation(api.assessments.updateGeneratedPrompts, {
        id: args.assessmentId,
        generatedPrompts: [],
      });
      return [];
    }

    const frameworkJson = JSON.stringify(subCompetencyContext, null, 2);

    const systemPrompt = `You are an expert design management coach. Generate focused assessment discussion prompts to help a manager evaluate a team member during a 1:1 assessment session.

For each sub-competency provided, generate 2-3 discussion prompts. Each prompt should:
- Be practical, behavioral, and observable — not abstract
- Help the manager observe or discuss the specific criteria at the member's current level
- Be phrased as questions or discussion starters a manager would use in a 1:1

Return ONLY valid JSON matching this exact structure:
{
  "prompts": [
    {
      "subCompetencyId": "the sub-competency ID",
      "prompts": [
        {
          "question": "A discussion prompt or question for the manager to use",
          "lookFor": "What a strong demonstration looks like at this level"
        }
      ]
    }
  ]
}`;

    const userPrompt = `Generate assessment discussion prompts for ${member.name}, currently at level "${member.role}".

LEVEL PROGRESSION: ${levelKeys.join(" → ")}

SUB-COMPETENCIES WITH CRITERIA AT THEIR LEVEL:
${frameworkJson}

Generate 2-3 discussion prompts per sub-competency that help the manager evaluate performance against these specific criteria.`;

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : null;
    if (!content) throw new Error("No response from Anthropic");

    // Strip code fences if present
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const parsed = JSON.parse(jsonStr);
    const promptGroups = parsed.prompts;
    if (!Array.isArray(promptGroups)) throw new Error("Invalid prompts format");

    const result = promptGroups.map((g: any) => ({
      subCompetencyId: String(g.subCompetencyId),
      prompts: (g.prompts || []).map((p: any) => ({
        question: String(p.question || ""),
        lookFor: String(p.lookFor || ""),
      })).filter((p: any) => p.question.length > 0),
    })).filter((g: any) => g.prompts.length > 0);

    // Store on the assessment record
    await ctx.runMutation(api.assessments.updateGeneratedPrompts, {
      id: args.assessmentId,
      generatedPrompts: result,
    });

    return result;
  },
});

export const generateAssessmentSummary = action({
  args: {
    memberId: v.id("teamMembers"),
    assessmentId: v.id("assessments"),
    roleId: v.optional(v.id("roles")),
  },
  handler: async (ctx, args) => {
    await requireAuthAction(ctx);

    const member: any = await ctx.runQuery(api.teamMembers.get, { id: args.memberId });
    if (!member) throw new Error("Member not found");

    const competencies: any[] = args.roleId
      ? await ctx.runQuery(api.competencies.listByRole, { roleId: args.roleId })
      : await ctx.runQuery(api.competencies.list, {});
    const subCompetencies: any[] = args.roleId
      ? await ctx.runQuery(api.competencies.listSubCompetenciesByRole, { roleId: args.roleId })
      : await ctx.runQuery(api.competencies.listSubCompetencies, {});

    // Fetch progress and evaluations for this assessment
    const progress: any[] = await ctx.runQuery(api.progress.listForAssessment, {
      assessmentId: args.assessmentId,
    });
    const progressIds = progress.map((p: any) => p._id);
    let evaluations: any[] = [];
    if (progressIds.length > 0) {
      evaluations = await ctx.runQuery(api.evaluations.listForProgressIds, { progressIds });
    }

    // Determine role type and level keys
    let roleType = "ic";
    if (args.roleId) {
      const role: any = await ctx.runQuery(api.roles.get, { id: args.roleId });
      if (role?.type === "management") roleType = "management";
    }

    const IC_LEVEL_KEYS = ["p1_entry", "p2_developing", "p3_career", "p4_advanced", "p5_principal"];
    const MGMT_LEVEL_KEYS = ["m1_team_lead", "m2_manager", "m3_director", "m4_senior_director"];
    const levelKeys = roleType === "management" ? MGMT_LEVEL_KEYS : IC_LEVEL_KEYS;

    const NEW_TO_OLD: Record<string, string> = {
      p1_entry: "associate", p2_developing: "intermediate", p3_career: "senior",
      p4_advanced: "lead", p5_principal: "principal",
    };

    const memberLevelKey = member.role.toLowerCase().replace(/\s+/g, "_");
    const memberLevelIndex = levelKeys.indexOf(memberLevelKey);
    const nextLevelKey = memberLevelIndex >= 0 && memberLevelIndex < levelKeys.length - 1
      ? levelKeys[memberLevelIndex + 1]
      : null;

    // Helper to get criteria for a level from a sub-competency
    function getCriteria(sub: any, key: string): string[] {
      if (sub.levelCriteria) {
        if (sub.levelCriteria[key]) return sub.levelCriteria[key];
        const mapped = NEW_TO_OLD[key];
        if (mapped && sub.levelCriteria[mapped]) return sub.levelCriteria[mapped];
      }
      return [];
    }

    const evalToScore: Record<string, number> = {
      well_above: 5, above: 4, target: 3, below: 2, well_below: 1,
    };

    const evalToLabel: Record<string, string> = {
      well_above: "Well Above", above: "Above", target: "At Target",
      below: "Below", well_below: "Well Below",
    };

    // Build per-competency scores and collect below-target items
    const competencyScores: Array<{ competency: string; avgScore: number; totalCriteria: number }> = [];
    const belowTargetItems: Array<{
      competency: string; subCompetency: string; criterion: string;
      rating: string; currentLevelCriteria: string[]; nextLevelCriteria: string[];
    }> = [];

    for (const comp of competencies) {
      const compSubs = subCompetencies.filter((s: any) => s.competencyId === comp._id);
      let compScoreTotal = 0;
      let compEvalCount = 0;

      for (const sub of compSubs) {
        const subProgress = progress.find((p: any) => p.subCompetencyId === sub._id);
        if (!subProgress) continue;

        const subEvals = evaluations.filter((e: any) => e.progressId === subProgress._id);

        for (const ev of subEvals) {
          const score = evalToScore[ev.evaluation] || 3;
          compScoreTotal += score;
          compEvalCount++;

          if (ev.evaluation === "below" || ev.evaluation === "well_below") {
            belowTargetItems.push({
              competency: comp.title,
              subCompetency: sub.title,
              criterion: ev.criterionText,
              rating: evalToLabel[ev.evaluation] || ev.evaluation,
              currentLevelCriteria: getCriteria(sub, memberLevelKey),
              nextLevelCriteria: nextLevelKey ? getCriteria(sub, nextLevelKey) : [],
            });
          }
        }
      }

      if (compEvalCount > 0) {
        competencyScores.push({
          competency: comp.title,
          avgScore: Math.round((compScoreTotal / compEvalCount) * 100) / 100,
          totalCriteria: compEvalCount,
        });
      }
    }

    // Build AI prompt
    const levelProgression = levelKeys.join(" → ");
    const currentLevelLabel = memberLevelKey;
    const nextLevelLabel = nextLevelKey || "(max level — no next level)";

    const systemPrompt = `You are an expert design management coach. Analyze assessment data and generate a concise, actionable summary.

Return ONLY valid JSON matching this exact structure:
{
  "overallNarrative": "3-4 sentence paragraph summarizing the assessment results, key strengths, and development priorities",
  "strengths": [
    { "competency": "Competency name", "detail": "1-2 sentences on why this is a strength" }
  ],
  "areasNeedingSupport": [
    {
      "competency": "Competency name",
      "subCompetency": "Sub-competency name",
      "criterion": "The specific criterion text",
      "rating": "Below or Well Below",
      "currentLevelExpectation": "What is expected at the current level for this area",
      "nextLevelExpectation": "What the next level requires for this area",
      "guidance": "2-3 sentences of actionable advice referencing both current and next level expectations"
    }
  ],
  "overallReadiness": "1-2 sentence assessment of readiness for the next level"
}

IMPORTANT RULES:
- For strengths, identify the top 2-3 competency areas based on highest average scores
- For areasNeedingSupport, include ONLY items that were rated Below or Well Below — do not invent items
- If there are no below-target items, return an empty areasNeedingSupport array
- For each below-target item, guidance MUST reference both what the current level expects AND what the next level requires
- If the member is at the maximum level (no next level), frame guidance around mastery and mentoring others instead of advancement
- Keep all text concise and actionable`;

    const userPrompt = `Generate an assessment summary for ${member.name}, currently at level "${currentLevelLabel}".

LEVEL PROGRESSION: ${levelProgression}
CURRENT LEVEL: ${currentLevelLabel}
NEXT LEVEL: ${nextLevelLabel}

COMPETENCY SCORES (5-point scale where 3 = At Target):
${JSON.stringify(competencyScores, null, 2)}

${belowTargetItems.length > 0 ? `BELOW-TARGET ITEMS (${belowTargetItems.length} total):
${JSON.stringify(belowTargetItems, null, 2)}` : "No below-target items — all criteria are at or above target."}

Generate the assessment summary JSON.`;

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : null;
    if (!content) throw new Error("No response from Anthropic");

    // Parse JSON response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        parsed = JSON.parse(objectMatch[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    // Validate and sanitize
    const summary = {
      overallNarrative: String(parsed.overallNarrative || "Assessment summary generated."),
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map((s: any) => ({
            competency: String(s.competency || ""),
            detail: String(s.detail || ""),
          })).filter((s: any) => s.competency.length > 0)
        : [],
      areasNeedingSupport: Array.isArray(parsed.areasNeedingSupport)
        ? parsed.areasNeedingSupport.map((a: any) => ({
            competency: String(a.competency || ""),
            subCompetency: String(a.subCompetency || ""),
            criterion: String(a.criterion || ""),
            rating: String(a.rating || ""),
            currentLevelExpectation: String(a.currentLevelExpectation || ""),
            nextLevelExpectation: String(a.nextLevelExpectation || ""),
            guidance: String(a.guidance || ""),
          })).filter((a: any) => a.competency.length > 0)
        : [],
      overallReadiness: String(parsed.overallReadiness || ""),
    };

    // Store on the assessment record
    await ctx.runMutation(api.assessments.updateGeneratedSummary, {
      id: args.assessmentId,
      generatedSummary: summary,
    });

    return summary;
  },
});

export const generateInterviewQuestions = action({
  args: {
    stageId: v.id("hiringStages"),
    candidateId: v.id("hiringCandidates"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args): Promise<Array<{ category: string; question: string; signal: string }>> => {
    await requireAuthAction(ctx);
    // Fetch stage, candidate, role, and competency framework
    const stage: any = await ctx.runQuery(api.hiringStages.get, { id: args.stageId });
    if (!stage) throw new Error("Stage not found");

    const candidate: any = await ctx.runQuery(api.candidates.get, { id: args.candidateId });
    if (!candidate) throw new Error("Candidate not found");

    const role: any = await ctx.runQuery(api.roles.get, { id: args.roleId });
    if (!role) throw new Error("Role not found");

    const competencies: any[] = await ctx.runQuery(api.competencies.listByRole, { roleId: args.roleId });
    const subCompetencies: any[] = await ctx.runQuery(api.competencies.listSubCompetenciesByRole, { roleId: args.roleId });

    // Build competency framework summary
    const frameworkSummary = competencies.map((comp: any) => {
      const subs = subCompetencies
        .filter((s: any) => s.competencyId === comp._id)
        .map((s: any) => s.title);
      return `${comp.title}: ${subs.join(", ")}`;
    }).join("\n");

    const systemPrompt = `You are an expert interviewer with deep knowledge across all professional disciplines. Generate structured interview questions tailored to the specific role, interview stage, the candidate's target level, and the role's competency framework.

The STAGE INSTRUCTIONS define the purpose, focus areas, question style, and categories for this specific interview. Follow them closely — they are the primary guide for what to generate.

Return ONLY valid JSON matching this exact structure:
{
  "questions": [
    {
      "category": "Category name",
      "question": "The interview question to ask",
      "signal": "What a strong answer looks like, and what separates a good answer from a great one"
    }
  ]
}

Requirements:
- Generate 10-15 questions organized by the categories specified in the stage instructions
- Adapt question complexity and depth to the candidate's target level
- Each signal should describe what a strong answer demonstrates and what separates good from great
- Questions should feel natural and conversational, not like a checklist
- Where the stage instructions reference the competency framework, incorporate specific competency areas into questions`;

    const userPrompt = `Generate interview questions for this stage:

STAGE: ${stage.title}
${stage.aiInstructions ? `STAGE INSTRUCTIONS: ${stage.aiInstructions}` : ""}
${stage.description ? `STAGE DESCRIPTION: ${stage.description}` : ""}

CANDIDATE: ${candidate.name}
TARGET ROLE: ${candidate.targetRole}
ROLE: ${role.title} (${role.type})

COMPETENCY FRAMEWORK:
${frameworkSummary}

Generate questions that probe the candidate's abilities relevant to this stage and their target level of "${candidate.targetRole}".`;

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : null;
    if (!content) throw new Error("No response from Anthropic");

    try {
      // Strip code fences if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonStr);
      const questions = parsed.questions;
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid questions format");
      }
      // Validate and sanitize
      return questions.map((q: any) => ({
        category: String(q.category || "General"),
        question: String(q.question || ""),
        signal: String(q.signal || ""),
      })).filter((q: any) => q.question.length > 0);
    } catch {
      throw new Error("Failed to parse AI-generated questions");
    }
  },
});

export const generateCandidateAssessmentSummary = action({
  args: {
    assessmentId: v.id("candidateAssessments"),
    candidateId: v.id("hiringCandidates"),
  },
  handler: async (ctx, args) => {
    await requireAuthAction(ctx);

    const assessment: any = await ctx.runQuery(api.candidateAssessments.getById, {
      id: args.assessmentId,
    });
    if (!assessment) throw new Error("Assessment not found");

    const candidate: any = await ctx.runQuery(api.candidates.get, {
      id: args.candidateId,
    });
    if (!candidate) throw new Error("Candidate not found");

    // Fetch both response types — only one will have data
    const interviewResponses: any[] = await ctx.runQuery(
      api.interviewResponses.listForAssessment,
      { assessmentId: args.assessmentId }
    );
    const portfolioResponses: any[] = await ctx.runQuery(
      api.portfolioResponses.listForAssessment,
      { assessmentId: args.assessmentId }
    );

    const isInterview = interviewResponses.length > 0;
    const assessmentType = isInterview ? "Manager Interview" : "Portfolio Review";

    // Normalize responses to common shape
    type NormalizedResponse = {
      category: string;
      question: string;
      rating: string;
      notes: string;
    };

    const ratingScoreMap: Record<string, number> = {
      well_above: 5, above: 4, target: 3, below: 2, well_below: 1,
    };

    const ratingLabelMap: Record<string, string> = {
      well_above: "Well Above", above: "Above", target: "At Target",
      below: "Below", well_below: "Well Below",
    };

    let normalized: NormalizedResponse[] = [];

    if (isInterview) {
      // Build category lookup from assessment.generatedQuestions
      const categoryByIndex: Record<number, string> = {};
      if (assessment.generatedQuestions) {
        assessment.generatedQuestions.forEach((q: any, i: number) => {
          categoryByIndex[i] = q.category || "General";
        });
      }

      normalized = interviewResponses.map((r: any) => ({
        category: categoryByIndex[r.questionIndex] || "General",
        question: r.questionText || "",
        rating: r.rating || "target",
        notes: r.responseNotes || "",
      }));
    } else {
      normalized = portfolioResponses.map((r: any) => ({
        category: r.competencyArea || "General",
        question: r.questionText || "",
        rating: r.competencyLevel || "target",
        notes: r.responseNotes || "",
      }));
    }

    // Compute per-category average scores
    const categoryScores: Record<string, { total: number; count: number }> = {};
    const belowTargetItems: NormalizedResponse[] = [];

    for (const resp of normalized) {
      const score = ratingScoreMap[resp.rating] || 3;
      if (!categoryScores[resp.category]) {
        categoryScores[resp.category] = { total: 0, count: 0 };
      }
      categoryScores[resp.category].total += score;
      categoryScores[resp.category].count++;

      if (resp.rating === "below" || resp.rating === "well_below") {
        belowTargetItems.push(resp);
      }
    }

    const categoryAvgs = Object.entries(categoryScores).map(([cat, { total, count }]) => ({
      category: cat,
      avgScore: Math.round((total / count) * 100) / 100,
      count,
    }));

    // Build AI prompt
    const systemPrompt = `You are an expert hiring evaluator analyzing ${assessmentType.toLowerCase()} data for a candidate.

Return ONLY valid JSON matching this exact structure:
{
  "overallNarrative": "3-4 sentence paragraph summarizing the candidate's performance, key strengths, and any concerns",
  "strengths": [
    { "area": "Category or skill area", "detail": "1-2 sentences on why this is a strength" }
  ],
  "concerns": [
    {
      "area": "Category or skill area",
      "question": "The specific question where the concern was noted",
      "rating": "Below or Well Below",
      "observation": "1-2 sentences explaining the concern and what was missing"
    }
  ],
  "hiringRecommendation": "One of: Strong Hire / Hire / Lean Hire / Lean No Hire / No Hire"
}

IMPORTANT RULES:
- For strengths, identify the top 2-3 areas based on highest average scores and strongest notes
- For concerns, include ONLY items rated Below or Well Below — do not invent items
- If there are no below-target items, return an empty concerns array
- The hiringRecommendation should follow this rubric:
  - Strong Hire: Average >= 4.0, no below-target items
  - Hire: Average >= 3.5, minimal below-target items
  - Lean Hire: Average >= 3.0, some below-target items
  - Lean No Hire: Average >= 2.5 or several below-target items
  - No Hire: Average < 2.5 or many critical below-target items
- Keep all text concise and actionable`;

    const allResponses = normalized.map((r) => ({
      category: r.category,
      question: r.question,
      rating: ratingLabelMap[r.rating] || r.rating,
      notes: r.notes,
    }));

    const userPrompt = `Generate a hiring assessment summary for candidate "${candidate.name}" applying for "${candidate.targetRole}".

ASSESSMENT TYPE: ${assessmentType}

CATEGORY SCORES (5-point scale where 3 = At Target):
${JSON.stringify(categoryAvgs, null, 2)}

ALL RESPONSES (${normalized.length} total):
${JSON.stringify(allResponses, null, 2)}

${belowTargetItems.length > 0 ? `BELOW-TARGET ITEMS (${belowTargetItems.length} total):
${JSON.stringify(belowTargetItems.map((r) => ({
  category: r.category,
  question: r.question,
  rating: ratingLabelMap[r.rating] || r.rating,
  notes: r.notes,
})), null, 2)}` : "No below-target items — all responses are at or above target."}

Generate the hiring assessment summary JSON.`;

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : null;
    if (!content) throw new Error("No response from Anthropic");

    // Parse JSON response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        parsed = JSON.parse(objectMatch[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    // Validate and sanitize
    const summary = {
      overallNarrative: String(parsed.overallNarrative || "Assessment summary generated."),
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map((s: any) => ({
            area: String(s.area || ""),
            detail: String(s.detail || ""),
          })).filter((s: any) => s.area.length > 0)
        : [],
      concerns: Array.isArray(parsed.concerns)
        ? parsed.concerns.map((c: any) => ({
            area: String(c.area || ""),
            question: String(c.question || ""),
            rating: String(c.rating || ""),
            observation: String(c.observation || ""),
          })).filter((c: any) => c.area.length > 0)
        : [],
      hiringRecommendation: String(parsed.hiringRecommendation || "Lean Hire"),
    };

    // Store on the assessment record
    await ctx.runMutation(api.candidateAssessments.updateGeneratedSummary, {
      id: args.assessmentId,
      generatedSummary: summary,
    });

    return summary;
  },
});
