// app/api/check-onboarding/route.js
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ isOnboarded: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return new Response(JSON.stringify({ isOnboarded: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create user if not exists
    const user = await db.user.upsert({
      where: { email: clerkUser.emailAddresses[0].emailAddress },
      update: {},
      create: {
        clerkUserId: userId,
        email: clerkUser.emailAddresses[0].emailAddress,
        name: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`
          : clerkUser.username ?? "New User",
      },
    });

    return new Response(JSON.stringify({ isOnboarded: !!user.industry }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check onboarding API error:", error);
    return new Response(JSON.stringify({ isOnboarded: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
