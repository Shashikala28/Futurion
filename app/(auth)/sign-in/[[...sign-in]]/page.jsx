import { SignIn } from "@clerk/nextjs";
import AuthLayout from "../../sign-up/layout";

const Page = () => {
  return (
    <AuthLayout>
      <SignIn />
    </AuthLayout>
  );
};

export default Page;
