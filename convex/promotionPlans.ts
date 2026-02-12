import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getLatestForMember = query({
  args: { memberId: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("promotionPlans")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .collect();
    if (plans.length === 0) return null;
    // Sort by generatedAt descending, return latest
    plans.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    return plans[0];
  },
});

export const create = mutation({
  args: {
    memberId: v.id("teamMembers"),
    memberCurrentRole: v.string(),
    targetLevel: v.string(),
    planContent: v.any(),
    generatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promotionPlans", {
      ...args,
      generatedAt: new Date().toISOString(),
    });
  },
});
