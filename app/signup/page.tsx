"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}
function validatePassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

export default function SignupPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (session) {
      setIsRedirecting(true);
      router.replace("/dashboard");
    }
  }, [session, router]);

  if (isRedirecting) {
    return <div className="text-center py-16 text-lg text-gray-400">Redirecting...</div>;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters and contain both letters and numbers.");
      return;
    }
    setLoading(true);
    const { data, error: signupError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (signupError) {
      setError(signupError.message);
      toast({ title: "Signup failed", description: signupError.message, variant: "destructive" });
    } else {
      toast({ title: "Signup successful!", description: "Welcome! Redirecting to dashboard..." });
      router.replace("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-sm rounded bg-white p-8 shadow-md flex flex-col items-center"
      >
        <h1 className="mb-8 text-3xl font-bold text-blue-700">Sign Up</h1>
        <div className="w-full mb-4">
          <label htmlFor="email" className="block mb-2 text-sm font-medium">Email</label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            autoComplete="email"
          />
          {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
        </div>
        <div className="w-full mb-6">
          <label htmlFor="password" className="block mb-2 text-sm font-medium">Password</label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters and contain both letters and numbers.</p>
          {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing up..." : "Sign Up"}
        </Button>
        <div className="mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
        </div>
      </form>
    </div>
  );
} 