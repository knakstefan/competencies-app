import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuth, requireAdmin } from "./auth.helpers";

const DEFAULT_STAGES = [
  {
    title: "Recruiter Interview",
    description: "Initial screen to assess motivation, communication, career trajectory, and basic role alignment.",
    stageType: "ai_interview",
    aiInstructions: `You are generating questions for a RECRUITER SCREEN — the first conversation in the hiring process. This is NOT a deep technical or craft interview.

FOCUS AREAS:
- Motivation & Interest: Why this company, why this role, what excites them about the opportunity
- Career Narrative: How their career path led them here, key transitions, what they learned
- Communication & Presence: Can they articulate ideas clearly and concisely?
- Role Understanding: Do they understand what the role entails at this level?
- Cultural Signals: Work style preferences, team dynamics they thrive in, values alignment
- Logistics & Expectations: Timeline, compensation expectations, location/remote preferences

QUESTION STYLE:
- Conversational and warm — this is a first impression for both sides
- Open-ended but not overly complex
- 1-2 behavioral questions max, the rest should be exploratory/conversational
- Include at least one question that lets the candidate ask about the company/team

DO NOT generate deeply technical, craft-specific, or leadership-depth questions — those belong in later stages.

CATEGORIES to use: Motivation, Career Background, Role Fit, Culture & Values, Candidate Questions`,
    orderIndex: 0,
  },
  {
    title: "Manager Interview",
    description: "Hiring manager deep-dive into craft and process, leadership approach, collaboration patterns, and competency alignment.",
    stageType: "ai_interview",
    aiInstructions: `You are generating questions for the HIRING MANAGER INTERVIEW — the core evaluation stage where the manager assesses the candidate's depth across role competencies.

FOCUS AREAS:
- Process & Thinking: How they approach ambiguous problems, their end-to-end workflow, how they scope and prioritize work
- Collaboration & Influence: How they work with cross-functional partners and stakeholders; how they navigate disagreements; how they build alignment
- Leadership & Growth (scaled to level): For junior roles — learning and initiative; for senior roles — mentorship, strategy, and organizational influence
- Competency Depth: Directly probe the competency areas defined in the role's framework. Reference specific competencies when generating questions.
- Self-Awareness: How they talk about failures, gaps, and growth areas
- Impact & Outcomes: Concrete examples of work that drove measurable results

QUESTION STYLE:
- Behavioral (STAR format) — ask for specific examples, not hypotheticals
- Probe follow-ups: For each major question, include a suggested follow-up signal that digs deeper
- Scale difficulty to the candidate's target level
- At least 2-3 questions should directly reference competency areas from the role's framework

CATEGORIES to use: Process & Craft, Collaboration & Influence, Leadership & Mentorship, Impact & Outcomes, Self-Awareness & Growth`,
    orderIndex: 1,
  },
  {
    title: "Team Interview",
    description: "Peer-led assessment of day-to-day collaboration, craft depth, feedback dynamics, and team chemistry.",
    stageType: "ai_interview",
    aiInstructions: `You are generating questions for a TEAM INTERVIEW — where current team members assess what it would be like to work with this candidate day-to-day.

FOCUS AREAS:
- Working Style: How they collaborate in cross-functional teams, their communication cadence, how they handle fast-moving environments
- Craft & Execution: Depth of domain skills, attention to detail, how they approach quality vs. speed tradeoffs
- Feedback & Critique: How they give and receive feedback on their work, how they handle pushback
- Problem-Solving: How they break down complex problems, their approach to constraints and edge cases
- Team Dynamics: How they handle conflict, support teammates, contribute to team culture
- Adaptability: How they respond to changing requirements, ambiguity, or shifting priorities

QUESTION STYLE:
- Scenario-based and practical — "Walk me through how you would..." or "Tell me about a time when..."
- Questions should feel natural for a peer to ask (not overly formal or managerial)
- Include questions that reveal how the candidate would fit into existing team workflows
- At least one question about how they handle disagreement with a teammate or stakeholder
- At least one question about their approach to giving or receiving critique

CATEGORIES to use: Collaboration, Craft & Quality, Feedback & Communication, Problem-Solving, Team Dynamics`,
    orderIndex: 2,
  },
  {
    title: "Bar Raiser Interview",
    description: "Senior cross-functional evaluator ensuring the candidate raises the overall quality bar of the team.",
    stageType: "ai_interview",
    aiInstructions: `You are generating questions for a BAR RAISER INTERVIEW — a senior evaluator (often from outside the immediate team) who assesses whether this candidate genuinely raises the bar for the organization.

FOCUS AREAS:
- Strategic Thinking: Can they see beyond the immediate task? Do they think in systems, not just individual deliverables?
- Judgment & Decision-Making: How do they make decisions with incomplete information? What tradeoffs do they navigate?
- Growth Trajectory: Where are they headed? Do they have the intellectual curiosity and drive to keep growing?
- Culture Add (not just fit): What unique perspectives, skills, or experiences do they bring that the team doesn't already have?
- Resilience & Integrity: How do they handle failure, setbacks, or ethical dilemmas in their work?
- Red Flag Detection: Questions designed to surface potential concerns — over-reliance on process, inability to articulate impact, lack of ownership

QUESTION STYLE:
- Challenging but fair — these questions should make the candidate think, not trick them
- Hypothetical/situational questions are appropriate here (unlike earlier stages)
- Include at least one "pressure test" question that requires the candidate to defend a position or make a tough call
- Include at least one question that probes intellectual curiosity or learning orientation
- Signals should clearly distinguish between "meets bar" and "raises bar" answers

CATEGORIES to use: Strategic Thinking, Judgment & Decision-Making, Growth & Curiosity, Culture Add, Resilience & Integrity`,
    orderIndex: 3,
  },
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("globalStages").collect();
    return all.sort((a, b) => a.orderIndex - b.orderIndex);
  },
});

