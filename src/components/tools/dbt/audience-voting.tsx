"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SIDE_COLORS } from "@/lib/dbt";

interface Props {
  roundId: string;
  proTeamName: string;
  conTeamName: string;
  /** Only head judge / admin can edit */
  canEdit: boolean;
  /** Whether round is completed */
  isCompleted?: boolean;
}

/**
 * Audience vote entry — head judge enters vote counts manually.
 * Audience does NOT login or self-serve; the head judge tallies audience votes
 * and enters the numbers here.
 */
export function AudienceVoting({
  roundId,
  proTeamName,
  conTeamName,
  canEdit,
  isCompleted,
}: Props) {
  const [pro, setPro] = useState(0);
  const [con, setCon] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchVotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/vote`);
      if (res.ok) {
        const data = await res.json();
        setPro(data.pro ?? 0);
        setCon(data.con ?? 0);
      }
    } catch {
      /* silent */
    }
  }, [roundId]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  const submit = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proVotes: pro, conVotes: con }),
      });
      if (res.ok) {
        const data = await res.json();
        setPro(data.pro);
        setCon(data.con);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save votes");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const total = pro + con;
  const proPercent = total > 0 ? Math.round((pro / total) * 100) : 50;
  const conPercent = total > 0 ? Math.round((con / total) * 100) : 50;

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-800 px-4 py-3 text-center">
        <h3 className="text-white font-semibold">Audience Vote</h3>
        <p className="text-slate-400 text-xs mt-0.5">
          Entered by Head Judge / Admin
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Vote count inputs */}
        <div className="grid grid-cols-2 gap-6">
          {/* PRO */}
          <div className="text-center space-y-2">
            <label
              className={cn(
                "block text-sm font-semibold",
                SIDE_COLORS.PRO.text,
              )}
            >
              PRO
            </label>
            <p className="text-xs text-slate-500 truncate">{proTeamName}</p>
            {canEdit && !isCompleted ? (
              <input
                type="number"
                min={0}
                value={pro}
                onChange={(e) =>
                  setPro(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full text-center text-3xl font-bold py-3 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:outline-none"
              />
            ) : (
              <p className="text-3xl font-bold text-emerald-700">{pro}</p>
            )}
          </div>

          {/* CON */}
          <div className="text-center space-y-2">
            <label
              className={cn(
                "block text-sm font-semibold",
                SIDE_COLORS.CON.text,
              )}
            >
              CON
            </label>
            <p className="text-xs text-slate-500 truncate">{conTeamName}</p>
            {canEdit && !isCompleted ? (
              <input
                type="number"
                min={0}
                value={con}
                onChange={(e) =>
                  setCon(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full text-center text-3xl font-bold py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 focus:outline-none"
              />
            ) : (
              <p className="text-3xl font-bold text-red-700">{con}</p>
            )}
          </div>
        </div>

        {/* Save button */}
        {canEdit && !isCompleted && (
          <div className="text-center">
            <button
              onClick={submit}
              disabled={saving}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Audience Votes"}
            </button>
            {saved && (
              <p className="text-sm text-emerald-600 mt-2">Votes saved!</p>
            )}
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>
        )}

        {isCompleted && (
          <p className="text-center text-xs text-slate-400">
            Round completed — votes are final.
          </p>
        )}

        {/* Results bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={cn("font-medium", SIDE_COLORS.PRO.text)}>
              PRO: {pro} ({proPercent}%)
            </span>
            <span className={cn("font-medium", SIDE_COLORS.CON.text)}>
              CON: {con} ({conPercent}%)
            </span>
          </div>
          <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
            {total > 0 && (
              <>
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${proPercent}%` }}
                />
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${conPercent}%` }}
                />
              </>
            )}
          </div>
          <p className="text-center text-xs text-slate-400">
            Total: {total} vote{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
