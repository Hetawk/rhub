"use client";

/**
 * JudgeCellView — Displays each judge in their own isolated card/cell.
 *
 * Layout:
 *  - All judge cells shown side-by-side on desktop (responsive grid)
 *  - Current judge's cell is fully editable
 *  - Other judges' cells show read-only scores (view-only)
 *  - Score lock countdown displayed in header
 *  - Fully mobile-responsive (stacks to single column)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  SPEECH_TYPES,
  SPEECH_CRITERIA,
  SCORING,
  SIDE_COLORS,
  type SpeechTypeKey,
} from "@/lib/dbt";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CriteriaScoreData {
  criteriaKey: string;
  score: number;
}

interface SpeechScoreData {
  id: string;
  speechType: string;
  totalScore: number | null;
  comment: string | null;
  isDraft: boolean; // true = live-sync only; false = judge pressed Submit
  isLocked: boolean;
  lockedAt: string | null;
  criteria: CriteriaScoreData[];
}

interface RoundTeamData {
  id: string;
  side: "PRO" | "CON";
  team: { id: string; name: string };
  scores: (SpeechScoreData & {
    slot: {
      id: string;
      position: number;
      judge: { alias: string; user: { name: string } };
    };
  })[];
}

interface JudgeSlotData {
  id: string;
  position: number;
  judge: {
    id: string;
    alias: string;
    userId: string;
    user: { id: string; name: string };
  };
}

interface LockInfo {
  scoreLockDeadline: string | null;
  scoreEditingLocked: boolean;
  isCompleted: boolean;
  roundStatus: string;
}

interface Props {
  roundId: string;
  currentUserId?: string;
  isJudge: boolean;
  canStartRound?: boolean;
  canManageRound?: boolean;
  minScore?: number;
  maxScore?: number;
}

// ─── Draft persistence ────────────────────────────────────────────────────────

function makeDraftKey(roundId: string, userId: string) {
  return `dbt-cell-draft-${roundId}-${userId}`;
}
function loadDraft(roundId: string, userId: string) {
  if (typeof window === "undefined") return null;
  try {
    const r = localStorage.getItem(makeDraftKey(roundId, userId));
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveDraft(roundId: string, userId: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(makeDraftKey(roundId, userId), JSON.stringify(data));
  } catch {
    /* quota exceeded — ignore */
  }
}

// ─── Per-score lock countdown badge ─────────────────────────────────────────

function ScoreLockCountdown({ lockedAt }: { lockedAt: string }) {
  const countdown = useCountdown(lockedAt);
  if (countdown === null) return null;
  if (countdown <= 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5">
        🔒 locked
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5 font-mono",
        countdown <= 10
          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
      )}
    >
      ⏱ editable for {countdown}s
    </span>
  );
}

// ─── Countdown helpers ────────────────────────────────────────────────────────

function useCountdown(deadline: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) {
      setRemaining(null);
      return;
    }
    const update = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(deadline).getTime() - Date.now()) / 1000),
      );
      setRemaining(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return remaining;
}

function formatCountdown(secs: number): string {
  if (secs <= 0) return "Locked";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Score input slider/stepper ───────────────────────────────────────────────

function ScoreInput({
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [inputStr, setInputStr] = useState(value.toFixed(1));
  const [focused, setFocused] = useState(false);

  // Keep display in sync when stepper buttons change the value externally
  useEffect(() => {
    if (!focused) setInputStr(value.toFixed(1));
  }, [value, focused]);

  const commit = (str: string) => {
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, +parsed.toFixed(1)));
      onChange(clamped);
    } else {
      // Reset to current value on invalid input
      setInputStr(value.toFixed(1));
    }
    setFocused(false);
  };

  const colorClass =
    value >= max * 0.85
      ? "text-emerald-600 dark:text-emerald-400"
      : value <= min + 0.5
        ? "text-red-500 dark:text-red-400"
        : "text-slate-700 dark:text-slate-200";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="w-7 h-7 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 text-sm font-bold flex items-center justify-center disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 transition-colors shrink-0"
        onClick={() => onChange(Math.max(min, +(value - 0.5).toFixed(1)))}
        disabled={disabled || value <= min}
        aria-label="Decrease score"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        step={0.5}
        value={focused ? inputStr : value.toFixed(1)}
        onChange={(e) => setInputStr(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          setInputStr(value.toFixed(1));
          e.target.select();
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        }}
        disabled={disabled}
        className={cn(
          "w-14 text-center font-mono text-sm font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md px-1 py-1 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-colors",
          "disabled:opacity-40 disabled:bg-transparent disabled:border-transparent disabled:cursor-not-allowed",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          colorClass,
        )}
      />
      <button
        type="button"
        className="w-7 h-7 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 text-sm font-bold flex items-center justify-center disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 transition-colors shrink-0"
        onClick={() => onChange(Math.min(max, +(value + 0.5).toFixed(1)))}
        disabled={disabled || value >= max}
        aria-label="Increase score"
      >
        +
      </button>
    </div>
  );
}

