import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listForMember = query({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assessments")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .collect();
  },
});

export const getCompletedForMember = query({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("assessments")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .collect();
    return all
      .filter((a) => a.status === "completed")
      .sort((a, b) => {
        const aTime = a.completedAt || a._creationTime.toString();
        const bTime = b.completedAt || b._creationTime.toString();
        return aTime.localeCompare(bTime);
      });
  },
});

export const getAllCompleted = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("assessments")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();
    return all.sort((a, b) => {
      const aTime = b.completedAt || "";
      const bTime = a.completedAt || "";
      // Most recent first
      return aTime.localeCompare(bTime);
    });
  },
});

export const createDraft = mutation({
  args: {
    memberId: v.id("teamMembers"),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assessments", {
      memberId: args.memberId,
      createdBy: args.createdBy,
      status: "draft",
      updatedAt: new Date().toISOString(),
    });
  },
});

export const complete = mutation({
  args: {
    id: v.id("assessments"),
    overallScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      overallScore: args.overallScore,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("assessments") },
  handler: async (ctx, args) => {
    // Cascade: evaluations → progress → assessment
    const progressRecords = await ctx.db
      .query("memberCompetencyProgress")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.id))
      .collect();
    for (const progress of progressRecords) {
      const evals = await ctx.db
        .query("criteriaEvaluations")
        .withIndex("by_progressId", (q) => q.eq("progressId", progress._id))
        .collect();
      for (const ev of evals) {
        await ctx.db.delete(ev._id);
      }
      await ctx.db.delete(progress._id);
    }
    await ctx.db.delete(args.id);
  },
});
