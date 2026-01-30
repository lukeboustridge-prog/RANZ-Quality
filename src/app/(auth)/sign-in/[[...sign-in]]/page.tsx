'use client';

import { SignIn } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE || 'clerk';

function CustomLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect based on user type
      const isRanzAdmin = ['RANZ_ADMIN', 'RANZ_STAFF', 'RANZ_INSPECTOR'].includes(data.user?.userType);
      router.push(isRanzAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-ranz-charcoal">Sign In</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your credentials to continue
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent"
          required
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-ranz-charcoal px-4 py-2 text-white font-medium hover:bg-ranz-charcoal-dark focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your RANZ Quality Program account"
    >
      {AUTH_MODE === 'custom' ? (
        <CustomLoginForm />
      ) : (
        <SignIn
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
      )}
    </AuthLayout>
  );
}
