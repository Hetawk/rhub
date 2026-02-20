"use client";

import { useState, useEffect, useCallback } from "react";
import { ScoringSheet } from "./scoring-sheet";
import { JudgeCellView } from "./judge-cell-view";
import { JudgeManager } from "./judge-manager";
import { AudienceVoting } from "./audience-voting";
import { ScoreboardDisplay } from "./scoreboard-display";
import { SpeechTimer } from "./speech-timer";
import { AuthForm } from "./auth-form";
import { cn } from "@/lib/utils";
import { ROLE_HIERARCHY } from "@/lib/dbt/schemas";

// ---- Types ----

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface RoundData {
  id: string;
  roundNum: number;
  title: string | null;
  topic: string;
  status: string;
  gameType: string;
  completedAt: string | null;
  scoreLockDeadline: string | null;
  timerEnabled: boolean;
  speechDurationSec: number;
  prepTimeSec: number;
  audienceProVotes: number;
  audienceConVotes: number;
  roundTeams: {
    id: string;
    side: "PRO" | "CON";
    team: { id: string; name: string };
  }[];
  judgeSlots: {
    id: string;
    position: number;
    judge: {
      alias: string;
      isHeadJudge: boolean;
      user: { id: string; name: string };
    };
  }[];
}

interface EventData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  organizer: string | null;
  status: string;
  minScore: number;
  maxScore: number;
  teams: { id: string; name: string; city: string | null }[];
  rounds: RoundData[];
  judges: {
    id: string;
    alias: string;
    isHeadJudge: boolean;
    user: { id: string; name: string };
  }[];
}

interface Props {
  eventSlug?: string;
}

type Tab = "scoreboard" | "scoring" | "timer" | "voting" | "export" | "manage";

// ---- Helpers ----

function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] ?? 0;
}

function isHeadJudgeOrAbove(
  user: UserData | null,
  event: EventData | null,
): boolean {
  if (!user) return false;
  if (getRoleLevel(user.role) >= ROLE_HIERARCHY.HEAD_JUDGE) return true;
  // Also check if user is flagged isHeadJudge in this event
  return (
    event?.judges.some((j) => j.user.id === user.id && j.isHeadJudge) ?? false
  );
}

// ---- Component ----

