"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  const user = await currentUser();
  if (!user) return null;

  try {
    // Try to find user either by Clerk ID or email
    let loggedInUser = await db.user.findFirst({
      where: {
        OR: [
          { clerkUserId: user.id },
          { email: user.emailAddresses[0].emailAddress },
        ],
      },
    });

    // If user exists, but Clerk ID is missing — update it
    if (loggedInUser && !loggedInUser.clerkUserId) {
      loggedInUser = await db.user.update({
        where: { email: user.emailAddresses[0].emailAddress },
        data: { clerkUserId: user.id },
      });
    }

    // If user doesn't exist at all — create it
    if (!loggedInUser) {
      loggedInUser = await db.user.create({
        data: {
          clerkUserId: user.id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.emailAddresses[0].emailAddress,
          imageUrl: user.imageUrl,
        },
      });
    }

    return loggedInUser;
  } catch (error) {
    console.error("checkUser error:", error);
    throw new Error("Failed to check or create user");
  }
};
