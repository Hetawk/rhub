"use client";

import { useState, useEffect, useCallback } from "react";
import { SPEECH_TYPES, SCORING, calcFinalDecision, fmtScore } from "@/lib/dbt";
import { cn } from "@/lib/utils";

interface Props {
  roundId: string;
}

interface MissingSpeech {
  key: string;
  shortLabel: string;
  /** e.g. "PRO", "CON", or "PRO + CON" */
  sidesLabel: string;
  /** True when the judge has a draft-saved score but hasn’t pressed Submit */
  hasDraft: boolean;
}

interface JudgeTotals {
  judgeAlias: string;
  position: number;
  proTotal: number;
  conTotal: number;
  winner: "PRO" | "CON" | "TIE";
  isPadded?: boolean;
  /** Speeches that still have no final (non-draft) submission for this judge */
  missingSpeeches: MissingSpeech[];
  /** Count where judge has a draft saved but not yet submitted */
  draftedCount: number;
  /** Count where judge has NO score at all (not even a draft) */
  trulyMissingCount: number;
  /** True if all speeches are in but the total somehow breaches [140,210] */
  outOfRange: boolean;
}

export function ScoreboardDisplay({ roundId }: Props) {
  const [judgeTotals, setJudgeTotals] = useState<JudgeTotals[]>([]);
  const [audienceVotes, setAudienceVotes] = useState({ pro: 0, con: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
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

      // Calculate per-judge totals, tracking real submissions vs drafts
      type ScoredSlot = JudgeTotals & { hasScores: boolean };
      const rawTotals: ScoredSlot[] = data.round.judgeSlots.map(
        (slot: { id: string; position: number; judge: { alias: string } }) => {
          let proTotal = 0;
          let conTotal = 0;
          let hasScores = false;

          // Submitted (non-draft) speech keys per side for this judge
          const submittedPro = new Set<string>();
          const submittedCon = new Set<string>();

          // Track drafted (isDraft:true) speech keys per side — judge filled them in but hasn’t pressed Submit
          const draftPro = new Set<string>();
          const draftCon = new Set<string>();

          if (proTeam) {
            const proScores = proTeam.scores.filter(
              (s: { slot: { id: string } }) => s.slot.id === slot.id,
            );
            if (proScores.length > 0) hasScores = true;
            proTotal = proScores.reduce(
              (sum: number, s: { totalScore: number | null }) =>
                sum + (s.totalScore || 0),
              0,
            );
            proScores.forEach((s: { speechType: string; isDraft: boolean }) => {
              if (!s.isDraft) submittedPro.add(s.speechType);
              else draftPro.add(s.speechType);
            });
          }
          if (conTeam) {
            const conScores = conTeam.scores.filter(
              (s: { slot: { id: string } }) => s.slot.id === slot.id,
            );
            if (conScores.length > 0) hasScores = true;
            conTotal = conScores.reduce(
              (sum: number, s: { totalScore: number | null }) =>
                sum + (s.totalScore || 0),
              0,
            );
            conScores.forEach((s: { speechType: string; isDraft: boolean }) => {
              if (!s.isDraft) submittedCon.add(s.speechType);
              else draftCon.add(s.speechType);
            });
          }

          // Determine which speeches still need a final submission
          const missingSpeeches: MissingSpeech[] = SPEECH_TYPES.reduce(
            (acc, st) => {
              const proMissing = !submittedPro.has(st.key);
              const conMissing = !submittedCon.has(st.key);
              if (proMissing || conMissing) {
                const sides: string[] = [];
                if (proMissing) sides.push("PRO");
                if (conMissing) sides.push("CON");
                // Mark as hasDraft if EVERY unsubmitted side has at least a draft saved
                const hasDraft =
                  (!proMissing || draftPro.has(st.key)) &&
                  (!conMissing || draftCon.has(st.key));
                acc.push({
                  key: st.key,
                  shortLabel: st.shortLabel,
                  sidesLabel: sides.join(" + "),
                  hasDraft,
                });
              }
              return acc;
            },
            [] as MissingSpeech[],
          );
          const draftedCount = missingSpeeches.filter((m) => m.hasDraft).length;
          const trulyMissingCount = missingSpeeches.length - draftedCount;

          // outOfRange is a defensive check: all speeches submitted but total
          // somehow breaches the validated [140, 210] bounds.
          const allSubmitted = missingSpeeches.length === 0;
          const outOfRange =
            allSubmitted &&
            (proTotal < SCORING.MIN_JUDGE_TOTAL ||
              proTotal > SCORING.MAX_JUDGE_TOTAL ||
              conTotal < SCORING.MIN_JUDGE_TOTAL ||
              conTotal > SCORING.MAX_JUDGE_TOTAL);

          return {
            judgeAlias: slot.judge.alias,
            position: slot.position,
            proTotal,
            conTotal,
            hasScores,
            missingSpeeches,
            draftedCount,
            trulyMissingCount,
            outOfRange,
            winner:
              proTotal > conTotal
                ? ("PRO" as const)
                : conTotal > proTotal
                  ? ("CON" as const)
                  : ("TIE" as const),
          };
        },
      );

      // Helper: clamp a synthetic judge total to the valid full-round range.
      // A fully-scored judge must be in [MIN_JUDGE_TOTAL, MAX_JUDGE_TOTAL] = [140, 210].
      const clampJudgeTotal = (v: number) =>
        Math.min(SCORING.MAX_JUDGE_TOTAL, Math.max(SCORING.MIN_JUDGE_TOTAL, v));

      // Synthesize scores for any judge slot that has no submissions yet,
      // using the panel average of judges who have scored, clamped to valid range.
      const activeJudges = rawTotals.filter((jt) => jt.hasScores);
      if (activeJudges.length > 0 && activeJudges.length < rawTotals.length) {
        const avgPro = clampJudgeTotal(
          activeJudges.reduce((s, jt) => s + jt.proTotal, 0) /
            activeJudges.length,
        );
        const avgCon = clampJudgeTotal(
          activeJudges.reduce((s, jt) => s + jt.conTotal, 0) /
            activeJudges.length,
        );
        rawTotals.forEach((jt) => {
          if (!jt.hasScores) {
            jt.proTotal = avgPro;
            jt.conTotal = avgCon;
            jt.winner =
              avgPro > avgCon
                ? ("PRO" as const)
                : avgCon > avgPro
                  ? ("CON" as const)
                  : ("TIE" as const);
            jt.isPadded = true;
            // Synthetic slot — no real submissions expected, clear pending lists
            jt.missingSpeeches = [];
            jt.draftedCount = 0;
            jt.trulyMissingCount = 0;
            jt.outOfRange = false;
          }
        });
      }

      // If there are exactly 2 real judge slots (and none were synthesised above),
      // push a panel-average entry as a tiebreaker 3rd vote, clamped to valid range.
      if (rawTotals.length === 2 && !rawTotals.some((jt) => jt.isPadded)) {
        const avgPro = clampJudgeTotal(
          (rawTotals[0].proTotal + rawTotals[1].proTotal) / 2,
        );
        const avgCon = clampJudgeTotal(
          (rawTotals[0].conTotal + rawTotals[1].conTotal) / 2,
        );
        rawTotals.push({
          judgeAlias: "Panel Avg",
          position: 3,
          proTotal: avgPro,
          conTotal: avgCon,
          hasScores: false,
          missingSpeeches: [],
          draftedCount: 0,
          trulyMissingCount: 0,
          outOfRange: false,
          winner:
            avgPro > avgCon
              ? ("PRO" as const)
              : avgCon > avgPro
                ? ("CON" as const)
                : ("TIE" as const),
          isPadded: true,
        });
      }

      setJudgeTotals(rawTotals);
      setAudienceVotes(data.audienceVotes || { pro: 0, con: 0 });
    } catch (e) {
      console.error("Scoreboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">
        Loading scoreboard...
      </div>
    );
  }

  const decision = calcFinalDecision(judgeTotals);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#182e5f] dark:bg-[#0f1e40] px-4 py-3 text-center">
        <h3 className="text-white font-semibold tracking-wide">
          Scoreboard &amp; Decision
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Synthetic score banner — shown whenever any slot is padded */}
        {judgeTotals.some((jt) => jt.isPadded) &&
          (() => {
            const absentSlots = judgeTotals.filter(
              (jt) => jt.isPadded && jt.judgeAlias !== "Panel Avg",
            );
            const activeCount = judgeTotals.filter((jt) => !jt.isPadded).length;
            const realSlotCount = judgeTotals.filter(
              (jt) => jt.judgeAlias !== "Panel Avg",
            ).length;
            return (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <span className="shrink-0 font-bold">⚠</span>
                {absentSlots.length > 0 ? (
                  <span>
                    <strong>
                      {activeCount} of {realSlotCount} judges active.
                    </strong>{" "}
                    {absentSlots.map((j) => j.judgeAlias).join(", ")}{" "}
                    {absentSlots.length === 1 ? "has" : "have"} not submitted
                    scores — their score{absentSlots.length > 1 ? "s" : ""} are
                    auto-calculated as the panel average of active judges.
                  </span>
                ) : (
                  <span>
                    <strong>2 of 3 judge slots active.</strong> J3 (Panel Avg)
                    is automatically calculated as the average of J1 and J2
                    scores.
                  </span>
                )}
              </div>
            );
          })()}

        {/* Per-judge scores table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Judge
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                  PRO Total
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-red-600 dark:text-red-400">
                  CON Total
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
                  Decision
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {judgeTotals.map((jt) => (
                <tr
                  key={jt.position}
                  className={cn(
                    "transition-colors",
                    jt.isPadded
                      ? "bg-amber-50/60 dark:bg-amber-900/10 opacity-75 italic"
                      : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                  )}
                >
                  <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200 not-italic">
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-xs mr-1.5">
                      J{jt.position}
                    </span>
                    {jt.judgeAlias}
                    {jt.isPadded && (
                      <span className="ml-1.5 text-[10px] not-italic font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                        auto
                      </span>
                    )}
                    {!jt.isPadded && jt.draftedCount > 0 && (
                      <span
                        className="ml-1.5 text-[10px] not-italic font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded"
                        title={`Draft saved (not yet submitted): ${jt.missingSpeeches
                          .filter((m) => m.hasDraft)
                          .map((m) => `${m.shortLabel} (${m.sidesLabel})`)
                          .join(", ")}`}
                      >
                        {jt.draftedCount} draft
                      </span>
                    )}
                    {!jt.isPadded && jt.trulyMissingCount > 0 && (
                      <span
                        className="ml-1.5 text-[10px] not-italic font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded"
                        title={`Not scored yet: ${jt.missingSpeeches
                          .filter((m) => !m.hasDraft)
                          .map((m) => `${m.shortLabel} (${m.sidesLabel})`)
                          .join(", ")}`}
                      >
                        {jt.trulyMissingCount} missing
                      </span>
                    )}
                    {!jt.isPadded && jt.outOfRange && (
                      <span className="ml-1.5 text-[10px] not-italic font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded">
                        ⛔ out of range
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {fmtScore(jt.proTotal)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold text-red-600 dark:text-red-400">
                    {fmtScore(jt.conTotal)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md text-xs font-semibold",
                        jt.winner === "PRO"
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                          : jt.winner === "CON"
                            ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                      )}
                    >
                      {jt.winner === "PRO"
                        ? "PRO Wins"
                        : jt.winner === "CON"
                          ? "CON Wins"
                          : "Tie"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Grand totals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              PRO Total Score
            </p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {fmtScore(decision.proGrandTotal)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-200 dark:border-red-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">
              CON Total Score
            </p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-300">
              {fmtScore(decision.conGrandTotal)}
            </p>
          </div>
        </div>

        {/* Final Decision */}
        <div
          className={cn(
            "rounded-xl p-6 text-center border-2",
            decision.winner === "PRO"
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
              : decision.winner === "CON"
                ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600",
          )}
        >
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
            Judges Final Decision
          </p>
          <p
            className={cn(
              "text-2xl font-bold mt-2",
              decision.winner === "PRO"
                ? "text-emerald-700 dark:text-emerald-300"
                : decision.winner === "CON"
                  ? "text-red-700 dark:text-red-300"
                  : "text-slate-600 dark:text-slate-200",
            )}
          >
            {decision.winner === "PRO"
              ? "PRO Wins"
              : decision.winner === "CON"
                ? "CON Wins"
                : "Tie"}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {decision.proWins} – {decision.conWins} judge votes
          </p>
        </div>

        {/* Audience votes */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-3">
            Audience Vote
          </p>
          <div className="flex justify-center gap-10">
            <div className="space-y-0.5">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 block">
                {audienceVotes.pro}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block">
                PRO
              </span>
            </div>
            <div className="w-px bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-0.5">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400 block">
                {audienceVotes.con}
              </span>
              <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide block">
                CON
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