export function DebateShell({ eventSlug }: Props) {
  const [user, setUser] = useState<UserData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [events, setEvents] = useState<
    {
      id: string;
      slug: string;
      title: string;
      status: string;
      gameType?: string;
    }[]
  >([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("scoreboard");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [viewMode, setViewMode] = useState<"cell" | "table">("cell");
  const [lockDeadline, setLockDeadline] = useState("");
  const [settingLock, setSettingLock] = useState(false);

  // Check auth
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setUser(data);
      })
      .catch(() => null);
  }, []);

  // Fetch event
  const fetchEvent = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/tools/dbt/events/${slug}`);
      const data = await res.json();
      if (data.event) {
        setEvent(data.event);
        const activeRound = data.event.rounds.find(
          (r: RoundData) => r.status === "LIVE" || r.status === "SCORING",
        );
        if (activeRound) {
          setSelectedRoundId(activeRound.id);
        } else if (data.event.rounds.length > 0) {
          setSelectedRoundId(
            data.event.rounds[data.event.rounds.length - 1].id,
          );
        }
      }
    } catch (e) {
      console.error("Failed to fetch event:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch event list if no slug
  useEffect(() => {
    if (eventSlug) {
      fetchEvent(eventSlug);
    } else {
      fetch(`/api/tools/dbt/events?page=${eventsPage}&limit=12`)
        .then((r) => r.json())
        .then((data) => {
          setEvents(data.events || []);
          if (data.pagination) {
            setEventsTotalPages(data.pagination.pages || 1);
            setEventsTotal(data.pagination.total || 0);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [eventSlug, eventsPage, fetchEvent]);

  // Derived
  const isJudge = user
    ? (event?.judges.some((j) => j.user.id === user.id) ?? false)
    : false;
  const isAdmin = user
    ? getRoleLevel(user.role) >= ROLE_HIERARCHY.ADMIN
    : false;
  const isJudgeAdmin = user
    ? getRoleLevel(user.role) >= ROLE_HIERARCHY.JUDGE_ADMIN
    : false;

  // Set score lock deadline
  const setScoreLock = async (clear = false) => {
    if (!selectedRound) return;
    setSettingLock(true);
    try {
      const body = clear
        ? { clearLock: true }
        : { scoreLockDeadline: lockDeadline };
      const res = await fetch(
        `/api/tools/dbt/rounds/${selectedRound.id}/lock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (res.ok && eventSlug) {
        await fetchEvent(eventSlug);
        if (!clear) setLockDeadline("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to set lock deadline");
      }
    } catch {
      alert("Network error");
    } finally {
      setSettingLock(false);
    }
  };
  const canEditVotes = isHeadJudgeOrAbove(user, event);
  const canComplete = isHeadJudgeOrAbove(user, event);
  const selectedRound = event?.rounds.find((r) => r.id === selectedRoundId);
  const isCompleted = !!selectedRound?.completedAt;
  const proTeam = selectedRound?.roundTeams.find((rt) => rt.side === "PRO");
  const conTeam = selectedRound?.roundTeams.find((rt) => rt.side === "CON");

  // Complete round handler
  const completeRound = async () => {
    if (!selectedRound || isCompleted || !canComplete) return;
    if (!confirm("Complete this round? All scores will be locked permanently."))
      return;
    setCompleting(true);
    try {
      const res = await fetch(
        `/api/tools/dbt/rounds/${selectedRound.id}/complete`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (res.ok && eventSlug) {
        await fetchEvent(eventSlug);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to complete round");
      }
    } catch {
      alert("Network error");
    } finally {
      setCompleting(false);
    }
  };

  // Export handler
  const exportResults = (format: "json" | "csv") => {
    if (!selectedRound) return;
    window.open(
      `/api/tools/dbt/rounds/${selectedRound.id}/export?format=${format}`,
      "_blank",
    );
  };

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  // Events list
  if (!eventSlug && !event) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Debate Events</h1>
          <p className="text-slate-500 mt-1">
            Select an event to view or participate
          </p>
          {eventsTotal > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {eventsTotal} event{eventsTotal !== 1 ? "s" : ""} total
            </p>
          )}
        </div>
        {events.length === 0 ? (
          <p className="text-center text-slate-400 py-12">No events yet.</p>
        ) : (
          <>
            <div className="grid gap-4 max-w-2xl mx-auto">
              {events.map((evt) => (
                <a
                  key={evt.id}
                  href={`/tools/dbt/${evt.slug}`}
                  className="block p-4 rounded-xl border bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 flex-1">
                      {evt.title}
                    </h3>
                    {evt.gameType === "TEST" && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded">
                        TEST
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium",
                      evt.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : evt.status === "COMPLETED"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {evt.status}
                  </span>
                </a>
              ))}
            </div>

            {/* Pagination */}
            {eventsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                  disabled={eventsPage <= 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-sm text-slate-500">
                  Page {eventsPage} of {eventsTotalPages}
                </span>
                <button
                  onClick={() =>
                    setEventsPage((p) => Math.min(eventsTotalPages, p + 1))
                  }
                  disabled={eventsPage >= eventsTotalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (!event) {
    return <p className="text-center text-slate-400 py-12">Event not found.</p>;
  }

  // Build available tabs
  const tabs: Tab[] = ["scoreboard", "scoring"];
  if (selectedRound?.timerEnabled) tabs.push("timer");
  tabs.push("voting");
  if (isAdmin || canEditVotes) tabs.push("export");
  if (isJudgeAdmin) tabs.push("manage");

  return (
    <div className="space-y-6">
      {/* Event header */}
      <div className="text-center space-y-1">
        {event.organizer && (
          <p className="text-sm font-semibold text-slate-500">
            {event.organizer}
          </p>
        )}
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">
          {event.title}
        </h1>
        {event.subtitle && (
          <p className="text-sm text-red-600 font-medium">{event.subtitle}</p>
        )}
      </div>

      {/* Auth section */}
      {!user && (
        <div className="border-t pt-6">
          <AuthForm
            mode="login"
            onSuccess={(u) => {
              setUser(u);
              if (eventSlug) fetchEvent(eventSlug);
            }}
          />
        </div>
      )}

      {user && (
        <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-4 py-2 border">
          <span className="text-slate-500">
            Signed in as <strong className="text-slate-700">{user.name}</strong>
            <span className="ml-2 text-xs text-slate-400">({user.role})</span>
            {isJudge && (
              <span className="ml-1 text-amber-600 font-medium">(Judge)</span>
            )}
            {canEditVotes && (
              <span className="ml-1 text-purple-600 font-medium">
                (Head Judge)
              </span>
            )}
          </span>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              setUser(null);
            }}
            className="text-slate-400 hover:text-red-500 text-xs"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Round selector */}
      {event.rounds.length > 0 && (
        <div className="overflow-x-auto pb-1 -mx-4 px-4">
          <div className="flex gap-2 justify-start sm:justify-center min-w-max">
            {event.rounds.map((round) => (
              <button
                key={round.id}
                onClick={() => setSelectedRoundId(round.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 whitespace-nowrap",
                  selectedRoundId === round.id
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-300",
                )}
              >
                {round.title || `Round ${round.roundNum}`}
                {round.gameType === "TEST" && (
                  <span className="text-[9px] px-1 bg-amber-200 text-amber-800 rounded">
                    T
                  </span>
                )}
                {round.completedAt && (
                  <span className="text-[9px] px-1 bg-slate-200 text-slate-500 rounded">
                    Done
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Round info */}
      {selectedRound && (
        <div className="text-center space-y-1">
          <p className="text-sm text-slate-500">
            {selectedRound.title || `Round ${selectedRound.roundNum}`}:{" "}
            <em>&ldquo;{selectedRound.topic}&rdquo;</em>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs">
            <span
              className={cn(
                "px-2 py-0.5 rounded font-medium",
                selectedRound.gameType === "TEST"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700",
              )}
            >
              {selectedRound.gameType}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded font-medium",
                isCompleted
                  ? "bg-slate-200 text-slate-500"
                  : selectedRound.status === "LIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700",
              )}
            >
              {isCompleted ? "COMPLETED" : selectedRound.status}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      {selectedRound && (
        <>
          <div className="overflow-x-auto pb-1 -mx-2 px-2">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 min-w-max mx-auto">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors capitalize whitespace-nowrap",
                    tab === t
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Completed banner */}
          {isCompleted && (
            <div className="text-center text-sm text-slate-500 bg-slate-50 rounded-lg py-2 border">
              This round is <strong>completed</strong>. No further edits
              allowed.
            </div>
          )}

          {/* Tab content */}
          {tab === "scoreboard" && (
            <ScoreboardDisplay roundId={selectedRound.id} />
          )}

          {tab === "scoring" && (
            <div className="space-y-4">
              {/* View mode toggle + score lock controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* View mode toggle */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("cell")}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                      viewMode === "cell"
                        ? "bg-white shadow-sm text-slate-800"
                        : "text-slate-500",
                    )}
                  >
                    Cell View
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                      viewMode === "table"
                        ? "bg-white shadow-sm text-slate-800"
                        : "text-slate-500",
                    )}
                  >
                    Table View
                  </button>
                </div>

                {/* Score lock deadline (JUDGE_ADMIN+) */}
                {isJudgeAdmin && !isCompleted && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRound.scoreLockDeadline ? (
                      <>
                        <span className="text-xs text-red-600 font-medium">
                          🔒 Lock:{" "}
                          {new Date(
                            selectedRound.scoreLockDeadline,
                          ).toLocaleString()}
                        </span>
                        <button
                          onClick={() => setScoreLock(true)}
                          disabled={settingLock}
                          className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Clear Lock
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="datetime-local"
                          value={lockDeadline}
                          onChange={(e) => setLockDeadline(e.target.value)}
                          className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300"
                        />
                        <button
                          onClick={() => setScoreLock(false)}
                          disabled={settingLock || !lockDeadline}
                          className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors disabled:opacity-50"
                        >
                          {settingLock ? "Setting…" : "Set Lock"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {viewMode === "cell" ? (
                <JudgeCellView
                  roundId={selectedRound.id}
                  currentUserId={user?.id}
                  isJudge={isJudge}
                  minScore={event.minScore}
                  maxScore={event.maxScore}
                />
              ) : (
                <ScoringSheet
                  roundId={selectedRound.id}
                  currentUserId={user?.id}
                  isJudge={isJudge}
                  minScore={event.minScore}
                  maxScore={event.maxScore}
                />
              )}
            </div>
          )}

          {tab === "timer" && selectedRound.timerEnabled && (
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <SpeechTimer
                  defaultDurationSec={selectedRound.speechDurationSec}
                  prepTimeSec={selectedRound.prepTimeSec}
                  topic={selectedRound.topic}
                  enabled
                />
              </div>
            </div>
          )}

          {tab === "voting" && proTeam && conTeam && (
            <AudienceVoting
              roundId={selectedRound.id}
              proTeamName={proTeam.team.name}
              conTeamName={conTeam.team.name}
              canEdit={canEditVotes}
              isCompleted={isCompleted}
            />
          )}

          {tab === "export" && (
            <div className="space-y-4 max-w-xl mx-auto">
              {/* Data export */}
              <div className="border rounded-xl bg-white shadow-sm p-5 space-y-3">
                <h3 className="font-semibold text-slate-800">Export Data</h3>
                <p className="text-sm text-slate-500">
                  Download raw scoring data for this round.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => exportResults("csv")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={() => exportResults("json")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Download JSON
                  </button>
                </div>
              </div>

              {/* Results image download */}
              <div className="border rounded-xl bg-white shadow-sm p-5 space-y-3">
                <h3 className="font-semibold text-slate-800">Results Image</h3>
                <p className="text-sm text-slate-500">
                  Download a beautiful results card as a PNG image.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?round=${selectedRound.id}&logos=both`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    <span>🏆</span> With Logos (AEC + LSUIC)
                  </a>
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?round=${selectedRound.id}&logos=none`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    <span>📋</span> Without Logos
                  </a>
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?round=${selectedRound.id}&logos=aec`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    AEC Logo Only
                  </a>
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?round=${selectedRound.id}&logos=lsuic`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    LSUIC Logo Only
                  </a>
                </div>
                {/* Custom logo option */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">
                    Custom organization logo
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      id="custom-logo-url"
                      placeholder="https://example.com/logo.png"
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-300"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          "custom-logo-url",
                        ) as HTMLInputElement;
                        const url = input?.value?.trim();
                        if (!url) return;
                        window.open(
                          `/api/tools/dbt/events/${event.slug}/results-image?round=${selectedRound.id}&logos=custom&logoUrl=${encodeURIComponent(url)}`,
                          "_blank",
                        );
                      }}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Download
                    </button>
                  </div>
                </div>
                {/* Full event (all rounds) */}
                <div className="pt-2 border-t border-slate-100">
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?logos=both`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-600 hover:underline"
                  >
                    Download results for all rounds in this event
                  </a>
                </div>
              </div>
            </div>
          )}

          {tab === "manage" && isJudgeAdmin && (
            <JudgeManager eventId={event.id} />
          )}

          {/* Complete round button (head judge / admin only) */}
          {canComplete && !isCompleted && (
            <div className="text-center pt-4 border-t">
              <button
                onClick={completeRound}
                disabled={completing}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {completing
                  ? "Completing..."
                  : "Complete Round & Lock All Scores"}
              </button>
              <p className="text-xs text-slate-400 mt-2">
                This action is permanent. All scores will be locked.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
