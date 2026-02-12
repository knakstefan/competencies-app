import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForAssessment = query({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memberCompetencyProgress")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();
  },
});

export const listForMember = query({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memberCompetencyProgress")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    assessmentId: v.id("assessments"),
    memberId: v.id("teamMembers"),
    subCompetencyId: v.id("subCompetencies"),
    currentLevel: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing progress for this assessment + sub-competency
    const existing = await ctx.db
      .query("memberCompetencyProgress")
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
      return await ctx.db.insert("memberCompetencyProgress", {
        assessmentId: args.assessmentId,
        memberId: args.memberId,
        subCompetencyId: args.subCompetencyId,
        currentLevel: args.currentLevel,
        notes: args.notes,
        assessedAt: now,
        updatedAt: now,
      });
    }
  },
});

export const batchCreate = mutation({
  args: {
    records: v.array(
      v.object({
        assessmentId: v.id("assessments"),
        memberId: v.id("teamMembers"),
        subCompetencyId: v.id("subCompetencies"),
        currentLevel: v.string(),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const ids = [];
    for (const record of args.records) {
      const id = await ctx.db.insert("memberCompetencyProgress", {
        ...record,
        assessedAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }
    return ids;
  },
});