// ─── Read-only judge cell ─────────────────────────────────────────────────────

function ReadOnlyCell({
  slot,
  roundTeams,
}: {
  slot: JudgeSlotData;
  roundTeams: RoundTeamData[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeSpeech, setActiveSpeech] = useState<SpeechTypeKey>(
    SPEECH_TYPES[0].key,
  );
  const proTeam = roundTeams.find((t) => t.side === "PRO");
  const conTeam = roundTeams.find((t) => t.side === "CON");

  const getScore = (team: RoundTeamData | undefined, speechType: string) =>
    team?.scores.find(
      (s) => s.slot.id === slot.id && s.speechType === speechType,
    );

  const submittedCount = SPEECH_TYPES.reduce((n, sp) => {
    const pro = getScore(proTeam, sp.key);
    const con = getScore(conTeam, sp.key);
    // Only count finalized (non-draft) scores in the progress bar
    return n + (pro && !pro.isDraft ? 1 : 0) + (con && !con.isDraft ? 1 : 0);
  }, 0);
  const totalPossible = SPEECH_TYPES.length * 2;
  const progressPct = Math.round((submittedCount / totalPossible) * 100);

  const speech =
    SPEECH_TYPES.find((s) => s.key === activeSpeech) ?? SPEECH_TYPES[0];
  const criteria = SPEECH_CRITERIA[speech.key] ?? [];
  const proScore = getScore(proTeam, speech.key);
  const conScore = getScore(conTeam, speech.key);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Cell header */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest">
            J{slot.position} · Observer View
          </p>
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">
            {slot.judge.alias}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {slot.judge.user.name}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "text-xs font-medium border rounded-lg px-3 py-1.5 transition-colors",
            expanded
              ? "bg-slate-700 dark:bg-slate-600 text-white border-slate-700 dark:border-slate-600"
              : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200",
          )}
        >
          {expanded ? "↑ Collapse" : "↓ View Scores"}
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressPct === 100
                  ? "bg-emerald-500"
                  : progressPct > 0
                    ? "bg-amber-400"
                    : "bg-slate-300 dark:bg-slate-600",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="tabular-nums shrink-0">
            {submittedCount}/{totalPossible} submitted
          </span>
          {progressPct === 100 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
              ✓ Complete
            </span>
          )}
        </div>
      </div>

      {/* Expanded score viewer */}
      {expanded && (
        <div>
          {/* Speech tabs */}
          <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 scrollbar-hide">
            {SPEECH_TYPES.map((sp) => {
              const proS = getScore(proTeam, sp.key);
              const conS = getScore(conTeam, sp.key);
              const done = !!proS && !!conS;
              const partial = (!!proS || !!conS) && !done;
              return (
                <button
                  key={sp.key}
                  onClick={() => setActiveSpeech(sp.key)}
                  className={cn(
                    "flex-shrink-0 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeSpeech === sp.key
                      ? "border-slate-600 dark:border-slate-300 text-slate-800 dark:text-slate-100"
                      : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300",
                    done && "text-emerald-600 dark:text-emerald-400",
                    partial && "text-amber-500 dark:text-amber-400",
                  )}
                >
                  {sp.shortLabel}
                  {done ? " ✓" : partial ? " ·" : ""}
                </button>
              );
            })}
          </div>

          {/* Speech label banner */}
          <div className="px-4 pt-4 pb-0">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 shrink-0">
                {SPEECH_TYPES.indexOf(speech) + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {speech.shortLabel}{" "}
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    ·
                  </span>{" "}
                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                    {speech.speechType}
                  </span>
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg px-2.5 py-1 shrink-0">
                ⏱ {speech.durationMins} min
              </span>
            </div>
          </div>

          {/* Per-team score cards */}
          <div className="p-4 space-y-4">
            {[
              { team: proTeam, score: proScore, side: "PRO" as const },
              { team: conTeam, score: conScore, side: "CON" as const },
            ]
              .filter((x) => x.team)
              .map(({ team, score, side }) => {
                const sc = SIDE_COLORS[side];
                return (
                  <div
                    key={side}
                    className={cn("rounded-lg border p-3", sc.bg, sc.border)}
                  >
                    {/* Team header */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={cn("text-xs font-bold uppercase", sc.text)}
                      >
                        {side} · {team!.team.name}
                      </span>
                      <span className="font-mono text-lg font-bold text-slate-700 dark:text-slate-200">
                        {score ? (score.totalScore?.toFixed(1) ?? "—") : "—"}
                      </span>
                    </div>

                    {score ? (
                      <div className="space-y-2">
                        {/* Criteria breakdown */}
                        {score.criteria.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5">
                            {criteria.map((c) => {
                              const val = score.criteria.find(
                                (cr) => cr.criteriaKey === c.key,
                              );
                              return (
                                <div
                                  key={c.key}
                                  className="text-[10px] flex justify-between bg-white/60 dark:bg-slate-800/60 rounded px-2 py-1"
                                >
                                  <span className="text-slate-400 dark:text-slate-500 truncate">
                                    {c.label}
                                  </span>
                                  <span className="font-semibold text-slate-600 dark:text-slate-300 font-mono ml-1 shrink-0">
                                    {val ? val.score.toFixed(1) : "—"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Lock state */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                          {score.isDraft ? (
                            <span className="inline-flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded px-1.5 py-0.5">
                              ⚡ live draft
                            </span>
                          ) : score.isLocked ? (
                            <span className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded px-1.5 py-0.5">
                              🔒 locked
                            </span>
                          ) : (
                            <span className="text-emerald-500 dark:text-emerald-400">
                              ✓ submitted
                            </span>
                          )}
                        </div>
                        {/* Comment */}
                        {score.comment && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic border-l-2 border-slate-200 dark:border-slate-600 pl-2">
                            "{score.comment}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                        No score submitted yet for this speech.
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Editable judge cell (current user) ──────────────────────────────────────

function MyCell({
  slot,
  roundId,
  roundTeams,
  currentUserId,
  minScore,
  maxScore,
  lockInfo,
  onScoreSubmitted,
}: {
  slot: JudgeSlotData;
  roundId: string;
  roundTeams: RoundTeamData[];
  currentUserId: string;
  minScore: number;
  maxScore: number;
  lockInfo: LockInfo;
  onScoreSubmitted: () => void;
}) {
  const restoredRef = useRef(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdown = useCountdown(lockInfo.scoreLockDeadline);

  const [drafts, setDrafts] = useState<
    Record<string, Record<string, Record<string, number>>>
  >({});
  const [comments, setComments] = useState<
    Record<string, Record<string, string>>
  >({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [activeSpeech, setActiveSpeech] = useState<SpeechTypeKey>(
    SPEECH_TYPES[0].key,
  );
  const proTeam = roundTeams.find((t) => t.side === "PRO");
  const conTeam = roundTeams.find((t) => t.side === "CON");

  const getExisting = (teamId: string, speechType: string) =>
    roundTeams
      .find((t) => t.id === teamId)
      ?.scores.find(
        // Only treat a score as "submitted" if it is NOT a draft.
        // isDraft:true = live-sync background save, judge can still edit.
        // isDraft:false = judge pressed Submit; form becomes read-only.
        (s) =>
          s.slot.id === slot.id && s.speechType === speechType && !s.isDraft,
      );

  // Restore from localStorage once; also seed from any DB drafts (isDraft:true)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadDraft(roundId, currentUserId);
    const filteredDrafts: typeof drafts = {};
    const filteredComments: typeof comments = {};

    // 1. Restore from localStorage (skip speeches already finalized)
    for (const [rtId, speechMap] of Object.entries(
      (saved?.drafts ?? {}) as Record<
        string,
        Record<string, Record<string, number>>
      >,
    )) {
      for (const [speechType, criteria] of Object.entries(speechMap)) {
        if (!getExisting(rtId, speechType)) {
          filteredDrafts[rtId] = filteredDrafts[rtId] || {};
          filteredDrafts[rtId][speechType] = criteria;
        }
      }
    }
    for (const [rtId, speechMap] of Object.entries(
      (saved?.comments ?? {}) as Record<string, Record<string, string>>,
    )) {
      for (const [speechType, comment] of Object.entries(speechMap)) {
        if (!getExisting(rtId, speechType)) {
          filteredComments[rtId] = filteredComments[rtId] || {};
          filteredComments[rtId][speechType] = comment;
        }
      }
    }

    // 2. Pre-populate from DB draft scores (isDraft:true) for speeches
    //    that have no localStorage entry — covers page reload / different device
    for (const team of roundTeams) {
      for (const s of team.scores) {
        if (s.slot.id !== slot.id) continue; // not this judge
        if (!s.isDraft) continue; // already finalized — skip
        if (filteredDrafts[team.id]?.[s.speechType]) continue; // localStorage wins
        filteredDrafts[team.id] = filteredDrafts[team.id] || {};
        filteredDrafts[team.id][s.speechType] = {};
        for (const cr of s.criteria) {
          filteredDrafts[team.id][s.speechType][cr.criteriaKey] = cr.score;
        }
      }
    }

    if (Object.keys(filteredDrafts).length) setDrafts(filteredDrafts);
    if (Object.keys(filteredComments).length) setComments(filteredComments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save debounced
  useEffect(() => {
    if (!restoredRef.current) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveDraft(roundId, currentUserId, { drafts, comments });
      setAutoSavedAt(new Date());
    }, 800);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [drafts, comments, roundId, currentUserId]);

  const isScoreLocked = lockInfo.isCompleted || lockInfo.scoreEditingLocked;

  // Live-sync draft criteria scores to server so other judges see updates in real time
  const syncDraftToServer = useCallback(
    (
      teamId: string,
      speechType: string,
      criteriaScores: Record<string, number>,
    ) => {
      if (syncRef.current) clearTimeout(syncRef.current);
      syncRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/tools/dbt/rounds/${roundId}/scores`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roundTeamId: teamId,
              speechType,
              criteriaScores,
            }),
          });
          onScoreSubmitted(); // refresh ReadOnlyCell polling
        } catch {
          /* silent — draft sync failures are non-critical */
        }
      }, 400);
    },
    [roundId, onScoreSubmitted],
  );

  const handleSubmit = async (roundTeamId: string, speechType: string) => {
    const key = `${roundTeamId}-${speechType}`;
    const criteriaScores = drafts[roundTeamId]?.[speechType];
    if (!criteriaScores || Object.keys(criteriaScores).length === 0) {
      alert("Please set all criteria scores before submitting.");
      return;
    }
    setSubmitting(key);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundTeamId,
          speechType,
          criteriaScores,
          comment: comments[roundTeamId]?.[speechType] || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to submit score");
        return;
      }
      // Clear localStorage entry for this speech
      const draftKey = makeDraftKey(roundId, currentUserId);
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const state = JSON.parse(raw);
          delete state.drafts?.[roundTeamId]?.[speechType];
          delete state.comments?.[roundTeamId]?.[speechType];
          localStorage.setItem(draftKey, JSON.stringify(state));
        }
      } catch {
        /* ignore */
      }
      onScoreSubmitted();
    } catch {
      alert("Network error");
    } finally {
      setSubmitting(null);
    }
  };

  const speech =
    SPEECH_TYPES.find((s) => s.key === activeSpeech) ?? SPEECH_TYPES[0];
  const criteria = SPEECH_CRITERIA[speech.key] ?? [];

  return (
    <div className="rounded-xl border-2 border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-900 shadow-md overflow-hidden">
      {/* Cell header */}
      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-amber-500 dark:text-amber-400 font-semibold uppercase tracking-wide">
            J{slot.position} · Your Panel
          </p>
          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
            {slot.judge.alias}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {slot.judge.user.name}
          </p>
        </div>
        <div className="text-right">
          {lockInfo.scoreEditingLocked ? (
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded px-2 py-0.5 font-medium">
              Scores Locked
            </span>
          ) : (
            countdown !== null && (
              <div
                className={cn(
                  "text-xs rounded px-2 py-0.5 font-medium",
                  countdown < 300
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                )}
              >
                {countdown > 0
                  ? `Lock in: ${formatCountdown(countdown)}`
                  : "Locked"}
              </div>
            )
          )}
          {autoSavedAt && !isScoreLocked && (
            <p className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-0.5">
              Draft saved{" "}
              {autoSavedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Speech tabs */}
      <div className="flex overflow-x-auto border-b border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 scrollbar-hide">
        {SPEECH_TYPES.map((sp) => {
          const proS = getExisting(proTeam?.id ?? "", sp.key);
          const conS = getExisting(conTeam?.id ?? "", sp.key);
          const done = !!proS && !!conS;
          const partial = (!!proS || !!conS) && !done;
          // Check if drafts are complete for this (background) speech
          const spCrit = SPEECH_CRITERIA[sp.key] ?? [];
          const proDraftFull =
            !done &&
            sp.key !== activeSpeech &&
            !proS &&
            !!proTeam &&
            spCrit.length > 0 &&
            spCrit.every(
              (c) => typeof drafts[proTeam.id]?.[sp.key]?.[c.key] === "number",
            );
          const conDraftFull =
            !done &&
            sp.key !== activeSpeech &&
            !conS &&
            !!conTeam &&
            spCrit.length > 0 &&
            spCrit.every(
              (c) => typeof drafts[conTeam.id]?.[sp.key]?.[c.key] === "number",
            );
          const hasDraftProgress = (proDraftFull || conDraftFull) && !done;
          return (
            <button
              key={sp.key}
              onClick={() => setActiveSpeech(sp.key)}
              className={cn(
                "flex-shrink-0 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                activeSpeech === sp.key
                  ? "border-amber-500 text-amber-700 dark:text-amber-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                done && "text-emerald-600 dark:text-emerald-400",
                partial && "text-amber-500 dark:text-amber-400",
                hasDraftProgress &&
                  !partial &&
                  !done &&
                  "text-violet-600 dark:text-violet-400",
              )}
            >
              {sp.shortLabel}
              {done ? " ✓" : partial ? " ·" : hasDraftProgress ? " ●" : ""}
            </button>
          );
        })}
      </div>

      {/* Active speech banner */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500 dark:bg-amber-600 text-white font-bold text-sm shrink-0">
            {speech.order}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Speech {speech.order} of {SPEECH_TYPES.length}
            </p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {speech.speaker === "both"
                ? "All Speakers"
                : `${speech.speaker === "1st" ? "1st" : "2nd"} Speaker`}{" "}
              ·{" "}
              <span className="text-amber-600 dark:text-amber-400">
                {speech.speechType}
              </span>
            </p>
          </div>
          <div className="ml-auto shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg px-2.5 py-1">
              ⏱ {speech.durationMins} min
            </span>
          </div>
        </div>
      </div>

      {/* Scoring section for active speech, both teams */}
      <div className="p-4 space-y-5">
        {[proTeam, conTeam].filter(Boolean).map((team) => {
          if (!team) return null;
          const side = team.side;
          const sc = SIDE_COLORS[side];
          const existing = getExisting(team.id, speech.key);
          const isRoundPaused = lockInfo.roundStatus === "PAUSED";
          const isEditable = !isScoreLocked && !existing && !isRoundPaused;
          const isPausedBlocked = isRoundPaused && !existing;
          const draftScores = drafts[team.id]?.[speech.key] || {};
          const submitKey = `${team.id}-${speech.key}`;
          const isSubmitting = submitting === submitKey;

          // Calculate total from draft or existing
          let total = 0;
          if (existing) {
            total = existing.totalScore ?? 0;
          } else {
            total = Object.values(draftScores).reduce((a, b) => a + b, 0);
          }

          const allCriteriaFilled =
            criteria.length > 0 &&
            criteria.every((c) => typeof draftScores[c.key] === "number");

          return (
            <div
              key={team.id}
              className={cn("rounded-lg border p-3", sc.bg, sc.border)}
            >
              {/* Team header */}
              <div className="flex items-center justify-between mb-3">
                <span className={cn("text-xs font-bold uppercase", sc.text)}>
                  {side} · {team.team.name}
                </span>
                <span
                  className={cn(
                    "font-mono text-lg font-bold",
                    existing
                      ? "text-slate-700 dark:text-slate-200"
                      : total > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-300 dark:text-slate-600",
                  )}
                >
                  {total > 0 ? total.toFixed(1) : "—"}
                </span>
              </div>

              {/* Submitted state */}
              {existing ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-emerald-500 dark:text-emerald-400">
                      ✓
                    </span>{" "}
                    Score submitted
                    {existing.lockedAt && !existing.isLocked ? (
                      <ScoreLockCountdown lockedAt={existing.lockedAt} />
                    ) : existing.isLocked ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">
                        🔒 locked
                      </span>
                    ) : null}
                  </div>
                  {/* Criteria breakdown */}
                  {existing.criteria.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {existing.criteria.map((c) => {
                        const crit = criteria.find(
                          (cr) => cr.key === c.criteriaKey,
                        );
                        return (
                          <div
                            key={c.criteriaKey}
                            className="text-[10px] flex justify-between bg-white/60 dark:bg-slate-800/60 rounded px-2 py-1"
                          >
                            <span className="text-slate-400 dark:text-slate-500 truncate">
                              {crit?.label ?? c.criteriaKey}
                            </span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300 font-mono">
                              {c.score.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Comment — always editable even if scores are locked */}
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                      Comment (always editable)
                    </p>
                    <textarea
                      rows={2}
                      className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-300"
                      defaultValue={existing.comment ?? ""}
                      onBlur={async (e) => {
                        if (e.target.value === (existing.comment ?? "")) return;
                        await fetch(`/api/tools/dbt/rounds/${roundId}/scores`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            roundTeamId: team.id,
                            speechType: speech.key,
                            comment: e.target.value,
                            updateCommentOnly: true,
                          }),
                        });
                        onScoreSubmitted();
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* Editable form */
                <div className="space-y-2.5">
                  {criteria.map((c) => (
                    <div
                      key={c.key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span
                        className="text-xs text-slate-600 dark:text-slate-300 flex-1 min-w-0 truncate"
                        title={c.label}
                      >
                        {c.label}
                      </span>
                      <ScoreInput
                        value={draftScores[c.key] ?? minScore}
                        min={minScore}
                        max={maxScore}
                        disabled={!isEditable}
                        onChange={(v) => {
                          const newScores = {
                            ...drafts[team.id]?.[speech.key],
                            [c.key]: v,
                          };
                          setDrafts((prev) => ({
                            ...prev,
                            [team.id]: {
                              ...prev[team.id],
                              [speech.key]: newScores,
                            },
                          }));
                          syncDraftToServer(team.id, speech.key, newScores);
                        }}
                      />
                    </div>
                  ))}

                  {/* Comment */}
                  <textarea
                    rows={2}
                    placeholder="Optional comment…"
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-300 mt-1"
                    disabled={!isEditable}
                    value={comments[team.id]?.[speech.key] ?? ""}
                    onChange={(e) =>
                      setComments((prev) => ({
                        ...prev,
                        [team.id]: {
                          ...prev[team.id],
                          [speech.key]: e.target.value,
                        },
                      }))
                    }
                  />

                  {/* Paused notice */}
                  {isPausedBlocked && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <span className="text-orange-500 text-sm shrink-0">
                        ⏸
                      </span>
                      <p className="text-[11px] text-orange-700 dark:text-orange-300 leading-tight">
                        Game is paused — scoring suspended
                      </p>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={() => handleSubmit(team.id, speech.key)}
                    disabled={
                      !isEditable ||
                      !allCriteriaFilled ||
                      isSubmitting ||
                      isScoreLocked ||
                      isRoundPaused
                    }
                    className={cn(
                      "w-full py-2 rounded-lg text-xs font-semibold transition-all",
                      isEditable && allCriteriaFilled && !isSubmitting
                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed",
                    )}
                  >
                    {isSubmitting
                      ? "Submitting…"
                      : isRoundPaused
                        ? "⏸ Paused"
                        : isScoreLocked
                          ? "Scoring Locked"
                          : "Submit Score"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JudgeCellView({
  roundId,
  currentUserId,
  isJudge,
  canStartRound = false,
  canManageRound = false,
  minScore = SCORING.MIN_CRITERIA,
  maxScore = SCORING.MAX_CRITERIA,
}: Props) {
  const [roundTeams, setRoundTeams] = useState<RoundTeamData[]>([]);
  const [judgeSlots, setJudgeSlots] = useState<JudgeSlotData[]>([]);
  const [mySlot, setMySlot] = useState<JudgeSlotData | null>(null);
  const [lockInfo, setLockInfo] = useState<LockInfo>({
    scoreLockDeadline: null,
    scoreEditingLocked: false,
    isCompleted: false,
    roundStatus: "SCHEDULED",
  });
  const [loading, setLoading] = useState(true);
  const [startingRound, setStartingRound] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [pausingRound, setPausingRound] = useState(false);
  const [resumingRound, setResumingRound] = useState(false);
  const [resettingRound, setResettingRound] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/scores`);
      const data = await res.json();
      if (data.round) {
        setRoundTeams(data.round.roundTeams);
        setJudgeSlots(data.round.judgeSlots);
        if (currentUserId) {
          const found =
            data.round.judgeSlots.find(
              (s: JudgeSlotData) => s.judge.user.id === currentUserId,
            ) || null;
          setMySlot(found);
        }
        if (data.lockInfo) {
          setLockInfo(data.lockInfo);
        }
      }
    } catch (e) {
      console.error("JudgeCellView fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [roundId, currentUserId]);

  const doStartRound = async () => {
    setShowStartConfirm(false);
    setStartingRound(true);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startRound: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to start round");
        return;
      }
      await fetchScores();
    } catch {
      alert("Network error — could not start round");
    } finally {
      setStartingRound(false);
    }
  };

  const handleStartRound = () => {
    if (judgeSlots.length < 3) {
      setShowStartConfirm(true);
    } else {
      doStartRound();
    }
  };

  const handlePauseRound = async () => {
    setPausingRound(true);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pauseRound: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to pause round");
        return;
      }
      await fetchScores();
    } catch {
      alert("Network error — could not pause round");
    } finally {
      setPausingRound(false);
    }
  };

  const handleResumeRound = async () => {
    setResumingRound(true);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeRound: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to resume round");
        return;
      }
      await fetchScores();
    } catch {
      alert("Network error — could not resume round");
    } finally {
      setResumingRound(false);
    }
  };

  const doResetRound = async () => {
    setShowResetConfirm(false);
    setResettingRound(true);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetRound: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to reset round");
        return;
      }
      await fetchScores();
    } catch {
      alert("Network error — could not reset round");
    } finally {
      setResettingRound(false);
    }
  };

  useEffect(() => {
    fetchScores();
    const id = setInterval(fetchScores, 3000);
    return () => clearInterval(id);
  }, [fetchScores]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const proTeam = roundTeams.find((t) => t.side === "PRO");
  const conTeam = roundTeams.find((t) => t.side === "CON");
  const isScheduled = lockInfo.roundStatus === "SCHEDULED";
  const isPaused = lockInfo.roundStatus === "PAUSED";
  const isRoundStarted = !isScheduled && !lockInfo.isCompleted;

  return (
    <div className="space-y-6">
      {/* Teams banner */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {proTeam && (
          <span
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-semibold",
              SIDE_COLORS.PRO.bg,
              SIDE_COLORS.PRO.text,
            )}
          >
            PRO · {proTeam.team.name}
          </span>
        )}
        {conTeam && (
          <span
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-semibold",
              SIDE_COLORS.CON.bg,
              SIDE_COLORS.CON.text,
            )}
          >
            CON · {conTeam.team.name}
          </span>
        )}
      </div>

      {/* ── Round not started gate ── */}
      {isScheduled && !lockInfo.isCompleted ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 px-6 py-14 text-center space-y-5">
          <div className="text-5xl select-none">🏁</div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Round Not Started
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Scoring is locked until the Head Judge officially starts this
              round. All scores will be recorded from that moment.
            </p>
          </div>
          {canStartRound ? (
            showStartConfirm ? (
              /* Under-staffed confirmation panel */
              <div className="w-full max-w-sm mx-auto bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-5 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">⚠️</span>
                  <div className="space-y-1.5">
                    <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                      Only {judgeSlots.length} of 3 judge{" "}
                      {judgeSlots.length === 1 ? "slot is" : "slots are"} filled
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      The missing J
                      {judgeSlots.length === 1
                        ? "2 and J3 positions"
                        : "3 position"}{" "}
                      will be automatically calculated as the{" "}
                      <strong>panel average</strong> of the active judges.
                      Scoring works normally — the calculated slot keeps the
                      final decision balanced.
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-500 italic">
                      If a 3rd judge joins later, their real scores will
                      override the average automatically.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={doStartRound}
                    disabled={startingRound}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60"
                  >
                    {startingRound ? "Starting…" : "Start Anyway"}
                  </button>
                  <button
                    onClick={() => setShowStartConfirm(false)}
                    className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleStartRound}
                disabled={startingRound}
                className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-green-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {startingRound ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <span className="text-lg">▶</span> Start Round Now
                    {judgeSlots.length < 3 && (
                      <span className="ml-1 text-[10px] bg-white/20 rounded px-1.5 py-0.5">
                        {judgeSlots.length}/3 judges
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          ) : (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-sm">
              <span className="animate-pulse">⏳</span>
              Waiting for the Head Judge to start this round…
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── PAUSED global banner (all users) ── */}
          {isPaused && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-orange-50 dark:bg-orange-900/25 border-2 border-orange-300 dark:border-orange-700 rounded-xl px-4 py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-3xl shrink-0 select-none">⏸</span>
                <div className="min-w-0">
                  <p className="font-bold text-orange-800 dark:text-orange-300 text-sm leading-tight">
                    Game Paused
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 leading-relaxed">
                    {canManageRound
                      ? "Scoring is suspended. Resume when you're ready to continue, or reset to wipe all scores and start fresh."
                      : "The Head Judge has temporarily paused this round. Scoring is suspended until the game resumes."}
                  </p>
                </div>
              </div>
              {canManageRound && (
                <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={handleResumeRound}
                    disabled={resumingRound}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg shadow transition-colors disabled:opacity-60"
                  >
                    {resumingRound ? (
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>▶</span>
                    )}
                    {resumingRound ? "Resuming…" : "Resume"}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
                  >
                    🔄 Reset
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Game Controls bar (head judge / admin, round started) ── */}
          {canManageRound &&
            isRoundStarted &&
            !lockInfo.isCompleted &&
            !isPaused && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Game Controls
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded font-medium">
                    LIVE
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePauseRound}
                    disabled={pausingRound}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    {pausingRound ? (
                      <span className="w-3 h-3 border-2 border-orange-400/40 border-t-orange-500 rounded-full animate-spin" />
                    ) : (
                      <span>⏸</span>
                    )}
                    {pausingRound ? "Pausing…" : "Pause Game"}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-800 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold rounded-lg transition-colors"
                  >
                    🔄 Reset Scores
                  </button>
                </div>
              </div>
            )}

          {/* ── Reset confirmation panel ── */}
          {showResetConfirm && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 select-none">⚠️</span>
                <div className="space-y-1.5">
                  <p className="font-bold text-red-800 dark:text-red-300 text-sm">
                    Reset All Scores?
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    This will{" "}
                    <strong>permanently delete all submitted scores</strong> for
                    this round. All judges will need to re-enter their scores
                    from scratch. This cannot be undone.
                  </p>
                  <p className="text-[11px] text-red-600 dark:text-red-500 italic">
                    The round will remain live — judges can begin scoring again
                    immediately after reset.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={doResetRound}
                  disabled={resettingRound}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60"
                >
                  {resettingRound ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Resetting…
                    </span>
                  ) : (
                    "Yes, Reset All Scores"
                  )}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Lock alert banner */}
          {lockInfo.scoreEditingLocked && !lockInfo.isCompleted && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <span>🔒</span>
              <span>
                Score editing deadline has passed. Comments can still be edited.
              </span>
            </div>
          )}

          {/* LIVE indicator */}
          {lockInfo.roundStatus === "LIVE" && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Round is LIVE — scoring is open
            </div>
          )}

          {/* No-slot warning */}
          {isJudge && !mySlot && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              You are listed as a judge for this event but have no slot assigned
              to this round yet.
            </div>
          )}

          {/* Judge cells grid */}
          <div
            className={cn(
              "grid gap-4",
              judgeSlots.length === 1 && "grid-cols-1 max-w-md mx-auto",
              judgeSlots.length === 2 && "grid-cols-1 sm:grid-cols-2",
              judgeSlots.length >= 3 &&
                "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
            )}
          >
            {judgeSlots.map((slot) => {
              const isMySlot = mySlot?.id === slot.id;
              if (isMySlot && isJudge && currentUserId) {
                return (
                  <MyCell
                    key={slot.id}
                    slot={slot}
                    roundId={roundId}
                    roundTeams={roundTeams}
                    currentUserId={currentUserId}
                    minScore={minScore}
                    maxScore={maxScore}
                    lockInfo={lockInfo}
                    onScoreSubmitted={fetchScores}
                  />
                );
              }
              return (
                <ReadOnlyCell
                  key={slot.id}
                  slot={slot}
                  roundTeams={roundTeams}
                />
              );
            })}

            {/* Empty state */}
            {judgeSlots.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
                No judges assigned to this round yet.
              </div>
            )}
          </div>

          {/* Guest info banner */}
          {!isJudge && !mySlot && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
              You are viewing this scoring session as an observer. Only assigned
              judges can submit scores.
            </p>
          )}
        </>
      )}
    </div>
  );
}
