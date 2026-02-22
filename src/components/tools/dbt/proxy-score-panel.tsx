"use client";

/**
 * ProxyScorePanel
 * Lets a round head judge (isRoundHead) or JUDGE_ADMIN+ submit / update scores
 * on behalf of any other judge assigned to the round.
 *
 * The component fetches its own round data so it stays self-contained.
 */

import { useState, useEffect, useCallback } from "react";
import { SPEECH_TYPES, SPEECH_CRITERIA } from "@/lib/dbt/config";
import type { SpeechTypeKey } from "@/lib/dbt/config";
import { SCORING } from "@/lib/dbt";

// ── Types returned by GET /api/tools/dbt/rounds/[roundId]/scores ──────────────

interface SlotStub {
  id: string;
  position: number;
  judge: {
    alias: string;
    isHeadJudge: boolean;
    user: { id: string; name: string };
  };
}

interface TeamStub {
  id: string;
  side: "PRO" | "CON";
  team: { id: string; name: string };
}

interface RoundStub {
  judgeSlots: SlotStub[];
  roundTeams: TeamStub[];
  event: { minScore: number; maxScore: number } | null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  roundId: string;
  /** Called after a successful proxy submission so the parent can refresh */
  onSubmitted?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildInitialScores(speechType: SpeechTypeKey, defaultVal: number) {
  return Object.fromEntries(
    SPEECH_CRITERIA[speechType].map((c) => [c.key, defaultVal]),
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProxyScorePanel({ roundId, onSubmitted }: Props) {
  const [round, setRound] = useState<RoundStub | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state
  const defaultSpeechType = SPEECH_TYPES[0].key as SpeechTypeKey;
  const [targetSlotId, setTargetSlotId] = useState("");
  const [roundTeamId, setRoundTeamId] = useState("");
  const [speechType, setSpeechType] =
    useState<SpeechTypeKey>(defaultSpeechType);
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(
    () => buildInitialScores(defaultSpeechType, SCORING.MIN_CRITERIA),
  );
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Fetch round data ────────────────────────────────────────────────────────

  const fetchRound = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/scores`);
      if (!res.ok) throw new Error("Failed to load round data");
      const data = await res.json();
      const r: RoundStub = data.round;
      setRound(r);
      // Pre-select first team if only one option
      if (r.roundTeams.length === 1) setRoundTeamId(r.roundTeams[0].id);
      // Pre-select first slot if only one judge
      if (r.judgeSlots.length === 1) setTargetSlotId(r.judgeSlots[0].id);
    } catch {
      setFetchError("Could not load round data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  // ── Sync criteria scores when speech type changes ───────────────────────────

  const handleSpeechTypeChange = (key: SpeechTypeKey) => {
    setSpeechType(key);
    const min = round?.event?.minScore ?? SCORING.MIN_CRITERIA;
    setCriteriaScores(buildInitialScores(key, min));
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!targetSlotId) {
      setSubmitError("Please select a judge to submit on behalf of.");
      return;
    }
    if (!roundTeamId) {
      setSubmitError("Please select a team.");
      return;
    }

    const min = round?.event?.minScore ?? SCORING.MIN_CRITERIA;
    const max = round?.event?.maxScore ?? SCORING.MAX_CRITERIA;
    for (const val of Object.values(criteriaScores)) {
      if (val < min || val > max) {
        setSubmitError(`All scores must be between ${min} and ${max}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundTeamId,
          speechType,
          criteriaScores,
          comment: comment.trim() || null,
          targetSlotId, // proxy param — extracted before schema parse on server
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Submission failed.");
      } else {
        setSubmitSuccess(true);
        onSubmitted?.();
        // Reset form
        const defaultMin = round?.event?.minScore ?? SCORING.MIN_CRITERIA;
        setCriteriaScores(buildInitialScores(speechType, defaultMin));
        setComment("");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <p className="text-sm text-red-500 dark:text-red-400">{fetchError}</p>
    );
  }

  if (!round) return null;

  const criteriaDefs = SPEECH_CRITERIA[speechType];
  const minScore = round.event?.minScore ?? SCORING.MIN_CRITERIA;
  const maxScore = round.event?.maxScore ?? SCORING.MAX_CRITERIA;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── Judge selector ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Judge
          </label>
          <select
            value={targetSlotId}
            onChange={(e) => setTargetSlotId(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/40"
          >
            <option value="">— select judge —</option>
            {[...round.judgeSlots]
              .sort((a, b) => a.position - b.position)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  J{s.position} · {s.judge.alias}
                  {s.judge.isHeadJudge ? " (Head)" : ""}
                </option>
              ))}
          </select>
        </div>

        {/* ── Team selector ────────────────────────────────────────────── */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Team (Side)
          </label>
          <select
            value={roundTeamId}
            onChange={(e) => setRoundTeamId(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/40"
          >
            <option value="">— select team —</option>
            {round.roundTeams.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.side} · {rt.team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Speech type ────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Speech
        </label>
        <select
          value={speechType}
          onChange={(e) =>
            handleSpeechTypeChange(e.target.value as SpeechTypeKey)
          }
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/40"
        >
          {SPEECH_TYPES.map((st) => (
            <option key={st.key} value={st.key}>
              {st.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Criteria scores ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Criteria Scores&nbsp;
          <span className="font-normal normal-case">
            ({minScore}–{maxScore} each)
          </span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {criteriaDefs.map((c) => (
            <div
              key={c.key}
              className="flex items-center justify-between gap-2"
            >
              <label className="text-xs text-foreground/80 flex-1 min-w-0 truncate">
                {c.label}
              </label>
              <input
                type="number"
                min={minScore}
                max={maxScore}
                value={criteriaScores[c.key] ?? minScore}
                onChange={(e) =>
                  setCriteriaScores((prev) => ({
                    ...prev,
                    [c.key]: Number(e.target.value),
                  }))
                }
                className="w-16 border border-border rounded px-2 py-1 text-sm text-center bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/40"
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-right">
          Total:{" "}
          <span className="font-semibold text-foreground">
            {Object.values(criteriaScores).reduce((s, v) => s + v, 0)}
          </span>{" "}
          / {maxScore * criteriaDefs.length}
        </p>
      </div>

      {/* ── Comment ────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Comment <span className="font-normal normal-case">(optional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Judge feedback…"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ekd-gold/40 resize-none"
        />
      </div>

      {/* ── Status ─────────────────────────────────────────────────────── */}
      {submitError && (
        <p className="text-sm text-red-500 dark:text-red-400">{submitError}</p>
      )}
      {submitSuccess && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
          ✓ Score submitted on behalf of judge.
        </p>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold bg-ekd-gold text-white hover:bg-ekd-gold/90 disabled:opacity-50 transition-colors"
      >
        {submitting ? "Submitting…" : "Submit on Behalf"}
      </button>
    </form>
  );
}
