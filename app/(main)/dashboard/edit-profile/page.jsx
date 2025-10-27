import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import EditProfileForm from "../_components/edit-profile-form";
import { industries } from "@/data/industries"; // make sure this file exists with your industries data

export default async function EditProfilePage() {
  const { userId } = await auth();
  if (!userId) return <div>Unauthorized</div>;

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) return <div>User not found</div>;

  return (
    <div className="p-6">
      <EditProfileForm user={user} industries={industries} />
    </div>
  );
}
