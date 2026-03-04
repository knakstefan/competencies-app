import { query } from "./_generated/server";
import { requireAuth } from "./auth.helpers";

export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const roles = await ctx.db.query("roles").withIndex("by_orderIndex").collect();
    const allMembers = await ctx.db.query("teamMembers").collect();
    const allCandidates = await ctx.db.query("hiringCandidates").collect();
    const allCompetencies = await ctx.db.query("competencies").collect();
    const allStages = await ctx.db.query("hiringStages").collect();
    const stageMap = new Map(allStages.map((s) => [s._id as string, s]));

    // Team snapshot: each member with last assessment info
    const teamSnapshot = await Promise.all(
      allMembers.map(async (member) => {
        const assessments = await ctx.db
          .query("assessments")
          .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
          .collect();

        const completed = assessments.filter((a) => a.status === "completed");
        const latest = completed.length > 0
          ? completed.sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))[0]
          : null;

        const inProgress = assessments.find((a) => a.status === "draft");
        const role = member.roleId ? await ctx.db.get(member.roleId) : null;

        return {
          _id: member._id,
          name: member.name,
          level: member.role,
          roleId: member.roleId,
          roleTitle: role?.title ?? null,
          lastAssessmentDate: latest?.completedAt ?? null,
          hasInProgress: !!inProgress,
          assessmentCount: completed.length,
        };
      })
    );

    // Active candidates with stage info
    const activeCandidates = allCandidates.filter(
      (c) => c.currentStage !== "hired" && c.currentStage !== "rejected"
    );

    const hiringPipeline = await Promise.all(
      activeCandidates.map(async (candidate) => {
        const assessments = await ctx.db
          .query("candidateAssessments")
          .withIndex("by_candidateId", (q) => q.eq("candidateId", candidate._id))
          .collect();

        const currentStageAssessment = assessments.find(
          (a) => a.stage === candidate.currentStage && a.status === "completed"
        );

        const stage = stageMap.get(candidate.currentStage);
        const role = candidate.roleId ? await ctx.db.get(candidate.roleId) : null;

        return {
          _id: candidate._id,
          name: candidate.name,
          targetRole: candidate.targetRole,
          currentStage: candidate.currentStage,
          stageName: stage?.title ?? candidate.currentStage,
          roleId: candidate.roleId,
          roleTitle: role?.title ?? null,
          isAssessed: !!currentStageAssessment,
          score: currentStageAssessment?.overallScore ?? null,
        };
      })
    );

    // Role summaries
    const roleSummaries = roles.map((role) => ({
      ...role,
      memberCount: allMembers.filter((m) => m.roleId === role._id).length,
      candidateCount: allCandidates.filter((c) => c.roleId === role._id).length,
      competencyCount: allCompetencies.filter((c) => c.roleId === role._id).length,
    }));

    return {
      totals: {
        roles: roles.length,
        members: allMembers.length,
        candidates: allCandidates.length,
        activeCandidates: activeCandidates.length,
        competencies: allCompetencies.length,
        hiredCount: allCandidates.filter((c) => c.currentStage === "hired").length,
      },
      teamSnapshot,
      hiringPipeline,
      roles: roleSummaries,
    };
  },
});
