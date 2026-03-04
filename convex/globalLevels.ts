import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuth, requireAdmin } from "./auth.helpers";

const IC_DEFAULT_LEVELS = [
  { key: "p1_entry", label: "P1 Entry", description: "Early Career", orderIndex: 0 },
  { key: "p2_developing", label: "P2 Developing", description: "Emerging Talent", orderIndex: 1 },
  { key: "p3_career", label: "P3 Career", description: "Fully Competent", orderIndex: 2 },
  { key: "p4_advanced", label: "P4 Advanced", description: "Senior/Lead", orderIndex: 3 },
  { key: "p5_principal", label: "P5 Principal", description: "Expert/Authority", orderIndex: 4 },
];

const MANAGEMENT_DEFAULT_LEVELS = [
  { key: "m1_team_lead", label: "M1 Team Lead", description: "Tactical Supervision", orderIndex: 0 },
  { key: "m2_manager", label: "M2 Manager", description: "Operational Management", orderIndex: 1 },
  { key: "m3_director", label: "M3 Director", description: "Strategic Management", orderIndex: 2 },
  { key: "m4_senior_director", label: "M4 Senior Director", description: "Organizational Leadership", orderIndex: 3 },
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("globalLevels").collect();
    return all.sort((a, b) => {
      if (a.type !== b.type) return a.type === "ic" ? -1 : 1;
      return a.orderIndex - b.orderIndex;
    });
  },
});

export const listByType = query({
  args: { type: v.union(v.literal("ic"), v.literal("management")) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("globalLevels")
      .withIndex("by_type_orderIndex", (q) => q.eq("type", args.type))
      .collect();
  },
});

export const checkDeletionSafety = query({
  args: { id: v.id("globalLevels") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const globalLevel = await ctx.db.get(args.id);
    if (!globalLevel) return { safe: false, error: "Level not found", linkedRoles: 0, assignedMembers: 0 };

    // Count linked roleLevels
    const linkedRoleLevels = await ctx.db
      .query("roleLevels")
      .withIndex("by_globalLevelId", (q) => q.eq("globalLevelId", args.id))
      .collect();

    // Count team members assigned to this level's label
    const allMembers = await ctx.db.query("teamMembers").collect();
    const assignedMembers = allMembers.filter((m) => m.role === globalLevel.label);

    return {
      safe: assignedMembers.length === 0,
      linkedRoles: linkedRoleLevels.length,
      assignedMembers: assignedMembers.length,
      error: assignedMembers.length > 0
        ? `${assignedMembers.length} team member(s) are assigned to "${globalLevel.label}". Reassign them before deleting this level.`
        : null,
    };
  },
});

export const create = mutation({
  args: {
    type: v.union(v.literal("ic"), v.literal("management")),
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    orderIndex: v.number(),
    copyFromKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { copyFromKey, ...levelData } = args;

    // Insert the global level
    const globalId = await ctx.db.insert("globalLevels", levelData);

    // Propagate: insert a roleLevel for every role of matching type
    const allRoles = await ctx.db.query("roles").collect();
    const matchingRoles = allRoles.filter((r) => r.type === args.type);

    for (const role of matchingRoles) {
      await ctx.db.insert("roleLevels", {
        roleId: role._id,
        key: args.key,
        label: args.label,
        description: args.description,
        orderIndex: args.orderIndex,
        globalLevelId: globalId,
      });
    }

    // Bulk copy criteria if copyFromKey is specified
    if (copyFromKey) {
      for (const role of matchingRoles) {
        const competencies = await ctx.db
          .query("competencies")
          .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
          .collect();

        for (const comp of competencies) {
          const subs = await ctx.db
            .query("subCompetencies")
            .withIndex("by_competencyId", (q) => q.eq("competencyId", comp._id))
            .collect();

          for (const sub of subs) {
            if (sub.levelCriteria && sub.levelCriteria[copyFromKey]) {
              const newCriteria = { ...sub.levelCriteria, [args.key]: [...sub.levelCriteria[copyFromKey]] };
              await ctx.db.patch(sub._id, { levelCriteria: newCriteria });
            }
          }
        }
      }
    }

    return globalId;
  },
});

