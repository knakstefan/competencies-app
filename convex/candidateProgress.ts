import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForAssessment = query({
  args: { assessmentId: v.id("candidateAssessments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("candidateCompetencyProgress")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();
  },
});

export const listForCandidate = query({
  args: { candidateId: v.id("hiringCandidates") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("candidateCompetencyProgress")
      .withIndex("by_candidateId", (q) => q.eq("candidateId", args.candidateId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    assessmentId: v.id("candidateAssessments"),
    candidateId: v.id("hiringCandidates"),
    subCompetencyId: v.id("subCompetencies"),
    currentLevel: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing
    const existing = await ctx.db
      .query("candidateCompetencyProgress")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();

    const match = existing.find(
      (p) => p.subCompetencyId === args.subCompetencyId
    );

    const now = new Date().toISOString();

    if (match) {
      await ctx.db.patch(match._id, {
        currentLevel: args.currentLevel,
        notes: args.notes,
        updatedAt: now,
      });
      return match._id;
    } else {
      return await ctx.db.insert("candidateCompetencyProgress", {
        ...args,
        assessedAt: now,
        updatedAt: now,
      });
    }
  },
});
