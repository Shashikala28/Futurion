import { SignUp } from "@clerk/nextjs";
import AuthLayout from "../../sign-up/layout";

const Page = () => {
  return (
    <AuthLayout>
      <SignUp />
    </AuthLayout>
  );
};

export default Page;
