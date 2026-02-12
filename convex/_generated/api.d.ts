/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as assessments from "../assessments.js";
import type * as candidateAssessments from "../candidateAssessments.js";
import type * as candidateEvaluations from "../candidateEvaluations.js";
import type * as candidateProgress from "../candidateProgress.js";
import type * as candidates from "../candidates.js";
import type * as competencies from "../competencies.js";
import type * as evaluations from "../evaluations.js";
import type * as interviewResponses from "../interviewResponses.js";
import type * as portfolioResponses from "../portfolioResponses.js";
import type * as progress from "../progress.js";
import type * as promotionPlans from "../promotionPlans.js";
import type * as teamMembers from "../teamMembers.js";
import type * as teamSkillData from "../teamSkillData.js";
import type * as userAdmin from "../userAdmin.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  assessments: typeof assessments;
  candidateAssessments: typeof candidateAssessments;
  candidateEvaluations: typeof candidateEvaluations;
  candidateProgress: typeof candidateProgress;
  candidates: typeof candidates;
  competencies: typeof competencies;
  evaluations: typeof evaluations;
  interviewResponses: typeof interviewResponses;
  portfolioResponses: typeof portfolioResponses;
  progress: typeof progress;
  promotionPlans: typeof promotionPlans;
  teamMembers: typeof teamMembers;
  teamSkillData: typeof teamSkillData;
  userAdmin: typeof userAdmin;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
