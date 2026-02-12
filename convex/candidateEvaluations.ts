import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForProgress = query({
  args: { progressId: v.id("candidateCompetencyProgress") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("candidateCriteriaEvaluations")
      .withIndex("by_progressId", (q) => q.eq("progressId", args.progressId))
      .collect();
  },
});

export const replaceForProgress = mutation({
  args: {
    progressId: v.id("candidateCompetencyProgress"),
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
      .query("candidateCriteriaEvaluations")
      .withIndex("by_progressId", (q) => q.eq("progressId", args.progressId))
      .collect();
    for (const ev of existing) {
      await ctx.db.delete(ev._id);
    }
    // Insert new
    for (const ev of args.evaluations) {
      await ctx.db.insert("candidateCriteriaEvaluations", {
        progressId: args.progressId,
        criterionText: ev.criterionText,
        evaluation: ev.evaluation,
      });
    }
  },
});
