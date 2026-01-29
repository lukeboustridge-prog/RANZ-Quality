import { redirect } from "next/navigation";
import { cookies } from "next/headers";

const AUTH_MODE = process.env.AUTH_MODE || 'clerk';

export default async function Home() {
  if (AUTH_MODE === 'custom') {
    // In custom auth mode, check for session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('ranz_session');

    if (!sessionCookie?.value) {
      redirect("/sign-in");
    }

    // User has session, go to dashboard
    redirect("/dashboard");
  } else {
    // Clerk mode - use Clerk's auth
    const { auth } = await import("@clerk/nextjs/server");
    const { userId, orgId } = await auth();

    if (!userId) {
      redirect("/sign-in");
    }

    if (!orgId) {
      redirect("/onboarding");
    }

    redirect("/dashboard");
  }
}
