import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireEditor, requireAdmin } from "./auth.helpers";

export const getById = query({
  args: { id: v.id("candidateAssessments") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.id);
  },
});

export const listForCandidate = query({
  args: { candidateId: v.id("hiringCandidates") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("candidateAssessments")
      .withIndex("by_candidateId", (q) => q.eq("candidateId", args.candidateId))
      .collect();
  },
});

export const createDraft = mutation({
  args: {
    candidateId: v.id("hiringCandidates"),
    stage: v.string(),
    stageId: v.optional(v.id("hiringStages")),
    generatedQuestions: v.optional(v.array(v.object({
      category: v.string(),
      question: v.string(),
      signal: v.string(),
    }))),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    return await ctx.db.insert("candidateAssessments", {
      candidateId: args.candidateId,
      stage: args.stage,
      stageId: args.stageId,
      generatedQuestions: args.generatedQuestions,
      status: "draft",
      createdBy: args.createdBy,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const complete = mutation({
  args: {
    id: v.id("candidateAssessments"),
    overallScore: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      overallScore: args.overallScore,
      notes: args.notes,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("candidateAssessments") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Delete progress + evaluations
    const progress = await ctx.db
      .query("candidateCompetencyProgress")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.id))
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
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.id))
      .collect();
    for (const i of interviews) {
      await ctx.db.delete(i._id);
    }

    // Delete portfolio responses
    const portfolios = await ctx.db
      .query("portfolioReviewResponses")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.id))
      .collect();
    for (const p of portfolios) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const updateGeneratedSummary = mutation({
  args: {
    id: v.id("candidateAssessments"),
    generatedSummary: v.object({
      overallNarrative: v.string(),
      strengths: v.array(v.object({
        area: v.string(),
        detail: v.string(),
      })),
      concerns: v.array(v.object({
        area: v.string(),
        question: v.string(),
        rating: v.string(),
        observation: v.string(),
      })),
      hiringRecommendation: v.string(),
      teamFitRating: v.optional(v.string()),
      teamFit: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, {
      generatedSummary: args.generatedSummary,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const updateGeneratedQuestions = mutation({
  args: {
    id: v.id("candidateAssessments"),
    generatedQuestions: v.array(v.object({
      category: v.string(),
      question: v.string(),
      signal: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.patch(args.id, {
      generatedQuestions: args.generatedQuestions,
      updatedAt: new Date().toISOString(),
    });
  },
});
