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
}

interface Props {
  roundId: string;
  currentUserId?: string;
  isJudge: boolean;
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
      ? "text-emerald-600"
      : value <= min + 0.5
        ? "text-red-500"
        : "text-slate-700";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="w-7 h-7 rounded border border-slate-300 text-slate-600 text-sm font-bold flex items-center justify-center disabled:opacity-40 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
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
          "w-14 text-center font-mono text-sm font-semibold border rounded-md px-1 py-1 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-colors",
          "disabled:opacity-40 disabled:bg-transparent disabled:border-transparent disabled:cursor-not-allowed",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          colorClass,
        )}
      />
      <button
        type="button"
        className="w-7 h-7 rounded border border-slate-300 text-slate-600 text-sm font-bold flex items-center justify-center disabled:opacity-40 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
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
  const proTeam = roundTeams.find((t) => t.side === "PRO");
  const conTeam = roundTeams.find((t) => t.side === "CON");

  const getScore = (team: RoundTeamData | undefined, speechType: string) =>
    team?.scores.find(
      (s) => s.slot.id === slot.id && s.speechType === speechType,
    );

  const submittedCount = SPEECH_TYPES.reduce((n, sp) => {
    const pro = getScore(proTeam, sp.key);
    const con = getScore(conTeam, sp.key);
    return n + (pro ? 1 : 0) + (con ? 1 : 0);
  }, 0);
  const totalPossible = SPEECH_TYPES.length * 2;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Cell header */}
      <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            J{slot.position}
          </p>
          <p className="font-semibold text-slate-800 text-sm">
            {slot.judge.alias}
          </p>
          <p className="text-xs text-slate-500">{slot.judge.user.name}</p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded px-2 py-1 transition-colors"
        >
          {expanded ? "Collapse" : "View"}
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b bg-slate-50/60">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${(submittedCount / totalPossible) * 100}%` }}
            />
          </div>
          <span>
            {submittedCount}/{totalPossible} submitted
          </span>
        </div>
      </div>

      {/* Scores (expandable) */}
      {expanded && (
        <div className="divide-y divide-slate-100">
          {SPEECH_TYPES.map((sp) => {
            const proScore = getScore(proTeam, sp.key);
            const conScore = getScore(conTeam, sp.key);
            return (
              <div key={sp.key} className="px-4 py-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase">
                  {sp.label}
                </p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-emerald-600 font-medium mb-0.5">
                      PRO · {proTeam?.team.name}
                    </p>
                    {proScore ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-slate-700 font-mono">
                          {proScore.totalScore?.toFixed(1) ?? "—"}
                        </span>
                        {proScore.isLocked && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1">
                            locked
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic">
                        Pending…
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-red-500 font-medium mb-0.5">
                      CON · {conTeam?.team.name}
                    </p>
                    {conScore ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-slate-700 font-mono">
                          {conScore.totalScore?.toFixed(1) ?? "—"}
                        </span>
                        {conScore.isLocked && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1">
                            locked
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic">
                        Pending…
                      </span>
                    )}
                  </div>
                </div>
                {(proScore?.comment || conScore?.comment) && (
                  <p className="text-[11px] text-slate-400 italic border-l-2 border-slate-200 pl-2 mt-1">
                    {proScore?.comment || conScore?.comment}
                  </p>
                )}
              </div>
            );
          })}
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
        (s) => s.slot.id === slot.id && s.speechType === speechType,
      );

  // Restore from localStorage once
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadDraft(roundId, currentUserId);
    if (!saved) return;
    const filteredDrafts: typeof drafts = {};
    const filteredComments: typeof comments = {};
    for (const [rtId, speechMap] of Object.entries(saved.drafts ?? {})) {
      for (const [speechType, criteria] of Object.entries(
        speechMap as Record<string, Record<string, number>>,
      )) {
        if (!getExisting(rtId, speechType)) {
          filteredDrafts[rtId] = filteredDrafts[rtId] || {};
          filteredDrafts[rtId][speechType] = criteria;
        }
      }
    }
    for (const [rtId, speechMap] of Object.entries(saved.comments ?? {})) {
      for (const [speechType, comment] of Object.entries(
        speechMap as Record<string, string>,
      )) {
        if (!getExisting(rtId, speechType)) {
          filteredComments[rtId] = filteredComments[rtId] || {};
          filteredComments[rtId][speechType] = comment;
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
    <div className="rounded-xl border-2 border-amber-300 bg-white shadow-md overflow-hidden">
      {/* Cell header */}
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-amber-500 font-semibold uppercase tracking-wide">
            J{slot.position} · Your Panel
          </p>
          <p className="font-bold text-slate-800 text-sm">{slot.judge.alias}</p>
          <p className="text-xs text-slate-500">{slot.judge.user.name}</p>
        </div>
        <div className="text-right">
          {lockInfo.scoreEditingLocked ? (
            <span className="text-xs bg-red-100 text-red-600 rounded px-2 py-0.5 font-medium">
              Scores Locked
            </span>
          ) : (
            countdown !== null && (
              <div
                className={cn(
                  "text-xs rounded px-2 py-0.5 font-medium",
                  countdown < 300
                    ? "bg-red-100 text-red-600"
                    : "bg-amber-100 text-amber-700",
                )}
              >
                {countdown > 0
                  ? `Lock in: ${formatCountdown(countdown)}`
                  : "Locked"}
              </div>
            )
          )}
          {autoSavedAt && !isScoreLocked && (
            <p className="text-[10px] text-emerald-500 mt-0.5">
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
      <div className="flex overflow-x-auto border-b border-amber-200 bg-amber-50/50 scrollbar-hide">
        {SPEECH_TYPES.map((sp) => {
          const proS = getExisting(proTeam?.id ?? "", sp.key);
          const conS = getExisting(conTeam?.id ?? "", sp.key);
          const done = !!proS && !!conS;
          const partial = (!!proS || !!conS) && !done;
          return (
            <button
              key={sp.key}
              onClick={() => setActiveSpeech(sp.key)}
              className={cn(
                "flex-shrink-0 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                activeSpeech === sp.key
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-700",
                done && "text-emerald-600",
                partial && "text-amber-500",
              )}
            >
              {sp.label.slice(0, 12)}
              {done ? " ✓" : partial ? " ·" : ""}
            </button>
          );
        })}
      </div>

      {/* Scoring section for active speech, both teams */}
      <div className="p-4 space-y-5">
        {[proTeam, conTeam].filter(Boolean).map((team) => {
          if (!team) return null;
          const side = team.side;
          const sc = SIDE_COLORS[side];
          const existing = getExisting(team.id, speech.key);
          const isEditable = !isScoreLocked && !existing;
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
              className={cn(
                "rounded-lg border p-3",
                sc.bg,
                "border-opacity-30",
              )}
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
                      ? "text-slate-700"
                      : total > 0
                        ? "text-amber-600"
                        : "text-slate-300",
                  )}
                >
                  {total > 0 ? total.toFixed(1) : "—"}
                </span>
              </div>

              {/* Submitted state */}
              {existing ? (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="text-emerald-500">✓</span> Score submitted
                    {existing.isLocked && (
                      <span className="text-slate-400">(locked)</span>
                    )}
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
                            className="text-[10px] flex justify-between bg-white/60 rounded px-2 py-1"
                          >
                            <span className="text-slate-400 truncate">
                              {crit?.label ?? c.criteriaKey}
                            </span>
                            <span className="font-semibold text-slate-600 font-mono">
                              {c.score.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Comment — always editable even if scores are locked */}
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">
                      Comment (always editable)
                    </p>
                    <textarea
                      rows={2}
                      className="w-full text-xs border border-slate-200 rounded-md p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-300"
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
                        className="text-xs text-slate-600 flex-1 min-w-0 truncate"
                        title={c.label}
                      >
                        {c.label}
                      </span>
                      <ScoreInput
                        value={draftScores[c.key] ?? minScore}
                        min={minScore}
                        max={maxScore}
                        disabled={!isEditable}
                        onChange={(v) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [team.id]: {
                              ...prev[team.id],
                              [speech.key]: {
                                ...prev[team.id]?.[speech.key],
                                [c.key]: v,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  ))}

                  {/* Comment */}
                  <textarea
                    rows={2}
                    placeholder="Optional comment…"
                    className="w-full text-xs border border-slate-200 rounded-md p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-300 mt-1"
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

                  {/* Submit button */}
                  <button
                    onClick={() => handleSubmit(team.id, speech.key)}
                    disabled={
                      !isEditable ||
                      !allCriteriaFilled ||
                      isSubmitting ||
                      isScoreLocked
                    }
                    className={cn(
                      "w-full py-2 rounded-lg text-xs font-semibold transition-all",
                      isEditable && allCriteriaFilled && !isSubmitting
                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed",
                    )}
                  >
                    {isSubmitting
                      ? "Submitting…"
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
  });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchScores();
    const id = setInterval(fetchScores, 5000);
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

      {/* Lock alert banner */}
      {lockInfo.scoreEditingLocked && !lockInfo.isCompleted && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span>🔒</span>
          <span>
            Score editing deadline has passed. Comments can still be edited.
          </span>
        </div>
      )}

      {/* No-slot warning */}
      {isJudge && !mySlot && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          You are listed as a judge for this event but have no slot assigned to
          this round yet.
        </div>
      )}

      {/* Judge cells grid */}
      <div
        className={cn(
          "grid gap-4",
          judgeSlots.length === 1 && "grid-cols-1 max-w-md mx-auto",
          judgeSlots.length === 2 && "grid-cols-1 sm:grid-cols-2",
          judgeSlots.length >= 3 && "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
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
            <ReadOnlyCell key={slot.id} slot={slot} roundTeams={roundTeams} />
          );
        })}

        {/* Empty state */}
        {judgeSlots.length === 0 && (
          <div className="col-span-full text-center py-10 text-slate-400 text-sm">
            No judges assigned to this round yet.
          </div>
        )}
      </div>

      {/* Guest info banner */}
      {!isJudge && !mySlot && (
        <p className="text-center text-xs text-slate-400 mt-2">
          You are viewing this scoring session as an observer. Only assigned
          judges can submit scores.
        </p>
      )}
    </div>
  );
}
