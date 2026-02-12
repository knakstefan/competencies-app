import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("hiringCandidates").collect();
  },
});

export const listWithAssessmentStatus = query({
  args: {},
  handler: async (ctx) => {
    const candidates = await ctx.db.query("hiringCandidates").collect();

    return Promise.all(
      candidates.map(async (candidate) => {
        const assessments = await ctx.db
          .query("candidateAssessments")
          .withIndex("by_candidateId", (q) => q.eq("candidateId", candidate._id))
          .collect();

        const currentStageAssessment = assessments.find(
          (a) => a.stage === candidate.currentStage && a.status === "completed"
        );

        return {
          ...candidate,
          currentStageCompleted: !!currentStageAssessment,
          currentStageScore: currentStageAssessment?.overallScore ?? null,
        };
      })
    );
  },
});

export const listWithAssessmentStatusByRole = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
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

        const currentStageAssessment = assessments.find(
          (a) => a.stage === candidate.currentStage && a.status === "completed"
        );

        return {
          ...candidate,
          currentStageCompleted: !!currentStageAssessment,
          currentStageScore: currentStageAssessment?.overallScore ?? null,
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("hiringCandidates") },
  handler: async (ctx, args) => {
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
    return await ctx.db.insert("hiringCandidates", {
      ...args,
      currentStage: args.currentStage || "manager_interview",
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
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("hiringCandidates") },
  handler: async (ctx, args) => {
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
    await ctx.db.patch(args.id, { currentStage: args.currentStage });
  },
});
