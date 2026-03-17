import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireEditor, requireAdmin } from "./auth.helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("hiringCandidates").collect();
  },
});

function enrichCandidate(candidate: any, assessments: any[]) {
  const currentStageAssessment = assessments.find(
    (a: any) => a.stage === candidate.currentStage && a.status === "completed"
  );
  const latestWithSummary = assessments
    .filter((a: any) => a.status === "completed" && a.generatedSummary)
    .sort((a: any, b: any) => (b.completedAt || "").localeCompare(a.completedAt || ""))[0];

  return {
    ...candidate,
    currentStageCompleted: !!currentStageAssessment,
    currentStageScore: currentStageAssessment?.overallScore ?? null,
    hiringRecommendation: latestWithSummary?.generatedSummary?.hiringRecommendation ?? null,
    teamFitRating: latestWithSummary?.generatedSummary?.teamFitRating ?? null,
  };
}

export const listWithAssessmentStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const candidates = await ctx.db.query("hiringCandidates").collect();
    return Promise.all(
      candidates.map(async (candidate) => {
        const assessments = await ctx.db
          .query("candidateAssessments")
          .withIndex("by_candidateId", (q) => q.eq("candidateId", candidate._id))
          .collect();
        return enrichCandidate(candidate, assessments);
      })
    );
  },
});

export const listWithAssessmentStatusByRole = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const candidates = await ctx.db
      .query("hiringCandidates")
      .withIndex("by_roleId", (q) => q.eq("roleId", args.roleId))
      .collect();
    return Promise.all(
      candidates.map(async (candidate) => {
        const assessments = await ctx.db
          .query("candidateAssessments")
          .withIndex("by_candidateId", (q) => q.eq("candidateId", candidate._id))
          .collect();
        return enrichCandidate(candidate, assessments);
      })
    );
  },
});

export const get = query({
  args: { id: v.id("hiringCandidates") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    targetRole: v.string(),
    currentStage: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    roleId: v.optional(v.id("roles")),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    // If roleId provided and no explicit currentStage, use the first hiring stage ID
    let defaultStage = args.currentStage || "manager_interview";
    if (args.roleId && !args.currentStage) {
      const stages = await ctx.db
        .query("hiringStages")
        .withIndex("by_roleId", (q) => q.eq("roleId", args.roleId!))
        .collect();
      const sorted = stages.sort((a, b) => a.orderIndex - b.orderIndex);
      if (sorted.length > 0) {
        defaultStage = sorted[0]._id;
      }
    }

    return await ctx.db.insert("hiringCandidates", {
      ...args,
      currentStage: defaultStage,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("hiringCandidates"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    targetRole: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("hiringCandidates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Cascade delete all candidate data
    const assessments = await ctx.db
      .query("candidateAssessments")
      .withIndex("by_candidateId", (q) => q.eq("candidateId", args.id))
      .collect();

    for (const assessment of assessments) {
      // Delete candidate progress and evaluations
      const progress = await ctx.db
        .query("candidateCompetencyProgress")
        .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessment._id))
        .collect();
      for (const p of progress) {
        const evals = await ctx.db
          .query("candidateCriteriaEvaluations")
          .withIndex("by_progressId", (q) => q.eq("progressId", p._id))
          .collect();
        for (const ev of evals) {
          await ctx.db.delete(ev._id);
        }
        await ctx.db.delete(p._id);
      }

      // Delete interview responses
      const interviews = await ctx.db
        .query("managerInterviewResponses")
        .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessment._id))
        .collect();
      for (const i of interviews) {
        await ctx.db.delete(i._id);
      }

      // Delete portfolio responses
      const portfolios = await ctx.db
        .query("portfolioReviewResponses")
        .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessment._id))
        .collect();
      for (const p of portfolios) {
        await ctx.db.delete(p._id);
      }

      await ctx.db.delete(assessment._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const updateStage = mutation({
  args: {
    id: v.id("hiringCandidates"),
    currentStage: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, { currentStage: args.currentStage });
  },
});
