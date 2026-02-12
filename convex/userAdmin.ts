"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const inviteUser = action({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY not configured");

    // Create invitation via Clerk Backend API
    const response = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: args.email,
        redirect_url: `${process.env.APP_URL || ""}/accept-invite`,
        public_metadata: { role: args.role },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || "Failed to send invitation");
    }

    return { success: true };
  },
});

export const deleteUser = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY not configured");

    // Get the user to find their Clerk ID
    const user = await ctx.runQuery(api.users.listAll);
    const targetUser = user.find((u: any) => u._id === args.userId);
    if (!targetUser) throw new Error("User not found");

    // Delete from Clerk
    if (targetUser.clerkId) {
      const response = await fetch(
        `https://api.clerk.com/v1/users/${targetUser.clerkId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors?.[0]?.message || "Failed to delete user from Clerk");
      }
    }

    // Delete from Convex
    await ctx.runMutation(api.users.removeUser, { id: args.userId });

    return { success: true };
  },
});
