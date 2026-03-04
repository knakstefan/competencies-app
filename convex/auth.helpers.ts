import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

/**
 * Shared authorization helpers for Convex functions.
 * Every public query/mutation/action should call one of these.
 */

/** Require any authenticated user. Returns the Convex user record. */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) throw new Error("User not found");
  return user;
}

/** Require admin or editor role. Returns the Convex user record. */
export async function requireEditor(ctx: QueryCtx | MutationCtx) {
  const user = await requireAuth(ctx);
  if (user.role !== "admin" && user.role !== "editor") {
    throw new Error("Insufficient permissions: editor or admin role required");
  }
  return user;
}

/** Require admin role. Returns the Convex user record. */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireAuth(ctx);
  if (user.role !== "admin") {
    throw new Error("Insufficient permissions: admin role required");
  }
  return user;
}

/** Require authentication in an action context (no DB access). */
export async function requireAuthAction(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}
