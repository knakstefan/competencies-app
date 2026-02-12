import { query } from "./_generated/server";
import { v } from "convex/values";

export const getTeamSkillData = query({
  args: {},
  handler: async (ctx) => {
    const [members, competencies, subCompetencies, allAssessments] = await Promise.all([
      ctx.db.query("teamMembers").withIndex("by_name").collect(),
      ctx.db.query("competencies").withIndex("by_orderIndex").collect(),
      ctx.db.query("subCompetencies").withIndex("by_orderIndex").collect(),
      ctx.db.query("assessments").withIndex("by_status").collect(),
    ]);

    const completedAssessments = allAssessments
      .filter((a) => a.status === "completed")
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

    // Find latest assessment per member
    const latestAssessmentByMember = new Map<string, string>();
    for (const member of members) {
      const memberAssessment = completedAssessments.find(
        (a) => a.memberId === member._id
      );
      if (memberAssessment) {
        latestAssessmentByMember.set(member._id, memberAssessment._id);
      }
    }

    const latestAssessmentIds = Array.from(latestAssessmentByMember.values());

    // Fetch all progress for latest assessments
    let allProgress: any[] = [];
    for (const assessmentId of latestAssessmentIds) {
      const progress = await ctx.db
        .query("memberCompetencyProgress")
        .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessmentId as any))
        .collect();
      allProgress.push(...progress);
    }

    // Fetch all evaluations
    const allEvaluations: any[] = [];
    for (const p of allProgress) {
      const evals = await ctx.db
        .query("criteriaEvaluations")
        .withIndex("by_progressId", (q) => q.eq("progressId", p._id))
        .collect();
      allEvaluations.push(...evals);
    }

    return {
      members,
      competencies,
      subCompetencies,
      completedAssessments,
      latestAssessmentByMember: Object.fromEntries(latestAssessmentByMember),
      allProgress,
      allEvaluations,
    };
  },
});

export const getTeamSkillDataByRole = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    const [members, competencies, allAssessments] = await Promise.all([
      ctx.db
        .query("teamMembers")
        .withIndex("by_roleId", (q) => q.eq("roleId", args.roleId))
        .collect(),
      ctx.db
        .query("competencies")
        .withIndex("by_roleId", (q) => q.eq("roleId", args.roleId))
        .collect(),
      ctx.db.query("assessments").withIndex("by_status").collect(),
    ]);

    // Get sub-competencies for role's competencies
    const compIds = new Set(competencies.map((c) => c._id));
    const allSubs = await ctx.db
      .query("subCompetencies")
      .withIndex("by_orderIndex")
      .collect();
    const subCompetencies = allSubs.filter((s) => compIds.has(s.competencyId));

    // Filter assessments to only those belonging to role members
    const memberIds = new Set(members.map((m) => m._id));
    const memberAssessments = allAssessments.filter((a) => memberIds.has(a.memberId));

    const completedAssessments = memberAssessments
      .filter((a) => a.status === "completed")
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

    const latestAssessmentByMember = new Map<string, string>();
    for (const member of members) {
      const memberAssessment = completedAssessments.find(
        (a) => a.memberId === member._id
      );
      if (memberAssessment) {
        latestAssessmentByMember.set(member._id, memberAssessment._id);
      }
    }

    const latestAssessmentIds = Array.from(latestAssessmentByMember.values());

    const allProgress: any[] = [];
    for (const assessmentId of latestAssessmentIds) {
      const progress = await ctx.db
        .query("memberCompetencyProgress")
        .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessmentId as any))
        .collect();
      allProgress.push(...progress);
    }

    const allEvaluations: any[] = [];
    for (const p of allProgress) {
      const evals = await ctx.db
        .query("criteriaEvaluations")
        .withIndex("by_progressId", (q) => q.eq("progressId", p._id))
        .collect();
      allEvaluations.push(...evals);
    }

    return {
      members,
      competencies: competencies.sort((a, b) => a.orderIndex - b.orderIndex),
      subCompetencies,
      completedAssessments,
      latestAssessmentByMember: Object.fromEntries(latestAssessmentByMember),
      allProgress,
      allEvaluations,
    };
  },
});
