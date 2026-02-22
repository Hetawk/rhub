"use client";

/**
 * UnlockScoresPanel
 *
 * Lets HEAD_JUDGE / JUDGE_ADMIN / ADMIN unlock time-locked SpeechScore rows
 * for judges who ran out of time before pressing Submit.
 *
 * Displayed inside the debate-shell scoring tab (non-completed rounds only).
 * All existing score data (criteria values, totals, comments) is preserved —
 * only isLocked / lockedAt are cleared so the judge can re-open and re-submit.
 */

import { useState, useEffect, useCallback } from "react";
import { SPEECH_TYPES } from "@/lib/dbt";
import { cn } from "@/lib/utils";

interface LockedScore {
  id: string;
  speechType: string;
  isDraft: boolean;
  isLocked: boolean;
  lockedAt: string | null;
  totalScore: number | null;
  side: "PRO" | "CON";
}

interface JudgeSlotLockInfo {
  slotId: string;
  position: number;
  alias: string;
  lockedScores: LockedScore[];
}

interface Props {
  roundId: string;
  /** Refresh callback so parent can refetch event data after an unlock */
  onUnlocked?: () => void;
}

export function UnlockScoresPanel({ roundId, onUnlocked }: Props) {
  const [slots, setSlots] = useState<JudgeSlotLockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null); // key = slotId or "all"
  const [lastResult, setLastResult] = useState<string | null>(null);

  const fetchLocked = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/scores`);
      const data = await res.json();
      if (!data.round) return;

      const proTeamId: string =
        data.round.roundTeams.find((t: { side: string }) => t.side === "PRO")
          ?.id ?? "";
      const conTeamId: string =
        data.round.roundTeams.find((t: { side: string }) => t.side === "CON")
          ?.id ?? "";

      // Collect all scores keyed by slotId so we can match per judge
      const allScores: Array<
        LockedScore & { slotId: string; roundTeamId: string }
      > = [];

      for (const rt of data.round.roundTeams) {
        const side: "PRO" | "CON" = rt.side;
        for (const s of rt.scores) {
          allScores.push({
            id: s.id,
            slotId: s.slot.id,
            roundTeamId: side === "PRO" ? proTeamId : conTeamId,
            speechType: s.speechType,
            isDraft: s.isDraft,
            isLocked: s.isLocked,
            lockedAt: s.lockedAt ?? null,
            totalScore: s.totalScore ?? null,
            side,
          });
        }
      }

      const now = new Date();

      // Build per-slot locked list
      const result: JudgeSlotLockInfo[] = data.round.judgeSlots.map(
        (slot: { id: string; position: number; judge: { alias: string } }) => {
          const locked = allScores.filter(
            (s) =>
              s.slotId === slot.id &&
              (s.isLocked ||
                (s.lockedAt !== null && new Date(s.lockedAt) <= now)),
          );
          return {
            slotId: slot.id,
            position: slot.position,
            alias: slot.judge.alias,
            lockedScores: locked,
          };
        },
      );

      setSlots(result.filter((s) => s.lockedScores.length > 0));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    fetchLocked();
  }, [fetchLocked]);

  const unlock = async (
    key: string,
    body: { slotId?: string; speechType?: string; scoreIds?: string[] },
  ) => {
    setUnlocking(key);
    setLastResult(null);
    try {
      const res = await fetch(
        `/api/tools/dbt/rounds/${roundId}/scores/unlock`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setLastResult(`❌ ${data.error || "Unlock failed"}`);
        return;
      }
      setLastResult(
        `✅ ${data.unlocked} score${data.unlocked !== 1 ? "s" : ""} unlocked — judge can now re-submit.`,
      );
      await fetchLocked();
      onUnlocked?.();
    } catch {
      setLastResult("❌ Network error");
    } finally {
      setUnlocking(null);
    }
  };

  const speechLabel = (key: string) =>
    SPEECH_TYPES.find((s) => s.key === key)?.shortLabel ?? key;

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground py-2 text-center">
        Checking for locked scores…
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-xs text-slate-500 dark:text-slate-400 py-2 text-center">
        No locked scores found — all judges are within their submission window.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Global unlock-all */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {slots.reduce((s, j) => s + j.lockedScores.length, 0)} locked score
          {slots.reduce((s, j) => s + j.lockedScores.length, 0) !== 1
            ? "s"
            : ""}{" "}
          across {slots.length} judge{slots.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => unlock("all", {})}
          disabled={!!unlocking}
          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-semibold transition-colors disabled:opacity-50"
        >
          {unlocking === "all" ? "Unlocking…" : "🔓 Unlock All Locked Scores"}
        </button>
      </div>

      {/* Per-judge breakdown */}
      {slots.map((slot) => (
        <div
          key={slot.slotId}
          className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-white dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="text-slate-400 font-mono text-xs mr-1">
                J{slot.position}
              </span>
              {slot.alias}
              <span className="ml-2 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded">
                {slot.lockedScores.length} locked
              </span>
            </span>
            <button
              onClick={() => unlock(slot.slotId, { slotId: slot.slotId })}
              disabled={!!unlocking}
              className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-400 text-white rounded-md font-semibold transition-colors disabled:opacity-50"
            >
              {unlocking === slot.slotId
                ? "Unlocking…"
                : "Unlock All for This Judge"}
            </button>
          </div>

          {/* Individual locked speeches */}
          <div className="flex flex-wrap gap-1.5">
            {slot.lockedScores.map((s) => (
              <button
                key={s.id}
                onClick={() =>
                  unlock(`${slot.slotId}-${s.speechType}-${s.side}`, {
                    scoreIds: [s.id],
                  })
                }
                disabled={!!unlocking}
                title={`Unlock ${speechLabel(s.speechType)} (${s.side})${s.lockedAt ? ` — locked at ${new Date(s.lockedAt).toLocaleTimeString()}` : ""}`}
                className={cn(
                  "text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors disabled:opacity-50",
                  s.isDraft
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
                )}
              >
                🔒 {speechLabel(s.speechType)}{" "}
                <span className="opacity-70">{s.side}</span>
                {s.isDraft && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">
                    (draft)
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Click a speech badge to unlock just that speech, or use the button
            above to unlock all for this judge.
          </p>
        </div>
      ))}

      {lastResult && (
        <p
          className={cn(
            "text-xs font-medium rounded-md px-3 py-2",
            lastResult.startsWith("✅")
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
          )}
        >
          {lastResult}
        </p>
      )}
    </div>
  );
}
