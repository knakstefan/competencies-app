import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("competencies")
      .withIndex("by_orderIndex")
      .collect();
  },
});

export const listSubCompetencies = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("subCompetencies")
      .withIndex("by_orderIndex")
      .collect();
  },
});

export const listSubCompetenciesByCompetency = query({
  args: { competencyId: v.id("competencies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subCompetencies")
      .withIndex("by_competencyId", (q) => q.eq("competencyId", args.competencyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    orderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("competencies", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("competencies"),
    title: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    orderIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("competencies") },
  handler: async (ctx, args) => {
    // Delete all sub-competencies first
    const subs = await ctx.db
      .query("subCompetencies")
      .withIndex("by_competencyId", (q) => q.eq("competencyId", args.id))
      .collect();
    for (const sub of subs) {
      await ctx.db.delete(sub._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const updateOrder = mutation({
  args: {
    updates: v.array(v.object({
      id: v.id("competencies"),
      orderIndex: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      await ctx.db.patch(update.id, { orderIndex: update.orderIndex });
    }
  },
});

export const createSub = mutation({
  args: {
    competencyId: v.id("competencies"),
    title: v.string(),
    code: v.optional(v.string()),
    orderIndex: v.number(),
    associateLevel: v.optional(v.array(v.string())),
    intermediateLevel: v.optional(v.array(v.string())),
    seniorLevel: v.optional(v.array(v.string())),
    leadLevel: v.optional(v.array(v.string())),
    principalLevel: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("subCompetencies", args);
  },
});

export const updateSub = mutation({
  args: {
    id: v.id("subCompetencies"),
    title: v.optional(v.string()),
    code: v.optional(v.string()),
    orderIndex: v.optional(v.number()),
    associateLevel: v.optional(v.array(v.string())),
    intermediateLevel: v.optional(v.array(v.string())),
    seniorLevel: v.optional(v.array(v.string())),
    leadLevel: v.optional(v.array(v.string())),
    principalLevel: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const removeSub = mutation({
  args: { id: v.id("subCompetencies") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateSubOrder = mutation({
  args: {
    updates: v.array(v.object({
      id: v.id("subCompetencies"),
      orderIndex: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      await ctx.db.patch(update.id, { orderIndex: update.orderIndex });
    }
  },
});

export const bulkImport = mutation({
  args: {
    competencies: v.array(v.object({
      title: v.string(),
      code: v.optional(v.string()),
      description: v.optional(v.string()),
      orderIndex: v.number(),
      subCompetencies: v.array(v.object({
        title: v.string(),
        code: v.optional(v.string()),
        orderIndex: v.number(),
        associateLevel: v.optional(v.array(v.string())),
        intermediateLevel: v.optional(v.array(v.string())),
        seniorLevel: v.optional(v.array(v.string())),
        leadLevel: v.optional(v.array(v.string())),
        principalLevel: v.optional(v.array(v.string())),
      })),
    })),
  },
  handler: async (ctx, args) => {
    for (const comp of args.competencies) {
      const { subCompetencies, ...compData } = comp;
      const compId = await ctx.db.insert("competencies", compData);
      for (const sub of subCompetencies) {
        await ctx.db.insert("subCompetencies", {
          ...sub,
          competencyId: compId,
        });
      }
    }
  },
});
