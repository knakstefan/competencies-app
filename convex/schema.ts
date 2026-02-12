import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  competencies: defineTable({
    title: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    orderIndex: v.number(),
  }).index("by_orderIndex", ["orderIndex"]),

  subCompetencies: defineTable({
    competencyId: v.id("competencies"),
    title: v.string(),
    code: v.optional(v.string()),
    orderIndex: v.number(),
    associateLevel: v.optional(v.array(v.string())),
    intermediateLevel: v.optional(v.array(v.string())),
    seniorLevel: v.optional(v.array(v.string())),
    leadLevel: v.optional(v.array(v.string())),
    principalLevel: v.optional(v.array(v.string())),
  })
    .index("by_competencyId", ["competencyId"])
    .index("by_orderIndex", ["orderIndex"]),

  teamMembers: defineTable({
    name: v.string(),
    role: v.string(),
    startDate: v.string(),
    createdBy: v.optional(v.string()),
  }).index("by_name", ["name"]),

  assessments: defineTable({
    memberId: v.id("teamMembers"),
    createdBy: v.optional(v.string()),
    status: v.string(),
    overallScore: v.optional(v.number()),
    notes: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    updatedAt: v.string(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_status", ["status"]),

  memberCompetencyProgress: defineTable({
    assessmentId: v.optional(v.id("assessments")),
    memberId: v.id("teamMembers"),
    subCompetencyId: v.id("subCompetencies"),
    currentLevel: v.string(),
    notes: v.optional(v.string()),
    assessedAt: v.string(),
    assessedBy: v.optional(v.string()),
    updatedAt: v.string(),
  })
    .index("by_assessmentId", ["assessmentId"])
    .index("by_memberId", ["memberId"]),

  criteriaEvaluations: defineTable({
    progressId: v.id("memberCompetencyProgress"),
    criterionText: v.string(),
    evaluation: v.string(),
  }).index("by_progressId", ["progressId"]),

  promotionPlans: defineTable({
    memberId: v.id("teamMembers"),
    memberCurrentRole: v.string(),
    targetLevel: v.string(),
    planContent: v.any(),
    generatedAt: v.string(),
    generatedBy: v.optional(v.string()),
  }).index("by_memberId", ["memberId"]),

  hiringCandidates: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    targetRole: v.string(),
    currentStage: v.string(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_currentStage", ["currentStage"]),

  candidateAssessments: defineTable({
    candidateId: v.id("hiringCandidates"),
    stage: v.string(),
    status: v.string(),
    overallScore: v.optional(v.number()),
    notes: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_candidateId", ["candidateId"]),

  candidateCompetencyProgress: defineTable({
    assessmentId: v.id("candidateAssessments"),
    candidateId: v.id("hiringCandidates"),
    subCompetencyId: v.id("subCompetencies"),
    currentLevel: v.string(),
    notes: v.optional(v.string()),
    assessedAt: v.string(),
    assessedBy: v.optional(v.string()),
    updatedAt: v.string(),
  })
    .index("by_assessmentId", ["assessmentId"])
    .index("by_candidateId", ["candidateId"]),

  candidateCriteriaEvaluations: defineTable({
    progressId: v.id("candidateCompetencyProgress"),
    criterionText: v.string(),
    evaluation: v.string(),
  }).index("by_progressId", ["progressId"]),

  managerInterviewResponses: defineTable({
    assessmentId: v.id("candidateAssessments"),
    candidateId: v.id("hiringCandidates"),
    questionIndex: v.number(),
    questionText: v.string(),
    rating: v.optional(v.string()),
    responseNotes: v.optional(v.string()),
  })
    .index("by_assessmentId", ["assessmentId"])
    .index("by_candidateId", ["candidateId"]),

  portfolioReviewResponses: defineTable({
    assessmentId: v.id("candidateAssessments"),
    candidateId: v.id("hiringCandidates"),
    competencyArea: v.string(),
    subCompetencyTitle: v.string(),
    questionIndex: v.number(),
    questionText: v.string(),
    competencyLevel: v.optional(v.string()),
    responseNotes: v.optional(v.string()),
  })
    .index("by_assessmentId", ["assessmentId"])
    .index("by_candidateId", ["candidateId"]),
});
