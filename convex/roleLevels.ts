import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

const OLD_TO_NEW_KEY_MAP: Record<string, string> = {
  associate: "p1_entry",
  intermediate: "p2_developing",
  senior: "p3_career",
  lead: "p4_advanced",
  principal: "p5_principal",
};

export const listByRole = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roleLevels")
      .withIndex("by_roleId_orderIndex", (q) => q.eq("roleId", args.roleId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("roleLevels") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    roleId: v.id("roles"),
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    orderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("roleLevels", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("roleLevels"),
    key: v.optional(v.string()),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    orderIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("roleLevels") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateOrder = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("roleLevels"),
        orderIndex: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      await ctx.db.patch(update.id, { orderIndex: update.orderIndex });
    }
  },
});

export const seedDefaultLevels = mutation({
  args: {
    roleId: v.id("roles"),
    roleType: v.optional(v.union(v.literal("ic"), v.literal("management"))),
  },
  handler: async (ctx, args) => {
    // Idempotent: check if levels already exist for this role
    const existing = await ctx.db
      .query("roleLevels")
      .withIndex("by_roleId", (q) => q.eq("roleId", args.roleId))
      .collect();

    if (existing.length > 0) {
      return { message: "Levels already exist for this role", count: existing.length };
    }

    // Determine role type from arg or by querying the role
    let type = args.roleType;
    if (!type) {
      const role = await ctx.db.get(args.roleId);
      type = role?.type || "ic";
    }

    const defaults = type === "management" ? MANAGEMENT_DEFAULT_LEVELS : IC_DEFAULT_LEVELS;

    for (const level of defaults) {
      await ctx.db.insert("roleLevels", {
        roleId: args.roleId,
        ...level,
      });
    }

    return { message: "Default levels seeded", count: defaults.length };
  },
});

const LEGACY_KEY_TO_COLUMN: Record<string, string> = {
  associate: "associateLevel",
  intermediate: "intermediateLevel",
  senior: "seniorLevel",
  lead: "leadLevel",
  principal: "principalLevel",
};

export const migrateFromHardcoded = mutation({
  args: {},
  handler: async (ctx) => {
    let rolesSeeded = 0;
    let subsPatched = 0;

    // 1. For each role without roleLevels, seed the correct defaults based on type
    const allRoles = await ctx.db.query("roles").collect();
    for (const role of allRoles) {
      const existing = await ctx.db
        .query("roleLevels")
        .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
        .collect();

      if (existing.length === 0) {
        const defaults = role.type === "management" ? MANAGEMENT_DEFAULT_LEVELS : IC_DEFAULT_LEVELS;
        for (const level of defaults) {
          await ctx.db.insert("roleLevels", {
            roleId: role._id,
            ...level,
          });
        }
        rolesSeeded++;
      }
    }

    // 2. For each subCompetency without levelCriteria, build it from old columns
    const allSubs = await ctx.db.query("subCompetencies").collect();
    for (const sub of allSubs) {
      if (!sub.levelCriteria) {
        const levelCriteria: Record<string, string[]> = {};
        for (const [key, column] of Object.entries(LEGACY_KEY_TO_COLUMN)) {
          const criteria = (sub as any)[column];
          if (Array.isArray(criteria)) {
            levelCriteria[key] = criteria;
          }
        }

        if (Object.keys(levelCriteria).length > 0) {
          await ctx.db.patch(sub._id, { levelCriteria });
          subsPatched++;
        }
      }
    }

    return {
      message: `Migration complete. Seeded ${rolesSeeded} roles, patched ${subsPatched} sub-competencies.`,
      rolesSeeded,
      subsPatched,
    };
  },
});

/** Remap old-format levelCriteria keys (associate, intermediate, etc.) to new IC keys (p1_entry, p2_developing, etc.) */
export const migrateKeysToNewFormat = mutation({
  args: {},
  handler: async (ctx) => {
    let subsPatched = 0;
    const oldKeys = Object.keys(OLD_TO_NEW_KEY_MAP);

    const allSubs = await ctx.db.query("subCompetencies").collect();
    for (const sub of allSubs) {
      if (!sub.levelCriteria) continue;

      const hasOldKeys = Object.keys(sub.levelCriteria).some((k) => oldKeys.includes(k));
      if (!hasOldKeys) continue;

      const newCriteria: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(sub.levelCriteria)) {
        const newKey = OLD_TO_NEW_KEY_MAP[key];
        if (newKey) {
          newCriteria[newKey] = value;
        } else {
          // Keep non-legacy keys as-is (e.g., already-migrated or management keys)
          newCriteria[key] = value;
        }
      }

      await ctx.db.patch(sub._id, { levelCriteria: newCriteria });
      subsPatched++;
    }

    return {
      message: `Key migration complete. Patched ${subsPatched} sub-competencies.`,
      subsPatched,
    };
  },
});

export const verifyMigration = query({
  args: {},
  handler: async (ctx) => {
    const issues: string[] = [];

    // Check every role has roleLevels entries
    const allRoles = await ctx.db.query("roles").collect();
    for (const role of allRoles) {
      const levels = await ctx.db
        .query("roleLevels")
        .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
        .collect();
      if (levels.length === 0) {
        issues.push(`Role "${role.title}" (${role._id}) has no roleLevels`);
      }
    }

    // Check every subCompetency has non-null levelCriteria
    const allSubs = await ctx.db.query("subCompetencies").collect();
    for (const sub of allSubs) {
      if (!sub.levelCriteria) {
        issues.push(`SubCompetency "${sub.title}" (${sub._id}) has no levelCriteria`);
      }
    }

    return {
      pass: issues.length === 0,
      issues,
      rolesChecked: allRoles.length,
      subsChecked: allSubs.length,
    };
  },
});
