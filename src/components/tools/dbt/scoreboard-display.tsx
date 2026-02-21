"use client";

import { useState, useEffect, useCallback } from "react";
import { SPEECH_TYPES, SCORING, calcFinalDecision, fmtScore } from "@/lib/dbt";
import { cn } from "@/lib/utils";

interface Props {
  roundId: string;
}

interface JudgeTotals {
  judgeAlias: string;
  position: number;
  proTotal: number;
  conTotal: number;
  winner: "PRO" | "CON" | "TIE";
  isPadded?: boolean;
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

      // Calculate per-judge totals
      const totals: JudgeTotals[] = data.round.judgeSlots.map(
        (slot: { id: string; position: number; judge: { alias: string } }) => {
          let proTotal = 0;
          let conTotal = 0;

          if (proTeam) {
            proTotal = proTeam.scores
              .filter((s: { slot: { id: string } }) => s.slot.id === slot.id)
              .reduce(
                (sum: number, s: { totalScore: number | null }) =>
                  sum + (s.totalScore || 0),
                0,
              );
          }
          if (conTeam) {
            conTotal = conTeam.scores
              .filter((s: { slot: { id: string } }) => s.slot.id === slot.id)
              .reduce(
                (sum: number, s: { totalScore: number | null }) =>
                  sum + (s.totalScore || 0),
                0,
              );
          }

          return {
            judgeAlias: slot.judge.alias,
            position: slot.position,
            proTotal,
            conTotal,
            winner:
              proTotal > conTotal
                ? ("PRO" as const)
                : conTotal > proTotal
                  ? ("CON" as const)
                  : ("TIE" as const),
          };
        },
      );

      // If exactly 2 judges, add a synthetic 3rd slot (panel average)
      if (totals.length === 2) {
        const avgPro = (totals[0].proTotal + totals[1].proTotal) / 2;
        const avgCon = (totals[0].conTotal + totals[1].conTotal) / 2;
        totals.push({
          judgeAlias: "Panel Avg",
          position: 3,
          proTotal: avgPro,
          conTotal: avgCon,
          winner:
            avgPro > avgCon
              ? ("PRO" as const)
              : avgCon > avgPro
                ? ("CON" as const)
                : ("TIE" as const),
          isPadded: true,
        });
      }

      setJudgeTotals(totals);
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
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-800 px-4 py-3 text-center">
        <h3 className="text-white font-semibold">Scoreboard & Decision</h3>
      </div>

      <div className="p-6 space-y-6">
        {/* 2-judge panel average banner */}
        {judgeTotals.some((jt) => jt.isPadded) && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <span className="shrink-0 font-bold">⚠</span>
            <span>
              <strong>2 of 3 judge slots active.</strong> J3 (Panel Avg) is
              automatically calculated as the average of J1 and J2 scores.
            </span>
          </div>
        )}

        {/* Per-judge scores */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-3 py-2 text-left">Judge</th>
                <th className="px-3 py-2 text-center text-emerald-700">
                  PRO Total
                </th>
                <th className="px-3 py-2 text-center text-red-700">
                  CON Total
                </th>
                <th className="px-3 py-2 text-center">Decision</th>
              </tr>
            </thead>
            <tbody>
              {judgeTotals.map((jt) => (
                <tr
                  key={jt.position}
                  className={cn(
                    "border-b last:border-0",
                    jt.isPadded &&
                      "opacity-70 italic border-dashed bg-amber-50/50",
                  )}
                >
                  <td className="px-3 py-2 font-medium">
                    J{jt.position}: {jt.judgeAlias}
                    {jt.isPadded && (
                      <span className="ml-1.5 text-xs not-italic font-normal text-amber-600">
                        (auto)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-emerald-700 font-bold">
                    {fmtScore(jt.proTotal)}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-red-700 font-bold">
                    {fmtScore(jt.conTotal)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-semibold",
                        jt.winner === "PRO"
                          ? "bg-emerald-100 text-emerald-700"
                          : jt.winner === "CON"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-500",
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
          <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
            <p className="text-xs text-emerald-600 font-medium">
              PRO Total Score
            </p>
            <p className="text-3xl font-bold text-emerald-700">
              {fmtScore(decision.proGrandTotal)}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
            <p className="text-xs text-red-600 font-medium">CON Total Score</p>
            <p className="text-3xl font-bold text-red-700">
              {fmtScore(decision.conGrandTotal)}
            </p>
          </div>
        </div>

        {/* Final Decision */}
        <div
          className={cn(
            "rounded-xl p-6 text-center border-2",
            decision.winner === "PRO"
              ? "bg-emerald-50 border-emerald-300"
              : decision.winner === "CON"
                ? "bg-red-50 border-red-300"
                : "bg-slate-50 border-slate-300",
          )}
        >
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Judges Final Decision
          </p>
          <p className="text-2xl font-bold mt-1">
            {decision.winner === "PRO"
              ? "PRO Wins"
              : decision.winner === "CON"
                ? "CON Wins"
                : "Tie"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {decision.proWins} – {decision.conWins} judge votes
          </p>
        </div>

        {/* Audience votes */}
        <div className="bg-slate-50 rounded-xl p-4 text-center border">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Audience Vote
          </p>
          <div className="flex justify-center gap-8">
            <div>
              <span className="text-lg font-bold text-emerald-700">
                {audienceVotes.pro}
              </span>
              <span className="text-xs text-slate-400 block">PRO</span>
            </div>
            <div>
              <span className="text-lg font-bold text-red-700">
                {audienceVotes.con}
              </span>
              <span className="text-xs text-slate-400 block">CON</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
