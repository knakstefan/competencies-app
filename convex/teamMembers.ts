import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("teamMembers")
      .withIndex("by_name")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    startDate: v.string(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("teamMembers", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("teamMembers"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, args) => {
    // Cascade delete: assessments → progress → evaluations
    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.id))
      .collect();

    for (const assessment of assessments) {
      const progressRecords = await ctx.db
        .query("memberCompetencyProgress")
        .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessment._id))
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
      await ctx.db.delete(assessment._id);
    }

    // Also delete orphan progress (no assessment_id)
    const orphanProgress = await ctx.db
      .query("memberCompetencyProgress")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.id))
      .collect();
    for (const progress of orphanProgress) {
      const evals = await ctx.db
        .query("criteriaEvaluations")
        .withIndex("by_progressId", (q) => q.eq("progressId", progress._id))
        .collect();
      for (const ev of evals) {
        await ctx.db.delete(ev._id);
      }
      await ctx.db.delete(progress._id);
    }

    // Delete promotion plans
    const plans = await ctx.db
      .query("promotionPlans")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.id))
      .collect();
    for (const plan of plans) {
      await ctx.db.delete(plan._id);
    }

    await ctx.db.delete(args.id);
  },
});
