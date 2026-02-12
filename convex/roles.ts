import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("roles")
      .withIndex("by_orderIndex")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("roles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getWithStats = query({
  args: { id: v.id("roles") },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.id);
    if (!role) return null;

    const competencies = await ctx.db
      .query("competencies")
      .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
      .collect();
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
      .collect();
    const candidates = await ctx.db
      .query("hiringCandidates")
      .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
      .collect();

    return {
      ...role,
      competencyCount: competencies.length,
      memberCount: members.length,
      candidateCount: candidates.length,
    };
  },
});

export const listWithStats = query({
  args: {},
  handler: async (ctx) => {
    const roles = await ctx.db
      .query("roles")
      .withIndex("by_orderIndex")
      .collect();

    return Promise.all(
      roles.map(async (role) => {
        const competencies = await ctx.db
          .query("competencies")
          .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
          .collect();
        const members = await ctx.db
          .query("teamMembers")
          .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
          .collect();
        const candidates = await ctx.db
          .query("hiringCandidates")
          .withIndex("by_roleId", (q) => q.eq("roleId", role._id))
          .collect();

        return {
          ...role,
          competencyCount: competencies.length,
          memberCount: members.length,
          candidateCount: candidates.length,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    type: v.union(v.literal("ic"), v.literal("management")),
    description: v.optional(v.string()),
    orderIndex: v.number(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("roles", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("roles"),
    title: v.optional(v.string()),
    type: v.optional(v.union(v.literal("ic"), v.literal("management"))),
    description: v.optional(v.string()),
    orderIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("roles") },
  handler: async (ctx, args) => {
    // Cascade delete all scoped data

    // Delete competencies and their sub-competencies
    const competencies = await ctx.db
      .query("competencies")
      .withIndex("by_roleId", (q) => q.eq("roleId", args.id))
      .collect();
    for (const comp of competencies) {
      const subs = await ctx.db
        .query("subCompetencies")
        .withIndex("by_competencyId", (q) => q.eq("competencyId", comp._id))
        .collect();
      for (const sub of subs) {
        await ctx.db.delete(sub._id);
      }
      await ctx.db.delete(comp._id);
    }

    // Delete team members and their cascade data
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_roleId", (q) => q.eq("roleId", args.id))
      .collect();
    for (const member of members) {
      const assessments = await ctx.db
        .query("assessments")
        .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
        .collect();
      for (const assessment of assessments) {
        const progress = await ctx.db
          .query("memberCompetencyProgress")
          .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessment._id))
          .collect();
        for (const p of progress) {
          const evals = await ctx.db
            .query("criteriaEvaluations")
            .withIndex("by_progressId", (q) => q.eq("progressId", p._id))
            .collect();
          for (const ev of evals) {
            await ctx.db.delete(ev._id);
          }
          await ctx.db.delete(p._id);
        }
        await ctx.db.delete(assessment._id);
      }
      // Delete orphan progress
      const orphanProgress = await ctx.db
        .query("memberCompetencyProgress")
        .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
        .collect();
      for (const p of orphanProgress) {
        const evals = await ctx.db
          .query("criteriaEvaluations")
          .withIndex("by_progressId", (q) => q.eq("progressId", p._id))
          .collect();
        for (const ev of evals) {
          await ctx.db.delete(ev._id);
        }
        await ctx.db.delete(p._id);
      }
      // Delete promotion plans
      const plans = await ctx.db
        .query("promotionPlans")
        .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
        .collect();
      for (const plan of plans) {
        await ctx.db.delete(plan._id);
      }
      await ctx.db.delete(member._id);
    }

    // Delete hiring candidates and their cascade data
    const candidates = await ctx.db
      .query("hiringCandidates")
      .withIndex("by_roleId", (q) => q.eq("roleId", args.id))
      .collect();
    for (const candidate of candidates) {
      const assessments = await ctx.db
        .query("candidateAssessments")
        .withIndex("by_candidateId", (q) => q.eq("candidateId", candidate._id))
        .collect();
      for (const assessment of assessments) {
        const progress = await ctx.db
          .query("candidateCompetencyProgress")
          .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessment._id))
          .collect();
        for (const p of progress) {
          const evals = await ctx.db
            .query("candidateCriteriaEvaluations")
            .withIndex("by_progressId", (q) => q.eq("progressId", p._id))
            .collect();
          for (const ev of evals) {
            await ctx.db.delete(ev._id);
          }
          await ctx.db.delete(p._id);
        }
        const interviews = await ctx.db
          .query("managerInterviewResponses")
          .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessment._id))
          .collect();
        for (const i of interviews) {
          await ctx.db.delete(i._id);
        }
        const portfolios = await ctx.db
          .query("portfolioReviewResponses")
          .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessment._id))
          .collect();
        for (const p of portfolios) {
          await ctx.db.delete(p._id);
        }
        await ctx.db.delete(assessment._id);
      }
      await ctx.db.delete(candidate._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const migrateExistingData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if any roles already exist
    const existingRoles = await ctx.db.query("roles").collect();
    if (existingRoles.length > 0) {
      return { message: "Migration already run - roles exist" };
    }

    // Create default "Product Designer" role
    const roleId = await ctx.db.insert("roles", {
      title: "Product Designer",
      type: "ic",
      description: "A complete set of competencies for the Product Designer role.",
      orderIndex: 1,
    });

    // Patch all competencies
    const competencies = await ctx.db.query("competencies").collect();
    for (const comp of competencies) {
      await ctx.db.patch(comp._id, { roleId });
    }

    // Patch all team members
    const members = await ctx.db.query("teamMembers").collect();
    for (const member of members) {
      await ctx.db.patch(member._id, { roleId });
    }

    // Patch all hiring candidates
    const candidates = await ctx.db.query("hiringCandidates").collect();
    for (const candidate of candidates) {
      await ctx.db.patch(candidate._id, { roleId });
    }

    return {
      message: `Migration complete. Created role "${roleId}" and patched ${competencies.length} competencies, ${members.length} members, ${candidates.length} candidates.`,
    };
  },
});
