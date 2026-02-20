"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Chrome, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [otp, setOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) router.replace(redirectTo);
        else setCheckingAuth(false);
      })
      .catch(() => setCheckingAuth(false));
  }, [router, redirectTo]);

  const pwdStrength = (): {
    label: string;
    color: string;
    width: string;
  } | null => {
    if (!password) return null;
    if (password.length < 6)
      return { label: "Too short", color: "bg-red-500", width: "w-1/4" };
    if (password.length < 8)
      return { label: "Weak", color: "bg-orange-500", width: "w-2/4" };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return { label: "Fair", color: "bg-yellow-500", width: "w-3/4" };
    return { label: "Strong", color: "bg-green-500", width: "w-full" };
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPwd) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }
      setStep("verify");
      setResendCooldown(60);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setVerifyError("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(
          data.error || "Failed to resend code. Please try again.",
        );
        return;
      }
      setResendSuccess(true);
      setResendCooldown(60);
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: otp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(
          data.error || "Invalid or expired code. Please try again.",
        );
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setVerifyLoading(false);
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

  if (step === "verify") {
    return (
      <AuthShell>
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Check Your Email
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            We sent a 6-digit verification code to{" "}
            <strong className="text-foreground">{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {verifyError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {verifyError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Verification Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              placeholder="123456"
              maxLength={6}
              className={cn(
                "w-full rounded-xl border border-border bg-background px-4 py-3 text-2xl tracking-[1rem] text-center font-mono",
                "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                "placeholder:text-muted-foreground/40 placeholder:tracking-normal transition-colors",
              )}
            />
          </div>
          <button
            type="submit"
            disabled={verifyLoading || otp.length !== 6}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-ekd-gold hover:bg-ekd-light-gold text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifyLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {verifyLoading ? "Verifying..." : "Verify Email"}
          </button>
        </form>
        {resendSuccess && (
          <div className="mt-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-4 py-2.5 text-sm text-green-700 dark:text-green-400 text-center">
            A new code has been sent to {email}
          </div>
        )}
        <div className="mt-4 text-center">
          {resendCooldown > 0 ? (
            <p className="text-xs text-muted-foreground">
              Resend code in{" "}
              <span className="font-medium tabular-nums text-foreground">
                {resendCooldown}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-xs text-ekd-gold hover:text-ekd-light-gold underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
            >
              {resendLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              {resendLoading ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Wrong email?{" "}
          <button
            onClick={() => setStep("form")}
            className="text-ekd-gold hover:text-ekd-light-gold underline"
          >
            Go back
          </button>
        </p>
      </AuthShell>
    );
  }

  const strength = pwdStrength();

  return (
    <AuthShell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Join to participate in debates, judging, and more
        </p>
      </div>

      {/* Google */}
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

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground">
            or register with email
          </span>
        </div>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            placeholder="John Doe"
            className={cn(
              "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
              "placeholder:text-muted-foreground/60 transition-colors",
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className={cn(
              "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
              "placeholder:text-muted-foreground/60 transition-colors",
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className={cn(
                "w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-11 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                "placeholder:text-muted-foreground/60 transition-colors",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPwd ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {strength && (
            <div className="mt-1.5 space-y-1">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    strength.color,
                    strength.width,
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">{strength.label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPwd ? "text" : "password"}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              placeholder="Re-enter your password"
              className={cn(
                "w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-11 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                "placeholder:text-muted-foreground/60 transition-colors",
                confirmPwd &&
                  confirmPwd !== password &&
                  "border-red-400 focus:border-red-500 focus:ring-red-500/20",
                confirmPwd &&
                  confirmPwd === password &&
                  "border-green-400 focus:border-green-500 focus:ring-green-500/20",
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPwd(!showConfirmPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPwd ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {confirmPwd && confirmPwd !== password && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
          )}
          {confirmPwd && confirmPwd === password && (
            <p className="mt-1 text-xs text-green-600">Passwords match ✓</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (!!confirmPwd && confirmPwd !== password)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-ekd-gold hover:bg-ekd-light-gold text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login${redirectTo !== "/tools/dbt" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-medium text-ekd-gold hover:text-ekd-light-gold transition-colors"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
