"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  mode: "register" | "login";
  onSuccess?: (user: {
    id: string;
    email: string;
    name: string;
    role: string;
  }) => void;
}

export function AuthForm({ mode: initialMode, onSuccess }: Props) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState<"form" | "verify" | "forgot" | "reset">(
    "form",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setStep("verify");
      setMessage("Check your email for a verification code.");
    } catch {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      onSuccess?.(data.user);
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      onSuccess?.(data.user);
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setStep("reset");
      setMessage(data.message);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setMessage("Password reset! You can now log in.");
      setMode("login");
      setStep("form");
      setOtp("");
    } catch {
      setError("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 text-center">
          {step === "verify"
            ? "Verify Email"
            : step === "forgot"
              ? "Forgot Password"
              : step === "reset"
                ? "Reset Password"
                : mode === "register"
                  ? "Create Account"
                  : "Sign In"}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-50 text-emerald-600 text-sm px-3 py-2 rounded-lg border border-emerald-200">
            {message}
          </div>
        )}

        {step === "form" && (
          <>
            {mode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none"
            />
            <button
              onClick={mode === "register" ? handleRegister : handleLogin}
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {loading
                ? "..."
                : mode === "register"
                  ? "Create Account"
                  : "Sign In"}
            </button>
            <div className="flex justify-between text-xs">
              <button
                onClick={() => {
                  setMode(mode === "register" ? "login" : "register");
                  setError("");
                  setMessage("");
                }}
                className="text-amber-600 hover:underline"
              >
                {mode === "register"
                  ? "Already have an account?"
                  : "Need an account?"}
              </button>
              {mode === "login" && (
                <button
                  onClick={() => {
                    setStep("forgot");
                    setError("");
                    setMessage("");
                  }}
                  className="text-slate-400 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
          </>
        )}

        {step === "verify" && (
          <>
            <p className="text-sm text-slate-500 text-center">
              Enter the 6-digit code sent to {email}
            </p>
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-3 border rounded-lg text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-amber-300 focus:outline-none"
            />
            <button
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </>
        )}

        {step === "forgot" && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none"
            />
            <button
              onClick={handleForgot}
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "..." : "Send Reset Code"}
            </button>
            <button
              onClick={() => {
                setStep("form");
                setError("");
              }}
              className="w-full text-xs text-slate-400 hover:underline"
            >
              Back to login
            </button>
          </>
        )}

        {step === "reset" && (
          <>
            <input
              type="text"
              placeholder="Reset code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-3 border rounded-lg text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-amber-300 focus:outline-none"
            />
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none"
            />
            <button
              onClick={handleReset}
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "..." : "Reset Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