export const update = mutation({
  args: {
    id: v.id("globalLevels"),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Global level not found");

    const oldLabel = existing.label;

    // Patch the global level (key is immutable)
    await ctx.db.patch(id, fields);

    // Propagate to all linked roleLevels
    const linked = await ctx.db
      .query("roleLevels")
      .withIndex("by_globalLevelId", (q) => q.eq("globalLevelId", id))
      .collect();

    for (const rl of linked) {
      const patch: Record<string, string | undefined> = {};
      if (args.label !== undefined) patch.label = args.label;
      if (args.description !== undefined) patch.description = args.description;
      await ctx.db.patch(rl._id, patch);
    }

    // If label changed, update team members' role strings
    if (args.label && args.label !== oldLabel) {
      const allMembers = await ctx.db.query("teamMembers").collect();
      for (const member of allMembers) {
        if (member.role === oldLabel) {
          await ctx.db.patch(member._id, { role: args.label });
        }
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("globalLevels") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const globalLevel = await ctx.db.get(args.id);
    if (!globalLevel) throw new Error("Global level not found");

    // Safety check: block if members are assigned
    const allMembers = await ctx.db.query("teamMembers").collect();
    const assigned = allMembers.filter((m) => m.role === globalLevel.label);
    if (assigned.length > 0) {
      throw new Error(
        `Cannot delete: ${assigned.length} team member(s) are assigned to "${globalLevel.label}". Reassign them first.`
      );
    }

    // Delete all linked roleLevels
    const linked = await ctx.db
      .query("roleLevels")
      .withIndex("by_globalLevelId", (q) => q.eq("globalLevelId", args.id))
      .collect();
    for (const rl of linked) {
      await ctx.db.delete(rl._id);
    }

    // Clean up orphaned levelCriteria keys in sub-competencies
    // Find all roles of matching type to scope the cleanup
    const allRoles = await ctx.db.query("roles").collect();
    const matchingRoles = allRoles.filter((r) => r.type === globalLevel.type);
    for (const role of matchingRoles) {
      const competencies = await ctx.db
        .query("competencies")
        .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
        .collect();
      for (const comp of competencies) {
        const subs = await ctx.db
          .query("subCompetencies")
          .withIndex("by_competencyId", (q) => q.eq("competencyId", comp._id))
          .collect();
        for (const sub of subs) {
          if (sub.levelCriteria && sub.levelCriteria[globalLevel.key]) {
            const { [globalLevel.key]: _, ...rest } = sub.levelCriteria;
            await ctx.db.patch(sub._id, { levelCriteria: rest });
          }
        }
      }
    }

    // Delete the global level
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("globalLevels"),
        orderIndex: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (const update of args.updates) {
      await ctx.db.patch(update.id, { orderIndex: update.orderIndex });

      // Propagate to linked roleLevels
      const linked = await ctx.db
        .query("roleLevels")
        .withIndex("by_globalLevelId", (q) => q.eq("globalLevelId", update.id))
        .collect();
      for (const rl of linked) {
        await ctx.db.patch(rl._id, { orderIndex: update.orderIndex });
      }
    }
  },
});

export const seedFromHardcoded = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Idempotent: check if global levels already exist
    const existing = await ctx.db.query("globalLevels").collect();
    if (existing.length > 0) {
      return { message: "Global levels already seeded", count: existing.length };
    }

    // Insert IC levels
    const icIds: Record<string, Id<"globalLevels">> = {};
    for (const level of IC_DEFAULT_LEVELS) {
      const id = await ctx.db.insert("globalLevels", { ...level, type: "ic" as const });
      icIds[level.key] = id;
    }

    // Insert Management levels
    const mgmtIds: Record<string, Id<"globalLevels">> = {};
    for (const level of MANAGEMENT_DEFAULT_LEVELS) {
      const id = await ctx.db.insert("globalLevels", { ...level, type: "management" as const });
      mgmtIds[level.key] = id;
    }

    // Patch existing roleLevels to link them
    const allRoleLevels = await ctx.db.query("roleLevels").collect();
    let linked = 0;
    for (const rl of allRoleLevels) {
      const role = await ctx.db.get(rl.roleId);
      if (!role) continue;

      const idMap = role.type === "management" ? mgmtIds : icIds;
      const globalId = idMap[rl.key];
      if (globalId) {
        await ctx.db.patch(rl._id, { globalLevelId: globalId });
        linked++;
      }
    }

    return {
      message: `Seeded ${IC_DEFAULT_LEVELS.length + MANAGEMENT_DEFAULT_LEVELS.length} global levels, linked ${linked} role levels`,
      icCount: IC_DEFAULT_LEVELS.length,
      mgmtCount: MANAGEMENT_DEFAULT_LEVELS.length,
      linked,
    };
  },
});
