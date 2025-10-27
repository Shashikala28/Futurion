"use server";

import { db } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

// helper to wait
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // find or create user
  let user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) {
    // give Clerk a bit of time to finalize user data
    await wait(100000); // 1 second delay
    const clerkUser = await currentUser();

    user = await db.user.create({
      data: {
        clerkUserId: userId,
        email:
          clerkUser?.emailAddresses?.[0]?.emailAddress ?? "unknown@user.com",
        name:
          clerkUser?.firstName || clerkUser?.lastName
            ? `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()
            : clerkUser?.username ?? "New User",
      },
    });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // check or create industry insight
      let industryInsight = await tx.industryInsight.findUnique({
        where: { industry: data.industry },
      });

      if (!industryInsight) {
        const insights = await generateAIInsights(data.industry);
        industryInsight = await tx.industryInsight.create({
          data: {
            industry: data.industry,
            ...insights,
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // update user profile
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          industry: data.industry,
          experience: data.experience ? parseInt(data.experience, 10) : null,
          bio: data.bio,
          skills: data.skills,
        },
      });

      return { updatedUser, industryInsight };
    });

    revalidatePath("/");
    return result.updatedUser;
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let user = await db.user.findUnique({ where: { clerkUserId: userId } });

  // if user doesn’t exist yet, wait and create
  if (!user) {
    await wait(1000);
    const clerkUser = await currentUser();
    user = await db.user.create({
      data: {
        clerkUserId: userId,
        email:
          clerkUser?.emailAddresses?.[0]?.emailAddress ?? "unknown@user.com",
        name:
          clerkUser?.firstName || clerkUser?.lastName
            ? `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()
            : clerkUser?.username ?? "New User",
      },
    });
  }

  return { isOnboarded: !!user?.industry };
}
