import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireEditor } from "./auth.helpers";

export const getForRoleLevel = query({
  args: { roleId: v.id("roles"), levelKey: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("jobDescriptions")
      .withIndex("by_roleId_levelKey", (q) =>
        q.eq("roleId", args.roleId).eq("levelKey", args.levelKey)
      )
      .unique();
  },
});

export const listForRole = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("jobDescriptions")
      .withIndex("by_roleId", (q) => q.eq("roleId", args.roleId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    roleId: v.id("roles"),
    levelKey: v.string(),
    levelLabel: v.string(),
    content: v.any(),
    generatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    const existing = await ctx.db
      .query("jobDescriptions")
      .withIndex("by_roleId_levelKey", (q) =>
        q.eq("roleId", args.roleId).eq("levelKey", args.levelKey)
      )
      .unique();

    if (existing) {
      await ctx.db.replace(existing._id, {
        roleId: args.roleId,
        levelKey: args.levelKey,
        levelLabel: args.levelLabel,
        content: args.content,
        generatedAt: new Date().toISOString(),
        generatedBy: args.generatedBy,
      });
      return existing._id;
    }

    return await ctx.db.insert("jobDescriptions", {
      roleId: args.roleId,
      levelKey: args.levelKey,
      levelLabel: args.levelLabel,
      content: args.content,
      generatedAt: new Date().toISOString(),
      generatedBy: args.generatedBy,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("jobDescriptions") },
  handler: async (ctx, args) => {
    await requireEditor(ctx);
    await ctx.db.delete(args.id);
  },
});
