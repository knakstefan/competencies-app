import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForAssessment = query({
  args: { assessmentId: v.id("candidateAssessments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("portfolioReviewResponses")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    assessmentId: v.id("candidateAssessments"),
    candidateId: v.id("hiringCandidates"),
    competencyArea: v.string(),
    subCompetencyTitle: v.string(),
    questionIndex: v.number(),
    questionText: v.string(),
    competencyLevel: v.optional(v.string()),
    responseNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing by assessment + question index
    const existing = await ctx.db
      .query("portfolioReviewResponses")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();

    const match = existing.find((r) => r.questionIndex === args.questionIndex);

    if (match) {
      await ctx.db.patch(match._id, {
        competencyLevel: args.competencyLevel,
        responseNotes: args.responseNotes,
      });
      return match._id;
    } else {
      return await ctx.db.insert("portfolioReviewResponses", args);
    }
  },
});
