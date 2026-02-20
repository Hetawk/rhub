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

  // Event setup panel state (JUDGE_ADMIN+)
  const [setupSection, setSetupSection] = useState<
    "judges" | "teams" | "rounds"
  >("judges");
  const [teamName, setTeamName] = useState("");
  const [teamCity, setTeamCity] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [newRoundTopic, setNewRoundTopic] = useState("");
  const [newRoundProTeam, setNewRoundProTeam] = useState("");
  const [newRoundConTeam, setNewRoundConTeam] = useState("");
  const [newRoundGameType, setNewRoundGameType] = useState<"TEST" | "REAL">(
    "REAL",
  );
  const [newRoundTitle, setNewRoundTitle] = useState("");
  const [addingRound, setAddingRound] = useState(false);

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

  // Add team handler
  const addTeam = async () => {
    if (!teamName.trim() || !event) return;
    setAddingTeam(true);
    try {
      const res = await fetch(`/api/tools/dbt/events/${event.id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          city: teamCity.trim() || undefined,
        }),
      });
      if (res.ok && eventSlug) {
        setTeamName("");
        setTeamCity("");
        await fetchEvent(eventSlug);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add team");
      }
    } catch {
      alert("Network error");
    } finally {
      setAddingTeam(false);
    }
  };

  // Create round handler
  const createRound = async () => {
    if (!event || !newRoundTopic.trim() || !newRoundProTeam || !newRoundConTeam)
      return;
    setAddingRound(true);
    try {
      const res = await fetch(`/api/tools/dbt/events/${event.id}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: newRoundTopic.trim(),
          proTeamId: newRoundProTeam,
          conTeamId: newRoundConTeam,
          gameType: newRoundGameType,
          title: newRoundTitle.trim() || undefined,
        }),
      });
      if (res.ok && eventSlug) {
        setNewRoundTopic("");
        setNewRoundProTeam("");
        setNewRoundConTeam("");
        setNewRoundTitle("");
        await fetchEvent(eventSlug);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create round");
      }
    } catch {
      alert("Network error");
    } finally {
      setAddingRound(false);
    }
  };

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ekd-gold border-t-transparent" />
      </div>
    );
  }

  // Events list
  if (!eventSlug && !event) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Debate Events
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Select an event to view or participate
            </p>
          </div>
          {eventsTotal > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              {eventsTotal} event{eventsTotal !== 1 ? "s" : ""} total
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-border bg-card text-center py-16 px-6">
            <p className="text-base font-medium text-foreground">
              No events yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Events will appear here once they are created.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {events.map((evt) => (
                <a
                  key={evt.id}
                  href={`/tools/dbt/${evt.slug}`}
                  className="group block p-4 rounded-xl border border-border bg-card hover:border-ekd-gold/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground group-hover:text-ekd-gold transition-colors flex-1">
                      {evt.title}
                    </h3>
                    {evt.gameType === "TEST" && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-ekd-gold/15 text-ekd-dark-brown rounded">
                        TEST
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium",
                      evt.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : evt.status === "COMPLETED"
                          ? "bg-muted text-muted-foreground"
                          : "bg-ekd-gold/10 text-ekd-dark-brown",
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
                  className="px-3 py-1.5 border border-border rounded-lg text-sm text-foreground hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {eventsPage} of {eventsTotalPages}
                </span>
                <button
                  onClick={() =>
                    setEventsPage((p) => Math.min(eventsTotalPages, p + 1))
                  }
                  disabled={eventsPage >= eventsTotalPages}
                  className="px-3 py-1.5 border border-border rounded-lg text-sm text-foreground hover:bg-accent disabled:opacity-40 transition-colors"
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
    return (
      <p className="text-center text-muted-foreground py-12">
        Event not found.
      </p>
    );
  }

  // Build available tabs
  const tabs: Tab[] = ["scoreboard", "scoring"];
  if (selectedRound?.timerEnabled) tabs.push("timer");
  tabs.push("voting");
  if (isAdmin || canEditVotes) tabs.push("export");

  return (
    <div className="space-y-6">
      {/* Event header */}
      <div className="text-center space-y-1">
        {event.organizer && (
          <p className="text-sm font-semibold text-muted-foreground">
            {event.organizer}
          </p>
        )}
        <h1 className="text-xl md:text-2xl font-bold text-foreground">
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
        <div className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-4 py-2 border">
          <span className="text-muted-foreground">
            Signed in as{" "}
            <strong className="text-foreground">{user.name}</strong>
            <span className="ml-2 text-xs text-muted-foreground">
              ({user.role})
            </span>
            {isJudge && (
              <span className="ml-1 text-ekd-gold font-medium">(Judge)</span>
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
            className="text-muted-foreground hover:text-red-500 text-xs"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Event Setup Panel — always visible for JUDGE_ADMIN+ */}
      {isJudgeAdmin && (
        <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-sm font-semibold text-foreground">
              Event Management
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-ekd-gold/15 text-ekd-dark-brown font-medium">
              Admin
            </span>
          </div>

          {/* Sub-tabs */}
          <div className="flex border-b border-border">
            {(["judges", "teams", "rounds"] as const).map((section) => (
              <button
                key={section}
                onClick={() => setSetupSection(section)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                  setupSection === section
                    ? "text-ekd-gold border-ekd-gold"
                    : "text-muted-foreground border-transparent hover:text-foreground",
                )}
              >
                {section === "judges"
                  ? `Judges (${event.judges.length})`
                  : section === "teams"
                    ? `Teams (${event.teams.length})`
                    : "Add Round"}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="p-4">
            {/* Judges section */}
            {setupSection === "judges" && <JudgeManager eventId={event.id} />}

            {/* Teams section */}
            {setupSection === "teams" && (
              <div className="space-y-4">
                {event.teams.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Current Teams
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {event.teams.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {t.name}
                          </span>
                          {t.city && (
                            <span className="text-muted-foreground">
                              · {t.city}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No teams yet. Add teams below, then create a round.
                  </p>
                )}
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Add Team
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Team name *"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTeam()}
                      className="flex-1 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ekd-gold/40 bg-background"
                    />
                    <input
                      type="text"
                      placeholder="City / school (optional)"
                      value={teamCity}
                      onChange={(e) => setTeamCity(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTeam()}
                      className="flex-1 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ekd-gold/40 bg-background"
                    />
                    <button
                      onClick={addTeam}
                      disabled={addingTeam || !teamName.trim()}
                      className="px-4 py-2 bg-ekd-gold hover:bg-ekd-light-gold text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {addingTeam ? "Adding…" : "+ Add Team"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Round section */}
            {setupSection === "rounds" && (
              <div className="space-y-4">
                {event.teams.length < 2 ? (
                  <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4">
                    You need at least 2 teams to create a round.{" "}
                    <button
                      onClick={() => setSetupSection("teams")}
                      className="text-ekd-gold hover:underline font-medium"
                    >
                      Go to Teams →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Resolution / Topic *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. This house believes that…"
                          value={newRoundTopic}
                          onChange={(e) => setNewRoundTopic(e.target.value)}
                          className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ekd-gold/40 bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Round title (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Round 1 — Finals"
                          value={newRoundTitle}
                          onChange={(e) => setNewRoundTitle(e.target.value)}
                          className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ekd-gold/40 bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Game type
                        </label>
                        <select
                          value={newRoundGameType}
                          onChange={(e) =>
                            setNewRoundGameType(
                              e.target.value as "TEST" | "REAL",
                            )
                          }
                          className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ekd-gold/40 bg-card"
                        >
                          <option value="REAL">REAL (Official)</option>
                          <option value="TEST">TEST (Practice)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          PRO side team *
                        </label>
                        <select
                          value={newRoundProTeam}
                          onChange={(e) => setNewRoundProTeam(e.target.value)}
                          className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ekd-gold/40 bg-card"
                        >
                          <option value="">Select team…</option>
                          {event.teams
                            .filter((t) => t.id !== newRoundConTeam)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          CON side team *
                        </label>
                        <select
                          value={newRoundConTeam}
                          onChange={(e) => setNewRoundConTeam(e.target.value)}
                          className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ekd-gold/40 bg-card"
                        >
                          <option value="">Select team…</option>
                          {event.teams
                            .filter((t) => t.id !== newRoundProTeam)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={createRound}
                      disabled={
                        addingRound ||
                        !newRoundTopic.trim() ||
                        !newRoundProTeam ||
                        !newRoundConTeam
                      }
                      className="px-5 py-2 bg-ekd-gold hover:bg-ekd-light-gold text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {addingRound ? "Creating…" : "Create Round"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No rounds empty state for non-admin visitors */}
      {!isJudgeAdmin && event.rounds.length === 0 && (
        <div className="rounded-xl border border-border bg-card text-center py-12 px-6">
          <p className="text-base font-medium text-foreground">
            No rounds yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Check back once the organizer has set up the rounds.
          </p>
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
                    ? "bg-ekd-gold text-ekd-dark-brown border-ekd-gold"
                    : "bg-card text-foreground border-border hover:border-ekd-gold/40",
                )}
              >
                {round.title || `Round ${round.roundNum}`}
                {round.gameType === "TEST" && (
                  <span className="text-[9px] px-1 bg-ekd-gold/20 text-ekd-dark-brown rounded">
                    T
                  </span>
                )}
                {round.completedAt && (
                  <span className="text-[9px] px-1 bg-muted text-muted-foreground rounded">
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
          <p className="text-sm text-muted-foreground">
            {selectedRound.title || `Round ${selectedRound.roundNum}`}:{" "}
            <em>&ldquo;{selectedRound.topic}&rdquo;</em>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs">
            <span
              className={cn(
                "px-2 py-0.5 rounded font-medium",
                selectedRound.gameType === "TEST"
                  ? "bg-ekd-gold/15 text-ekd-dark-brown"
                  : "bg-emerald-100 text-emerald-700",
              )}
            >
              {selectedRound.gameType}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded font-medium",
                isCompleted
                  ? "bg-muted text-muted-foreground"
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
            <div className="flex gap-1 bg-muted rounded-lg p-1 min-w-max mx-auto">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors capitalize whitespace-nowrap",
                    tab === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Completed banner */}
          {isCompleted && (
            <div className="text-center text-sm text-muted-foreground bg-muted/40 rounded-lg py-2 border">
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
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("cell")}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                      viewMode === "cell"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    Cell View
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                      viewMode === "table"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground",
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
                          className="text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ekd-gold/40"
                        />
                        <button
                          onClick={() => setScoreLock(false)}
                          disabled={settingLock || !lockDeadline}
                          className="text-xs px-3 py-1 bg-ekd-gold hover:bg-ekd-light-gold text-white rounded transition-colors disabled:opacity-50"
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
              <div className="border rounded-xl bg-card shadow-sm p-5 space-y-3">
                <h3 className="font-semibold text-foreground">Export Data</h3>
                <p className="text-sm text-muted-foreground">
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
              <div className="border rounded-xl bg-card shadow-sm p-5 space-y-3">
                <h3 className="font-semibold text-foreground">Results Image</h3>
                <p className="text-sm text-muted-foreground">
                  Download a beautiful results card as a PNG image.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?round=${selectedRound.id}&logos=both`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-ekd-gold hover:bg-ekd-light-gold text-white rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    <span>🏆</span> With Logos (AEC + LSUIC)
                  </a>
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?round=${selectedRound.id}&logos=none`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-ekd-dark-brown hover:bg-ekd-charcoal text-white rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    <span>📋</span> Without Logos
                  </a>
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?round=${selectedRound.id}&logos=aec`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted text-foreground rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    AEC Logo Only
                  </a>
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?round=${selectedRound.id}&logos=lsuic`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted text-foreground rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    LSUIC Logo Only
                  </a>
                </div>
                {/* Custom logo option */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground font-medium">
                    Custom organization logo
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      id="custom-logo-url"
                      placeholder="https://example.com/logo.png"
                      className="flex-1 text-xs border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ekd-gold/40"
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
                      className="px-3 py-2 bg-ekd-dark-brown hover:bg-ekd-charcoal text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Download
                    </button>
                  </div>
                </div>
                {/* Full event (all rounds) */}
                <div className="pt-2 border-t border-border">
                  <a
                    href={`/api/tools/dbt/events/${event.slug}/results-image?logos=both`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ekd-gold hover:underline"
                  >
                    Download results for all rounds in this event
                  </a>
                </div>
              </div>
            </div>
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
              <p className="text-xs text-muted-foreground mt-2">
                This action is permanent. All scores will be locked.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
