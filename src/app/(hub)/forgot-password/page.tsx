"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(prefillEmail);
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send reset code.");
        return;
      }
      setStep("reset");
      setMessage("A 6-digit reset code has been sent to your email.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPwd) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: otp.trim(),
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed. Check your code.");
        return;
      }
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Password Reset!
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your password has been updated successfully.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-[#d4af37] hover:bg-[#c9a227] text-[#1a1a2e] font-semibold px-8 py-3 text-sm transition-colors"
          >
            Sign In Now
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Forgot Password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {step === "email"
            ? "Enter your email to receive a reset code"
            : "Enter the code and your new password"}
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 mb-4">
          {message}
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={handleForgot} className="space-y-4">
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
              placeholder="you@example.com"
              className={cn(
                "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-colors",
              )}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#d4af37] hover:bg-[#c9a227] text-[#1a1a2e] font-semibold py-3 text-sm transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Reset Code
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
                "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-colors",
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className={cn(
                "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-colors",
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              placeholder="Confirm new password"
              className={cn(
                "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-colors",
                confirmPwd && confirmPwd !== newPassword && "border-red-400",
              )}
            />
          </div>
          <button
            type="submit"
            disabled={
              loading ||
              (!!confirmPwd && confirmPwd !== newPassword) ||
              otp.length !== 6
            }
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#d4af37] hover:bg-[#c9a227] text-[#1a1a2e] font-semibold py-3 text-sm transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-[#d4af37] hover:text-[#c9a227] transition-colors"
        >
          ← Back to Sign In
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
