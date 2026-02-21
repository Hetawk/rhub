"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Chrome,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleMeta } from "@/lib/roles";
import { AppShell } from "@/components/app-shell";
import { RoleChangeBanner } from "@/components/role-change-banner";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  isGoogleLinked: boolean;
  hasPassword: boolean;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  roleChangedAt: string | null;
  sessionCreatedAt: string;
}

function ProfileContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Name edit
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);

  // Password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.replace("/login?redirect=/profile");
        } else {
          setProfile(data);
          setNameValue(data.name);
        }
      })
      .catch(() => router.replace("/login?redirect=/profile"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameSaving(true);
    setNameError("");
    setNameSuccess(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error || "Failed to update name");
        return;
      }
      setProfile((p) => (p ? { ...p, name: data.user.name } : p));
      setEditName(false);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch {
      setNameError("Network error. Please try again.");
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess(false);
    if (newPwd !== confirmPwd) {
      setPwdError("New passwords do not match");
      return;
    }
    if (newPwd.length < 6) {
      setPwdError("New password must be at least 6 characters");
      return;
    }
    // For OAuth users setting a password for the first time, currentPwd is empty — that's fine
    if (profile?.hasPassword && !currentPwd) {
      setPwdError("Current password is required");
      return;
    }
    setPwdSaving(true);
    try {
      const body: Record<string, string> = { newPassword: newPwd };
      if (profile?.hasPassword) body.currentPassword = currentPwd;
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.error || "Failed to update password");
        return;
      }
      setPwdSuccess(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      // Update local state so form switches to "Change Password" mode
      setProfile((p) => (p ? { ...p, hasPassword: true } : p));
    } catch {
      setPwdError("Network error. Please try again.");
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
      </div>
    );
  }

  if (!profile) return null;

  const roleInfo = getRoleMeta(profile.role);
  const joined = new Date(profile.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell user={{ id: profile.id, name: profile.name, role: profile.role }}>
      <div className="max-w-2xl space-y-6 py-2">
        <RoleChangeBanner
          roleChangedAt={profile.roleChangedAt}
          sessionCreatedAt={profile.sessionCreatedAt}
        />
        {/* Back + heading */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-ekd-gold" />
            <h1 className="text-2xl font-bold text-foreground">
              Profile &amp; Settings
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account details and security settings
          </p>
        </div>

        {nameSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Name updated successfully
          </div>
        )}

        {/* Account info card */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {/* Avatar + name row */}
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-ekd-gold to-ekd-maroon text-white text-xl font-bold shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editName ? (
                <form
                  onSubmit={handleSaveName}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    autoFocus
                    required
                    minLength={2}
                    className={cn(
                      "rounded-lg border border-border bg-background px-3 py-1.5 text-sm flex-1",
                      "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                    )}
                  />
                  <button
                    type="submit"
                    disabled={nameSaving}
                    className="px-3 py-1.5 bg-ekd-gold text-ekd-dark-brown text-sm font-semibold rounded-lg hover:bg-ekd-light-gold transition-colors disabled:opacity-50"
                  >
                    {nameSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(false);
                      setNameValue(profile.name);
                      setNameError("");
                    }}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold text-foreground">
                    {profile.name}
                  </p>
                  <button
                    onClick={() => setEditName(true)}
                    className="text-xs text-ekd-gold hover:text-ekd-light-gold transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
              {nameError && (
                <p className="text-xs text-red-500 mt-1">{nameError}</p>
              )}
              <span
                className={cn(
                  "inline-block text-[10px] font-bold uppercase tracking-wide mt-0.5 px-2 py-0.5 rounded-full",
                  roleInfo.badge,
                )}
              >
                {roleInfo.label}
              </span>
            </div>
          </div>

          {/* Email */}
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Email address</p>
              <p className="text-sm font-medium text-foreground truncate">
                {profile.email}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              {profile.emailVerified ? "Verified" : "Unverified"}
            </div>
          </div>

          {/* Google link status */}
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Chrome className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Google account</p>
              <p className="text-sm font-medium text-foreground">
                {profile.isGoogleLinked ? "Linked" : "Not linked"}
              </p>
            </div>
          </div>

          {/* Joined */}
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="text-sm font-medium text-foreground">{joined}</p>
            </div>
          </div>
        </div>

        {/* Password section — shown to all users */}
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                {profile.hasPassword ? "Change Password" : "Set a Password"}
              </h2>
            </div>
            {!profile.hasPassword && (
              <p className="text-xs text-muted-foreground mt-1">
                Your account currently uses Google sign-in only. Set a password
                to also be able to log in with your email and password.
              </p>
            )}
          </div>
          <div className="px-5 py-5">
            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwdError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {profile.hasPassword
                    ? "Password updated successfully"
                    : "Password set! You can now log in with email & password."}
                </div>
              )}

              {/* Current password — only needed when account already has a password */}
              {profile.hasPassword && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      required
                      placeholder="••••••••"
                      className={cn(
                        "w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-11 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                        "placeholder:text-muted-foreground/60",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showCurrent ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {profile.hasPassword ? "New Password" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className={cn(
                      "w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-11 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                      "placeholder:text-muted-foreground/60",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showNew ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Confirm {profile.hasPassword ? "New " : ""}Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={cn(
                      "w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-11 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                      "placeholder:text-muted-foreground/60",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={pwdSaving}
                className="flex items-center gap-2 rounded-xl bg-ekd-gold hover:bg-ekd-light-gold text-ekd-dark-brown font-semibold px-5 py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                {pwdSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {pwdSaving
                  ? profile.hasPassword
                    ? "Updating..."
                    : "Setting..."
                  : profile.hasPassword
                    ? "Update Password"
                    : "Set Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