export const checkDeletionSafety = query({
  args: { id: v.id("globalStages") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const stage = await ctx.db.get(args.id);
    if (!stage) return { safe: false, error: "Stage not found", linkedRoles: 0, activeCandidates: 0 };

    // Count linked hiringStages
    const linkedStages = await ctx.db
      .query("hiringStages")
      .withIndex("by_globalStageId", (q) => q.eq("globalStageId", args.id))
      .collect();

    // Count active candidates on any of these linked stages
    let activeCandidates = 0;
    for (const hs of linkedStages) {
      const candidates = await ctx.db
        .query("hiringCandidates")
        .withIndex("by_currentStage", (q) => q.eq("currentStage", hs._id))
        .collect();
      activeCandidates += candidates.length;
    }

    return {
      safe: activeCandidates === 0,
      linkedRoles: linkedStages.length,
      activeCandidates,
      error: activeCandidates > 0
        ? `${activeCandidates} active candidate(s) are on this stage. Move them to another stage before deleting.`
        : null,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    stageType: v.string(),
    aiInstructions: v.optional(v.string()),
    gateMinScore: v.optional(v.number()),
    gateMinRatedPct: v.optional(v.number()),
    orderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const globalId = await ctx.db.insert("globalStages", args);

    // Propagate: insert a hiringStage for every role
    const allRoles = await ctx.db.query("roles").collect();
    for (const role of allRoles) {
      await ctx.db.insert("hiringStages", {
        roleId: role._id,
        title: args.title,
        description: args.description,
        stageType: args.stageType,
        aiInstructions: args.aiInstructions,
        gateMinScore: args.gateMinScore,
        gateMinRatedPct: args.gateMinRatedPct,
        orderIndex: args.orderIndex,
        globalStageId: globalId,
      });
    }

    return globalId;
  },
});

export const update = mutation({
  args: {
    id: v.id("globalStages"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    aiInstructions: v.optional(v.string()),
    gateMinScore: v.optional(v.number()),
    gateMinRatedPct: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Global stage not found");

    await ctx.db.patch(id, fields);

    // Propagate to all linked hiringStages
    const linked = await ctx.db
      .query("hiringStages")
      .withIndex("by_globalStageId", (q) => q.eq("globalStageId", id))
      .collect();

    for (const hs of linked) {
      await ctx.db.patch(hs._id, fields);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("globalStages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const stage = await ctx.db.get(args.id);
    if (!stage) throw new Error("Global stage not found");

    // Safety check: block if active candidates on this stage
    const linked = await ctx.db
      .query("hiringStages")
      .withIndex("by_globalStageId", (q) => q.eq("globalStageId", args.id))
      .collect();

    for (const hs of linked) {
      const candidates = await ctx.db
        .query("hiringCandidates")
        .withIndex("by_currentStage", (q) => q.eq("currentStage", hs._id))
        .collect();
      if (candidates.length > 0) {
        throw new Error(
          `Cannot delete: active candidates are on this stage. Move them to another stage first.`
        );
      }
    }

    // Delete all linked hiringStages
    for (const hs of linked) {
      await ctx.db.delete(hs._id);
    }

    // Delete the global stage
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("globalStages"),
        orderIndex: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (const update of args.updates) {
      await ctx.db.patch(update.id, { orderIndex: update.orderIndex });

      // Propagate to linked hiringStages
      const linked = await ctx.db
        .query("hiringStages")
        .withIndex("by_globalStageId", (q) => q.eq("globalStageId", update.id))
        .collect();
      for (const hs of linked) {
        await ctx.db.patch(hs._id, { orderIndex: update.orderIndex });
      }
    }
  },
});

export const seedFromHardcoded = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Idempotent
    const existing = await ctx.db.query("globalStages").collect();
    if (existing.length > 0) {
      return { message: "Global stages already seeded", count: existing.length };
    }

    const idsByTitle: Record<string, Id<"globalStages">> = {};
    for (const stage of DEFAULT_STAGES) {
      const id = await ctx.db.insert("globalStages", stage);
      idsByTitle[stage.title] = id;
    }

    // Link existing hiringStages by matching title
    const allHiringStages = await ctx.db.query("hiringStages").collect();
    let linked = 0;
    for (const hs of allHiringStages) {
      const globalId = idsByTitle[hs.title];
      if (globalId) {
        await ctx.db.patch(hs._id, { globalStageId: globalId });
        linked++;
      }
    }

    return {
      message: `Seeded ${DEFAULT_STAGES.length} global stages, linked ${linked} hiring stages`,
      count: DEFAULT_STAGES.length,
      linked,
    };
  },
});
