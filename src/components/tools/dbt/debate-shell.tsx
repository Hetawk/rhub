"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScoringSheet } from "./scoring-sheet";
import { JudgeCellView } from "./judge-cell-view";
import { JudgeManager } from "./judge-manager";
import { AudienceVoting } from "./audience-voting";
import { ScoreboardDisplay } from "./scoreboard-display";
import { ScoringProgressTicker } from "./scoring-progress-ticker";
import { SpeechTimer } from "./speech-timer";
import { AuthForm } from "./auth-form";
import { CriteriaGuide } from "./criteria-guide";
import { cn } from "@/lib/utils";
import { ROLE_HIERARCHY } from "@/lib/dbt/schemas";

// ---- Tab config with icons ----

const TAB_CONFIG: Record<
  | "scoreboard"
  | "scoring"
  | "timer"
  | "voting"
  | "criteria"
  | "export"
  | "manage",
  { icon: string; label: string; shortLabel: string }
> = {
  scoreboard: { icon: "📊", label: "Scoreboard", shortLabel: "Board" },
  scoring: { icon: "✍️", label: "Scoring", shortLabel: "Score" },
  timer: { icon: "⏱", label: "Timer", shortLabel: "Timer" },
  voting: { icon: "🗳", label: "Audience", shortLabel: "Vote" },
  criteria: { icon: "📋", label: "Criteria", shortLabel: "Guide" },
  export: { icon: "📤", label: "Export", shortLabel: "Export" },
  manage: { icon: "⚙️", label: "Manage", shortLabel: "Manage" },
};

const VALID_TABS = [
  "scoreboard",
  "scoring",
  "timer",
  "voting",
  "criteria",
  "export",
  "manage",
] as const;

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
    /** Non-draft submitted speeches for this judge slot */
    scores: { id: string; isDraft: boolean }[];
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

