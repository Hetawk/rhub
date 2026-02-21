"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Gavel,
  Loader2,
  CalendarDays,
  ChevronRight,
  Plus,
  X,
  Trophy,
  Settings,
  AlertCircle,
} from "lucide-react";
import { ROLE_HIERARCHY } from "@/lib/dbt/schemas";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface JudgeAssignment {
  id: string;
  alias: string;
  event: {
    id: string;
    slug: string;
    title: string;
    status: string;
    rounds: {
      id: string;
      roundNum: number;
      title: string | null;
      topic: string;
      status: string;
    }[];
  };
  slots: {
    id: string;
    position: number;
    round: {
      id: string;
      roundNum: number;
      title: string | null;
      topic: string;
    };
  }[];
}

function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] ?? 0;
}

export default function JudgeDashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Create event form state
  const [form, setForm] = useState({
    title: "",
    organizer: "",
    startDate: "",
    endDate: "",
    location: "",
    minScore: 4,
    maxScore: 6,
  });

  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setUser(data);
          fetchAssignments();
        } else {
          router.replace("/login?redirect=/tools/dbt/judge");
        }
      })
      .catch(() => router.replace("/login?redirect=/tools/dbt/judge"));
  }, [router]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/tools/dbt/judge/assignments");
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (e) {
      console.error("Failed to fetch assignments:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate) {
      setCreateError("Title and start date are required.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/tools/dbt/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          organizer: form.organizer.trim() || null,
          startDate: new Date(form.startDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          location: form.location.trim() || null,
          minScore: form.minScore,
          maxScore: form.maxScore,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create event.");
        return;
      }
      router.push(`/tools/dbt/${data.event.slug}`);
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
      </div>
    );
  }

  const isJudgeAdmin = getRoleLevel(user.role) >= ROLE_HIERARCHY.JUDGE_ADMIN;

  return (
    <div className="py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gavel className="h-5 w-5 text-ekd-gold" />
            <h1 className="text-2xl font-bold text-foreground">
              Judge Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Welcome back,{" "}
            <span className="font-medium text-foreground">{user.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>
            {assignments.length} event
            {assignments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Organizer Management Panel (JUDGE_ADMIN+) ── */}
      {isJudgeAdmin && (
        <div className="rounded-xl border border-ekd-gold/30 bg-ekd-gold/5 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-ekd-gold/20">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-ekd-gold" />
              <span className="text-sm font-semibold text-foreground">
                Organizer Tools
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/tools/dbt"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                Manage All Events
              </Link>
              <button
                onClick={() => {
                  setShowCreate((v) => !v);
                  setCreateError("");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ekd-gold px-3 py-1.5 text-xs font-semibold text-ekd-dark-brown hover:bg-ekd-light-gold transition-colors"
              >
                {showCreate ? (
                  <>
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Create Event
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Create event form */}
          {showCreate && (
            <form onSubmit={handleCreateEvent} className="px-5 py-4 space-y-4">
              {createError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {createError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Spring Debate Championship 2026"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/40 focus:border-ekd-gold transition"
                />
              </div>

              {/* Organizer + Location */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Organizer
                  </label>
                  <input
                    type="text"
                    value={form.organizer}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, organizer: e.target.value }))
                    }
                    placeholder="e.g. EKD Digital AEC"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/40 focus:border-ekd-gold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    placeholder="e.g. Accra, Ghana"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/40 focus:border-ekd-gold transition"
                  />
                </div>
              </div>

              {/* Start + End Date */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startDate: e.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ekd-gold/40 focus:border-ekd-gold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endDate: e.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ekd-gold/40 focus:border-ekd-gold transition"
                  />
                </div>
              </div>

              {/* Score range */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Min Score
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.minScore}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        minScore: parseInt(e.target.value) || 4,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ekd-gold/40 focus:border-ekd-gold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Max Score
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxScore}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maxScore: parseInt(e.target.value) || 6,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ekd-gold/40 focus:border-ekd-gold transition"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-lg bg-ekd-gold px-5 py-2 text-sm font-semibold text-ekd-dark-brown hover:bg-ekd-light-gold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Event
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* No-form summary row */}
          {!showCreate && (
            <div className="px-5 py-3 text-xs text-muted-foreground">
              Create and manage debate events, assign judges, and run scoring
              from here.
            </div>
          )}
        </div>
      )}

      {/* ── Judging Assignments ── */}
      {assignments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card text-center py-16 px-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ekd-gold/10">
            <Gavel className="h-6 w-6 text-ekd-gold" />
          </div>
          <p className="text-base font-medium text-foreground">
            No judging assignments yet
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            You&apos;ll see your assignments here once an organizer assigns you
            to an event.
          </p>
          <Link
            href="/tools/dbt"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-ekd-gold hover:text-ekd-light-gold transition-colors font-medium"
          >
            Browse Events <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
            >
              {/* Event header bar */}
              <div className="bg-ekd-dark-brown px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">
                    {a.event.title}
                  </h3>
                  <p className="text-white/50 text-xs mt-0.5">
                    Judge alias:{" "}
                    <span className="text-ekd-gold font-medium">{a.alias}</span>
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ekd-gold/15 text-ekd-gold">
                  {a.event.status}
                </span>
              </div>

              {/* Rounds / slots */}
              <div className="p-4">
                {a.slots.length > 0 ? (
                  <div className="space-y-2">
                    {a.slots.map((slot) => (
                      <Link
                        key={slot.id}
                        href={`/tools/dbt/${a.event.slug}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-ekd-gold/40 hover:bg-ekd-gold/5 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground group-hover:text-ekd-gold transition-colors truncate">
                            {slot.round.title || `Round ${slot.round.roundNum}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {slot.round.topic}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-ekd-gold/20 dark:bg-ekd-gold/30 text-ekd-dark-brown dark:text-ekd-gold font-semibold">
                            J{slot.position}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-ekd-gold transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    No rounds assigned yet.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
