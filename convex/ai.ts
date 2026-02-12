"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import OpenAI from "openai";

export const generatePromotionPlan = action({
  args: {
    memberId: v.id("teamMembers"),
    roleId: v.optional(v.id("roles")),
  },
  handler: async (ctx, args): Promise<{ planId: string; planContent: any }> => {
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
        title: comp.title,
        code: comp.code,
        subCompetencies: subs,
        trending: trend || null,
      };
    });

    // Calculate role progression path
    const roles = [
      "associate",
      "intermediate",
      "senior",
      "lead",
      "principal",
    ];
    const currentRoleIndex = roles.indexOf(member.role.toLowerCase());
    const targetRole =
      currentRoleIndex < roles.length - 1
        ? roles[currentRoleIndex + 1]
        : roles[currentRoleIndex];

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

    // Call OpenAI GPT-4o
    const client = new OpenAI();

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const planContent = response.choices[0]?.message?.content;
    if (!planContent) {
      throw new Error("No text response from OpenAI");
    }

    // Parse the JSON response
    let planStructure;
    try {
      // With response_format: json_object, the response should be clean JSON,
      // but handle code fences as a safety net
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