type Tab =
  | "scoreboard"
  | "scoring"
  | "timer"
  | "voting"
  | "criteria"
  | "export"
  | "manage";

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

  const router = useRouter();

  // Read tab from URL on first paint
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab");
    if (urlTab && (VALID_TABS as readonly string[]).includes(urlTab)) {
      setTab(urlTab as Tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Change tab and persist to URL so refresh keeps position. */
  const changeTab = (t: Tab) => {
    setTab(t);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", t);
      router.replace(`${window.location.pathname}?${params.toString()}`, {
        scroll: false,
      });
    }
  };
  const [completing, setCompleting] = useState(false);
  const [viewMode, setViewMode] = useState<"cell" | "table">("cell");
  const [lockDeadline, setLockDeadline] = useState("");
  const [settingLock, setSettingLock] = useState(false);

  // Event setup panel state (JUDGE_ADMIN+)
  const [setupSection, setSetupSection] = useState<
    "judges" | "teams" | "rounds" | "settings"
  >("judges");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
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

  // Round management state (JUDGE_ADMIN+)
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);
  const [swappingRoundId, setSwappingRoundId] = useState<string | null>(null);
  const [addingSlotRoundId, setAddingSlotRoundId] = useState<string | null>(
    null,
  );
  const [addSlotJudgeId, setAddSlotJudgeId] = useState("");
  const [removingSlotKey, setRemovingSlotKey] = useState<string | null>(null);
  const [autoAssigningRoundId, setAutoAssigningRoundId] = useState<
    string | null
  >(null);

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

  const [reopeningRound, setReopeningRound] = useState(false);

  // Re-open a completed round (wipes all scores, resets to LIVE)
  const reopenRound = async () => {
    if (!selectedRound || !canComplete) return;
    if (
      !confirm(
        "Re-open this round? All submitted scores will be cleared so judges can re-enter them. This cannot be undone.",
      )
    )
      return;
    setReopeningRound(true);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${selectedRound.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetRound: true }),
      });
      if (res.ok && eventSlug) {
        await fetchEvent(eventSlug);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to re-open round");
      }
    } catch {
      alert("Network error");
    } finally {
      setReopeningRound(false);
    }
  };

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

  // Export handler — exportRoundId: null = all rounds, or a specific round id
  const [exportRoundId, setExportRoundId] = useState<string | "all">("all");

  const exportResults = (format: "json" | "csv") => {
    if (!event) return;
    if (exportRoundId === "all") {
      window.open(
        `/api/tools/dbt/events/${event.slug}/export?format=${format}`,
        "_blank",
      );
    } else {
      window.open(
        `/api/tools/dbt/rounds/${exportRoundId}/export?format=${format}`,
        "_blank",
      );
    }
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

  // Swap PRO/CON teams for a round
  const swapTeams = async (roundId: string) => {
    setSwappingRoundId(roundId);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapTeams: true }),
      });
      if (res.ok && eventSlug) await fetchEvent(eventSlug);
      else {
        const err = await res.json();
        alert(err.error || "Failed to swap teams");
      }
    } catch {
      alert("Network error");
    } finally {
      setSwappingRoundId(null);
    }
  };

  // Add judge to an existing round's panel
  const addJudgeToSlot = async (roundId: string, judgeId: string) => {
    if (!judgeId) return;
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeId }),
      });
      if (res.ok && eventSlug) {
        await fetchEvent(eventSlug);
        setAddSlotJudgeId("");
        setAddingSlotRoundId(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign judge");
      }
    } catch {
      alert("Network error");
    }
  };

  // Auto-assign all unassigned event judges to a round
  const autoAssignAllJudges = async (
    roundId: string,
    judges: { id: string }[],
  ) => {
    if (!judges.length) return;
    setAutoAssigningRoundId(roundId);
    try {
      for (const j of judges) {
        await fetch(`/api/tools/dbt/rounds/${roundId}/slots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ judgeId: j.id }),
        });
      }
      if (eventSlug) await fetchEvent(eventSlug);
    } catch {
      alert("Network error while auto-assigning judges");
    } finally {
      setAutoAssigningRoundId(null);
    }
  };

  // Remove judge from a round's panel
  const removeJudgeFromSlot = async (roundId: string, slotId: string) => {
    if (!confirm("Remove this judge from the round?")) return;
    setRemovingSlotKey(slotId);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/slots`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      if (res.ok && eventSlug) await fetchEvent(eventSlug);
      else {
        const err = await res.json();
        alert(err.error || "Failed to remove judge");
      }
    } catch {
      alert("Network error");
    } finally {
      setRemovingSlotKey(null);
    }
  };

  // Delete a round
  const deleteRound = async (roundId: string, roundLabel: string) => {
    if (
      !confirm(
        `Delete "${roundLabel}"? All scores and judge assignments for this round will be permanently removed.`,
      )
    )
      return;
    setDeletingRoundId(roundId);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}`, {
        method: "DELETE",
      });
      if (res.ok && eventSlug) {
        await fetchEvent(eventSlug);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete round");
      }
    } catch {
      alert("Network error");
    } finally {
      setDeletingRoundId(null);
    }
  };

  // Update round topic
  const updateRoundTopic = async (roundId: string, topic: string) => {
    try {
      await fetch(`/api/tools/dbt/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (eventSlug) await fetchEvent(eventSlug);
    } catch {
      /* ignore */
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
  tabs.push("criteria");
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
        <div className="flex items-center text-sm bg-muted/40 rounded-lg px-4 py-2 border gap-2 flex-wrap">
          <span className="text-muted-foreground">
            Signed in as{" "}
            <strong className="text-foreground">{user.name}</strong>
          </span>
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
            {user.role}
          </span>
          {isJudge && (
            <span className="text-xs text-ekd-gold font-semibold px-1.5 py-0.5 bg-ekd-gold/10 rounded">
              Judge
            </span>
          )}
          {canEditVotes && (
            <span className="text-xs text-purple-700 font-semibold px-1.5 py-0.5 bg-purple-100 rounded">
              Head Judge
            </span>
          )}
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
          <div className="flex border-b border-border overflow-x-auto">
            {(["judges", "teams", "rounds", "settings"] as const).map(
              (section) => (
                <button
                  key={section}
                  onClick={() => setSetupSection(section)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                    setupSection === section
                      ? "text-ekd-gold border-ekd-gold"
                      : "text-muted-foreground border-transparent hover:text-foreground",
                  )}
                >
                  {section === "judges"
                    ? `Judges (${event.judges.length})`
                    : section === "teams"
                      ? `Teams (${event.teams.length})`
                      : section === "rounds"
                        ? "Add Round"
                        : "⚙ Settings"}
                </button>
              ),
            )}
          </div>

          {/* Panel content */}
          <div className="p-4">
            {/* Judges section */}
            {setupSection === "judges" && <JudgeManager eventId={event.id} />}

            {/* Settings section */}
            {setupSection === "settings" && (
              <div className="space-y-6">
                {/* Event Status */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Event Status
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current:{" "}
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-xs font-semibold",
                        event.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : event.status === "COMPLETED"
                            ? "bg-muted text-muted-foreground"
                            : event.status === "REGISTRATION"
                              ? "bg-blue-500/15 text-blue-600"
                              : event.status === "ARCHIVED"
                                ? "bg-zinc-500/15 text-zinc-500"
                                : "bg-ekd-gold/15 text-ekd-dark-brown",
                      )}
                    >
                      {event.status}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        "DRAFT",
                        "REGISTRATION",
                        "ACTIVE",
                        "COMPLETED",
                        "ARCHIVED",
                      ] as const
                    ).map((s) => (
                      <button
                        key={s}
                        disabled={event.status === s || updatingStatus}
                        onClick={async () => {
                          setUpdatingStatus(true);
                          try {
                            const res = await fetch(
                              `/api/tools/dbt/events/${event.id}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: s }),
                              },
                            );
                            if (res.ok && eventSlug) {
                              await fetchEvent(eventSlug);
                            } else {
                              const err = await res.json();
                              alert(err.error || "Failed to update status");
                            }
                          } catch {
                            alert("Network error");
                          } finally {
                            setUpdatingStatus(false);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          event.status === s
                            ? "border-ekd-gold bg-ekd-gold/15 text-ekd-dark-brown cursor-default"
                            : "border-border text-muted-foreground hover:border-ekd-gold/60 hover:text-foreground disabled:opacity-40",
                        )}
                      >
                        {s === "ACTIVE"
                          ? "🟢 ACTIVE"
                          : s === "COMPLETED"
                            ? "✅ COMPLETED"
                            : s === "REGISTRATION"
                              ? "📋 REGISTRATION"
                              : s === "ARCHIVED"
                                ? "🗄 ARCHIVED"
                                : "📝 DRAFT"}
                      </button>
                    ))}
                  </div>
                  {updatingStatus && (
                    <p className="text-xs text-muted-foreground">Saving…</p>
                  )}
                </div>

                {/* Danger zone */}
                <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                    Danger Zone
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this event and all its rounds, scores,
                    and data. This cannot be undone.
                  </p>
                  <button
                    disabled={deletingEvent}
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Delete "${event.title}" permanently? This will remove all rounds and scores. This cannot be undone.`,
                      );
                      if (!confirmed) return;
                      setDeletingEvent(true);
                      try {
                        const res = await fetch(
                          `/api/tools/dbt/events/${event.id}`,
                          { method: "DELETE" },
                        );
                        if (res.ok) {
                          // Redirect back to event list
                          window.location.href = "/tools/dbt";
                        } else {
                          const err = await res.json();
                          alert(err.error || "Failed to delete event");
                        }
                      } catch {
                        alert("Network error");
                      } finally {
                        setDeletingEvent(false);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {deletingEvent ? "Deleting…" : "🗑 Delete Event"}
                  </button>
                </div>
              </div>
            )}

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
                {event.teams.length >= 2 && event.rounds.length === 0 && (
                  <div className="mt-3 bg-ekd-gold/10 border border-ekd-gold/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-ekd-dark-brown font-medium">
                      You have {event.teams.length} teams ready. Now create a
                      round to start scoring!
                    </p>
                    <button
                      onClick={() => setSetupSection("rounds")}
                      className="shrink-0 px-3 py-1.5 bg-ekd-gold text-white rounded-lg text-xs font-semibold hover:bg-ekd-light-gold transition-colors"
                    >
                      Add Round →
                    </button>
                  </div>
                )}
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
                    {event.judges.length > 0 && (
                      <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                        <strong>
                          {event.judges.length} judge
                          {event.judges.length !== 1 ? "s" : ""}
                        </strong>{" "}
                        ({event.judges.map((j) => j.alias).join(", ")}) will be
                        auto-assigned to score this round.
                      </p>
                    )}
                    {event.judges.length === 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        No judges assigned yet. Add judges first so they can
                        score this round.
                      </p>
                    )}
                    {event.judges.length === 2 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                        <strong>2 of 3 recommended judges assigned.</strong> A
                        panel average will be calculated as the 3rd judge score
                        in the scoreboard.
                      </p>
                    )}
                    {event.judges.length === 1 && (
                      <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                        <strong>Only 1 judge assigned.</strong> The recommended
                        minimum is 3 judges per round. Add more judges before
                        creating this round.
                      </p>
                    )}
                  </div>
                )}

                {/* ── Existing Round Management ── */}
                {event.rounds.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border pt-4">
                      Existing Rounds — Teams &amp; Judges
                    </p>
                    {event.rounds.map((r) => {
                      const rPro = r.roundTeams.find((rt) => rt.side === "PRO");
                      const rCon = r.roundTeams.find((rt) => rt.side === "CON");
                      const availableJudges = event.judges.filter(
                        (j) =>
                          !r.judgeSlots.some(
                            (s) => s.judge.user.id === j.user.id,
                          ),
                      );
                      return (
                        <div
                          key={r.id}
                          className="border border-border rounded-xl bg-muted/20 p-3 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">
                                {r.title || `Round ${r.roundNum}`}
                              </p>
                              <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-2">
                                {r.topic}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
                                  r.completedAt
                                    ? "bg-muted text-muted-foreground"
                                    : r.status === "LIVE"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 animate-pulse"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                )}
                              >
                                {r.completedAt
                                  ? "✅ Done"
                                  : r.status === "LIVE"
                                    ? "🔴 LIVE"
                                    : r.status}
                              </span>
                              {!r.completedAt && (
                                <button
                                  onClick={() =>
                                    deleteRound(
                                      r.id,
                                      r.title || `Round ${r.roundNum}`,
                                    )
                                  }
                                  disabled={deletingRoundId === r.id}
                                  title="Delete this round"
                                  className="flex items-center justify-center w-6 h-6 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-40 text-xs"
                                >
                                  {deletingRoundId === r.id ? "…" : "🗑"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* PRO / CON with swap */}
                          {rPro && rCon && (
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-bold border border-emerald-300 dark:border-emerald-700 min-w-22.5">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                  PRO
                                </span>
                                {rPro.team.name}
                              </div>
                              {!r.completedAt && (
                                <button
                                  onClick={() => swapTeams(r.id)}
                                  disabled={swappingRoundId === r.id}
                                  title="Swap PRO / CON sides"
                                  className="flex items-center gap-1.5 px-3.5 py-2 border-2 border-[#C8A061] rounded-xl bg-[#C8A061]/10 hover:bg-[#C8A061]/20 text-[#C8A061] font-bold text-sm transition-colors disabled:opacity-50 shadow-sm"
                                >
                                  <span className="text-base leading-none">
                                    {swappingRoundId === r.id ? "…" : "⇄"}
                                  </span>
                                  <span className="text-xs font-semibold tracking-wide">
                                    {swappingRoundId === r.id
                                      ? "Swapping"
                                      : "Swap"}
                                  </span>
                                </button>
                              )}
                              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 text-red-700 dark:text-red-400 text-sm font-bold border border-red-300 dark:border-red-700 min-w-22.5">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                  CON
                                </span>
                                {rCon.team.name}
                              </div>
                            </div>
                          )}

                          {/* Judge slots */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                Judge Panel
                              </p>
                              {r.judgeSlots.length > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {r.judgeSlots.length} assigned
                                </span>
                              )}
                            </div>

                            {r.judgeSlots.length === 0 ? (
                              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                                No judges assigned to this round yet. Use the
                                buttons below to assign.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {r.judgeSlots
                                  .slice()
                                  .sort((a, b) => a.position - b.position)
                                  .map((slot) => {
                                    // 7 speech types × 2 sides = 14 total scorable speeches
                                    const submitted = slot.scores.filter(
                                      (s) => !s.isDraft,
                                    ).length;
                                    const total = 14;
                                    const pct = Math.round(
                                      (submitted / total) * 100,
                                    );
                                    const hasStarted = submitted > 0;
                                    const isDone = submitted === total;
                                    return (
                                      <div
                                        key={slot.id}
                                        className={cn(
                                          "group flex flex-col gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors min-w-[80px]",
                                          slot.judge.isHeadJudge
                                            ? "bg-[#C8A061]/10 border-[#C8A061]/40 text-[#1F1C18] dark:text-[#C8A061]"
                                            : isDone
                                              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                                              : hasStarted
                                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300"
                                                : "bg-muted/50 border-border text-muted-foreground",
                                        )}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          {/* Live dot */}
                                          <span
                                            className={cn(
                                              "w-1.5 h-1.5 rounded-full shrink-0",
                                              isDone
                                                ? "bg-emerald-500"
                                                : hasStarted
                                                  ? "bg-blue-500 animate-pulse"
                                                  : "bg-muted-foreground/40",
                                            )}
                                          />
                                          <span className="font-mono text-[10px] opacity-60">
                                            J{slot.position}
                                          </span>
                                          <span className="font-semibold">
                                            {slot.judge.alias}
                                          </span>
                                          {slot.judge.isHeadJudge && (
                                            <span className="text-[9px] bg-[#C8A061] text-white px-1 py-0.5 rounded font-bold uppercase tracking-wide">
                                              HEAD
                                            </span>
                                          )}
                                          {isDone && (
                                            <span className="text-[9px] bg-emerald-500 text-white px-1 py-0.5 rounded font-bold uppercase">
                                              ✓ Done
                                            </span>
                                          )}
                                          {!r.completedAt && (
                                            <button
                                              onClick={() =>
                                                removeJudgeFromSlot(
                                                  r.id,
                                                  slot.id,
                                                )
                                              }
                                              disabled={
                                                removingSlotKey === slot.id
                                              }
                                              className="ml-0.5 w-4 h-4 flex items-center justify-center rounded text-current opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400 transition-all disabled:opacity-30"
                                            >
                                              {removingSlotKey === slot.id
                                                ? "…"
                                                : "✕"}
                                            </button>
                                          )}
                                        </div>
                                        {/* Progress bar */}
                                        {r.status !== "SCHEDULED" && (
                                          <div className="w-full">
                                            <div className="flex justify-between text-[9px] opacity-60 mb-0.5">
                                              <span>
                                                {hasStarted
                                                  ? isDone
                                                    ? "Complete"
                                                    : "Scoring…"
                                                  : "Not started"}
                                              </span>
                                              <span>
                                                {submitted}/{total}
                                              </span>
                                            </div>
                                            <div className="h-1 w-full bg-current/10 rounded-full overflow-hidden">
                                              <div
                                                className={cn(
                                                  "h-full rounded-full transition-all",
                                                  isDone
                                                    ? "bg-emerald-500"
                                                    : hasStarted
                                                      ? "bg-blue-500"
                                                      : "bg-muted-foreground/30",
                                                )}
                                                style={{ width: `${pct}%` }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            )}

                            {/* Assign judges buttons */}
                            {!r.completedAt && availableJudges.length > 0 && (
                              <div className="space-y-1.5 pt-0.5">
                                {/* Assign all at once */}
                                <button
                                  onClick={() =>
                                    autoAssignAllJudges(r.id, availableJudges)
                                  }
                                  disabled={autoAssigningRoundId === r.id}
                                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#C8A061] hover:bg-[#D4AF6A] active:bg-[#b8904f] text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                                >
                                  {autoAssigningRoundId === r.id
                                    ? "Assigning…"
                                    : `+ Assign all unassigned judges (${availableJudges.length})`}
                                </button>

                                {/* Or assign one specific judge */}
                                {addingSlotRoundId === r.id ? (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={addSlotJudgeId}
                                      onChange={(e) =>
                                        setAddSlotJudgeId(e.target.value)
                                      }
                                      className="flex-1 text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ekd-gold/40"
                                    >
                                      <option value="">Select judge…</option>
                                      {availableJudges.map((j) => (
                                        <option key={j.id} value={j.id}>
                                          {j.alias}
                                          {j.isHeadJudge ? " (Head)" : ""}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() =>
                                        addJudgeToSlot(r.id, addSlotJudgeId)
                                      }
                                      disabled={!addSlotJudgeId}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                                    >
                                      Assign
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAddingSlotRoundId(null);
                                        setAddSlotJudgeId("");
                                      }}
                                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setAddingSlotRoundId(r.id);
                                      setAddSlotJudgeId("");
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-[#C8A061]/50 hover:bg-[#C8A061]/5 transition-colors"
                                  >
                                    + Assign a specific judge
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
          {/* Sticky tab bar */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4 pb-0 pt-1">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-0.5 min-w-max">
                {tabs.map((t) => {
                  const cfg = TAB_CONFIG[t];
                  const isLive =
                    t === "scoreboard" &&
                    selectedRound.status === "LIVE" &&
                    !isCompleted;
                  return (
                    <button
                      key={t}
                      onClick={() => changeTab(t)}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap border-b-2 focus:outline-none",
                        tab === t
                          ? "border-[#C8A061] text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                      )}
                    >
                      <span className="text-sm">{cfg.icon}</span>
                      <span className="hidden sm:inline">{cfg.label}</span>
                      <span className="sm:hidden">{cfg.shortLabel}</span>
                      {isLive && (
                        <span className="inline-flex items-center gap-0.5 ml-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-green-500 text-white rounded-full animate-pulse">
                          LIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
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

              {/* Pending-submission ticker — sits between the toggle and the scoring view */}
              <ScoringProgressTicker roundId={selectedRound.id} />

              {viewMode === "cell" ? (
                <JudgeCellView
                  roundId={selectedRound.id}
                  currentUserId={user?.id}
                  isJudge={isJudge}
                  canStartRound={isHeadJudgeOrAbove(user, event)}
                  canManageRound={isHeadJudgeOrAbove(user, event)}
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
              <div className="w-full max-w-2xl">
                <SpeechTimer
                  defaultDurationSec={selectedRound.speechDurationSec}
                  topic={selectedRound.topic}
                  onTopicChange={
                    isJudgeAdmin
                      ? (t) => updateRoundTopic(selectedRound.id, t)
                      : undefined
                  }
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

          {tab === "criteria" && <CriteriaGuide />}

          {tab === "export" && (
            <div className="space-y-4 max-w-xl mx-auto">
              {/* Data export */}
              <div className="border rounded-xl bg-card shadow-sm p-5 space-y-4">
                <h3 className="font-semibold text-foreground">
                  Export Scoring Data
                </h3>

                {/* Round selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Select Round
                  </label>
                  <select
                    value={exportRoundId}
                    onChange={(e) => setExportRoundId(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/40"
                  >
                    <option value="all">All Rounds (full event export)</option>
                    {event?.rounds.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title ?? `Round ${r.roundNum}`}
                        {r.topic
                          ? ` — ${r.topic.length > 50 ? r.topic.slice(0, 50) + "…" : r.topic}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {exportRoundId === "all"
                      ? `Exports all ${event?.rounds.length ?? 0} round(s) in one file.`
                      : `Exports only the selected round.`}
                  </p>
                </div>

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

          {/* Complete / Re-open round (head judge / admin only) */}
          {canComplete && (
            <div className="text-center pt-4 border-t space-y-3">
              {isCompleted ? (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
                    <span>✅</span> Round Completed
                  </div>
                  <div>
                    <button
                      onClick={reopenRound}
                      disabled={reopeningRound}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {reopeningRound ? "Re-opening..." : "🔓 Re-open Round"}
                    </button>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Clears all scores so judges can re-enter them.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={completeRound}
                    disabled={completing}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {completing
                      ? "Completing..."
                      : "Complete Round & Lock All Scores"}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    This action is permanent. All scores will be locked.
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
