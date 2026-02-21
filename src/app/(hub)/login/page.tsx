"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Chrome } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          router.replace(redirectTo);
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => setCheckingAuth(false));
  }, [router, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please check your credentials.");
        return;
      }
      window.location.href = redirectTo;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    const state = encodeURIComponent(redirectTo);
    window.location.href = `/api/auth/google?state=${state}`;
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return (
    <AuthShell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to access your EKD Digital resources and tools
        </p>
      </div>

      {/* Google OAuth */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 mb-4"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Chrome className="h-4 w-4" />
        )}
        Continue with Google
      </button>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={cn(
              "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]",
              "placeholder:text-muted-foreground/60 transition-colors",
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#d4af37] hover:text-[#c9a227] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn(
                "w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-11 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]",
                "placeholder:text-muted-foreground/60 transition-colors",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPwd ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#d4af37] hover:bg-[#c9a227] text-[#1a1a2e] font-semibold py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href={`/register${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-medium text-[#d4af37] hover:text-[#c9a227] transition-colors"
        >
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
