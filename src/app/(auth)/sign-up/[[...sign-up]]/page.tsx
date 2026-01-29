import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Get Started"
      subtitle="Create your RANZ Quality Program account"
    >
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: "bg-ranz-charcoal hover:bg-ranz-charcoal-dark",
            card: "shadow-none",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton: "border-gray-200",
            formFieldInput: "border-gray-200 focus:ring-app-accent focus:border-app-accent",
          },
        }}
      />
    </AuthLayout>
  );
}
