"use client";

/**
 * ScoringProgressTicker
 * ---------------------
 * A self-contained marquee banner that polls the scores API (every 5 s) and
 * scrolls a live list of every (judge × speech × side) that has not yet
 * received a final (non-draft) submission.
 *
 * Renders nothing when all speeches are fully submitted.
 */

import { useState, useEffect, useCallback } from "react";
import { SPEECH_TYPES, SCORING } from "@/lib/dbt";

interface TickerItem {
  judgeAlias: string;
  position: number;
  shortLabel: string;
  sidesLabel: string;
}

interface OutOfRangeEntry {
  position: number;
  judgeAlias: string;
}

interface Props {
  roundId: string;
}

const TICKER_STYLE = `
  @keyframes dbt-ticker {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  .dbt-ticker-track { animation: dbt-ticker linear infinite; }
`;

export function ScoringProgressTicker({ roundId }: Props) {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [outOfRange, setOutOfRange] = useState<OutOfRangeEntry[]>([]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/scores`);
      const data = await res.json();
      if (!data.round) return;

      const proTeam = data.round.roundTeams.find(
        (t: { side: string }) => t.side === "PRO",
      );
      const conTeam = data.round.roundTeams.find(
        (t: { side: string }) => t.side === "CON",
      );

      const newItems: TickerItem[] = [];
      const newOutOfRange: OutOfRangeEntry[] = [];

      for (const slot of data.round.judgeSlots as {
        id: string;
        position: number;
        judge: { alias: string };
      }[]) {
        const submittedPro = new Set<string>();
        const submittedCon = new Set<string>();
        let proTotal = 0;
        let conTotal = 0;

        if (proTeam) {
          const proScores = proTeam.scores.filter(
            (s: { slot: { id: string } }) => s.slot.id === slot.id,
          );
          proTotal = proScores.reduce(
            (sum: number, s: { totalScore: number | null }) =>
              sum + (s.totalScore || 0),
            0,
          );
          proScores
            .filter((s: { isDraft: boolean }) => !s.isDraft)
            .forEach((s: { speechType: string }) =>
              submittedPro.add(s.speechType),
            );
        }
        if (conTeam) {
          const conScores = conTeam.scores.filter(
            (s: { slot: { id: string } }) => s.slot.id === slot.id,
          );
          conTotal = conScores.reduce(
            (sum: number, s: { totalScore: number | null }) =>
              sum + (s.totalScore || 0),
            0,
          );
          conScores
            .filter((s: { isDraft: boolean }) => !s.isDraft)
            .forEach((s: { speechType: string }) =>
              submittedCon.add(s.speechType),
            );
        }

        for (const st of SPEECH_TYPES) {
          const proMissing = !submittedPro.has(st.key);
          const conMissing = !submittedCon.has(st.key);
          if (proMissing || conMissing) {
            const sides: string[] = [];
            if (proMissing) sides.push("PRO");
            if (conMissing) sides.push("CON");
            newItems.push({
              judgeAlias: slot.judge.alias,
              position: slot.position,
              shortLabel: st.shortLabel,
              sidesLabel: sides.join(" + "),
            });
          }
        }

        // Defensive out-of-range check (all submitted but total breaches cap)
        const allSubmitted =
          newItems.filter((i) => i.position === slot.position).length === 0;
        if (
          allSubmitted &&
          (proTotal < SCORING.MIN_JUDGE_TOTAL ||
            proTotal > SCORING.MAX_JUDGE_TOTAL ||
            conTotal < SCORING.MIN_JUDGE_TOTAL ||
            conTotal > SCORING.MAX_JUDGE_TOTAL)
        ) {
          newOutOfRange.push({
            position: slot.position,
            judgeAlias: slot.judge.alias,
          });
        }
      }

      setTickerItems(newItems);
      setOutOfRange(newOutOfRange);
    } catch {
      // silent — non-critical UI element
    }
  }, [roundId]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  if (tickerItems.length === 0 && outOfRange.length === 0) return null;

  const tickerDuration = Math.max(12, tickerItems.length * 5);

  return (
    <>
      <style>{TICKER_STYLE}</style>

      {/* ── Pending-submission ticker ── */}
      {tickerItems.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-700 overflow-hidden">
          <div className="flex items-stretch">
            {/* Fixed label */}
            <div className="shrink-0 flex items-center bg-red-500 dark:bg-red-700 px-3 py-2">
              <span className="text-white text-[10px] font-black uppercase tracking-widest">
                ⚠ Pending
              </span>
            </div>
            {/* Scrolling track */}
            <div className="flex-1 overflow-hidden bg-red-50 dark:bg-red-900/20 py-2">
              <div
                className="dbt-ticker-track flex items-center gap-8 w-max"
                style={{ animationDuration: `${tickerDuration}s` }}
              >
                {/* Duplicate for seamless loop */}
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-red-700 dark:text-red-300"
                  >
                    <span className="font-black font-mono">
                      J{item.position}
                    </span>
                    <span className="text-red-400 dark:text-red-500">·</span>
                    <span className="font-semibold">{item.shortLabel}</span>
                    <span className="text-red-400 dark:text-red-500">·</span>
                    <span className="text-red-500 dark:text-red-400 font-medium">
                      {item.sidesLabel} not submitted
                    </span>
                    <span className="mx-3 text-red-300 dark:text-red-600">
                      |
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Out-of-range warning ── */}
      {outOfRange.length > 0 && (
        <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-700 rounded-lg px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
          <span className="shrink-0 font-bold">⛔</span>
          <span>
            <strong>Score cap violation detected.</strong>{" "}
            {outOfRange
              .map((e) => `J${e.position} (${e.judgeAlias})`)
              .join(", ")}{" "}
            ha{outOfRange.length === 1 ? "s" : "ve"} a total outside the allowed
            range of {SCORING.MIN_JUDGE_TOTAL}–{SCORING.MAX_JUDGE_TOTAL}. Please
            review their submitted scores.
          </span>
        </div>
      )}
    </>
  );
}
