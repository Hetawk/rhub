"use client";

import { useState, useEffect } from "react";
import { AuthForm } from "@/components/tools/dbt/auth-form";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setUser(data);
          fetchAssignments(data.id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchAssignments = async (userId: string) => {
    try {
      const res = await fetch(`/api/tools/dbt/judge/assignments`);
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (e) {
      console.error("Failed to fetch assignments:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Judge Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Sign in to access your judging assignments
          </p>
        </div>
        <AuthForm
          mode="login"
          onSuccess={(u) => {
            setUser(u);
            fetchAssignments(u.id);
          }}
        />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Judge Dashboard</h1>
          <p className="text-slate-500 text-sm">Welcome, {user.name}</p>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            setUser(null);
          }}
          className="text-sm text-slate-400 hover:text-red-500"
        >
          Sign out
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No judging assignments yet.</p>
          <p className="text-sm mt-1">
            You&apos;ll see your assignments here once an organizer assigns you
            to an event.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="border rounded-xl bg-white shadow-sm overflow-hidden"
            >
              <div className="bg-slate-800 px-4 py-3">
                <h3 className="text-white font-semibold">{a.event.title}</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Judge:{" "}
                  <span className="text-amber-400 font-medium">{a.alias}</span>
                </p>
              </div>
              <div className="p-4 space-y-2">
                {a.slots.length > 0 ? (
                  a.slots.map((slot) => (
                    <a
                      key={slot.id}
                      href={`/tools/dbt/${a.event.slug}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-amber-50 hover:border-amber-200 transition-colors"
                    >
                      <div>
                        <span className="font-medium text-sm text-slate-700">
                          {slot.round.title || `Round ${slot.round.roundNum}`}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {slot.round.topic}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 font-medium">
                        J{slot.position}
                      </span>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
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
