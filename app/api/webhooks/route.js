import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

export async function POST(req) {
  // Clerk sends the svix headers to verify
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET in .env");
    return new Response("Server misconfigured", { status: 500 });
  }

  const payload = await req.text();
  const headerPayload = {
    "svix-id": headers().get("svix-id"),
    "svix-timestamp": headers().get("svix-timestamp"),
    "svix-signature": headers().get("svix-signature"),
  };

  const wh = new Webhook(WEBHOOK_SECRET);

  let event;
  try {
    event = wh.verify(payload, headerPayload);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Parse Clerk event
  const { type, data } = event;

  try {
    if (type === "user.created") {
      await db.user.upsert({
        where: { email: data.email_addresses[0].email_address },
        update: {
          clerkUserId: data.id,
          name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        },
        create: {
          clerkUserId: data.id,
          email: data.email_addresses[0].email_address,
          name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        },
      });
    }

    if (type === "user.deleted") {
      await db.user.deleteMany({
        where: {
          clerkUserId: data.id,
        },
      });
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (err) {
    console.error("Error handling Clerk webhook:", err);
    return new Response("Webhook error", { status: 500 });
  }
}
