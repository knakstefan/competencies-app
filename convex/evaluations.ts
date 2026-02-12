import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForProgress = query({
  args: { progressId: v.id("memberCompetencyProgress") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("criteriaEvaluations")
      .withIndex("by_progressId", (q) => q.eq("progressId", args.progressId))
      .collect();
  },
});

export const listForProgressIds = query({
  args: { progressIds: v.array(v.id("memberCompetencyProgress")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const progressId of args.progressIds) {
      const evals = await ctx.db
        .query("criteriaEvaluations")
        .withIndex("by_progressId", (q) => q.eq("progressId", progressId))
        .collect();
      results.push(...evals);
    }
    return results;
  },
});

export const replaceForProgress = mutation({
  args: {
    progressId: v.id("memberCompetencyProgress"),
    evaluations: v.array(
      v.object({
        criterionText: v.string(),
        evaluation: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete existing
    const existing = await ctx.db
      .query("criteriaEvaluations")
      .withIndex("by_progressId", (q) => q.eq("progressId", args.progressId))
      .collect();
    for (const ev of existing) {
      await ctx.db.delete(ev._id);
    }
    // Insert new
    for (const ev of args.evaluations) {
      await ctx.db.insert("criteriaEvaluations", {
        progressId: args.progressId,
        criterionText: ev.criterionText,
        evaluation: ev.evaluation,
      });
    }
  },
});
