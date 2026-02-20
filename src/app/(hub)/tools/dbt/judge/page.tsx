"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gavel, Loader2, CalendarDays, ChevronRight } from "lucide-react";

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

export default function JudgeDashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
      </div>
    );
  }

  return (
    <div className="py-10 px-4 max-w-3xl mx-auto space-y-6">
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

      {/* Assignments */}
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
                          <span className="text-xs px-2 py-0.5 rounded-full bg-ekd-gold/10 text-ekd-dark-brown font-semibold">
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
