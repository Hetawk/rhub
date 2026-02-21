"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// Audience vote is always a 5-vote split: either PRO 3 / CON 2 or PRO 2 / CON 3.
const TOTAL_VOTES = 5;
const VALID_PRO = [2, 3];
const VOTE_OPTIONS: { pro: number; con: number }[] = [
  { pro: 3, con: 2 },
  { pro: 2, con: 3 },
];

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
 * Audience vote entry — head judge or admin selects the split.
 * Only two valid distributions: PRO 3/CON 2  or  PRO 2/CON 3.
 * Selecting one auto-mirrors the other.
 */
export function AudienceVoting({
  roundId,
  proTeamName,
  conTeamName,
  canEdit,
  isCompleted,
}: Props) {
  // null = not yet set
  const [pro, setPro] = useState<number | null>(null);
  const [con, setCon] = useState<number | null>(null);
  const [proInput, setProInput] = useState("");
  const [conInput, setConInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchVotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/vote`);
      if (res.ok) {
        const data = await res.json();
        const p = data.pro ?? 0;
        const c = data.con ?? 0;
        // Only show if a valid split has been saved
        if (p + c === TOTAL_VOTES && (p === 2 || p === 3)) {
          setPro(p);
          setCon(c);
          setProInput(String(p));
          setConInput(String(c));
        } else {
          setPro(null);
          setCon(null);
          setProInput("");
          setConInput("");
        }
      }
    } catch {
      /* silent */
    }
  }, [roundId]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  /** Select via toggle card — auto-mirrors complement. */
  const selectPro = (proVotes: number) => {
    setPro(proVotes);
    setCon(TOTAL_VOTES - proVotes);
    setProInput(String(proVotes));
    setConInput(String(TOTAL_VOTES - proVotes));
    setError("");
    setInputError("");
  };

  /** Typing in the PRO input — CON mirrors automatically. */
  const handleProInput = (raw: string) => {
    setProInput(raw);
    setInputError("");
    const n = parseInt(raw, 10);
    if (raw === "") {
      setPro(null);
      setCon(null);
      setConInput("");
      return;
    }
    if (!VALID_PRO.includes(n)) {
      setInputError("PRO votes must be 2 or 3.");
      setPro(null);
      setCon(null);
      setConInput("");
      return;
    }
    setPro(n);
    setCon(TOTAL_VOTES - n);
    setConInput(String(TOTAL_VOTES - n));
  };

  /** Typing in the CON input — PRO mirrors automatically. */
  const handleConInput = (raw: string) => {
    setConInput(raw);
    setInputError("");
    const n = parseInt(raw, 10);
    if (raw === "") {
      setPro(null);
      setCon(null);
      setProInput("");
      return;
    }
    const validCon = [TOTAL_VOTES - 3, TOTAL_VOTES - 2]; // [2, 3]
    if (!validCon.includes(n)) {
      setInputError("CON votes must be 2 or 3.");
      setPro(null);
      setCon(null);
      setProInput("");
      return;
    }
    setCon(n);
    setPro(TOTAL_VOTES - n);
    setProInput(String(TOTAL_VOTES - n));
  };

  const submit = async () => {
    if (pro === null || con === null) {
      setError("Please select a vote split before saving.");
      return;
    }
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

  const proDisplay = pro ?? 0;
  const conDisplay = con ?? 0;
  const proPercent = Math.round((proDisplay / TOTAL_VOTES) * 100);
  const conPercent = 100 - proPercent;
  const hasSelection = pro !== null;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#182e5f] dark:bg-[#0f1e40] px-4 py-3 text-center">
        <h3 className="text-white font-semibold tracking-wide">
          Audience Vote
        </h3>
        <p className="text-slate-300 dark:text-slate-400 text-xs mt-0.5">
          Entered by Head Judge / Admin
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Instruction */}
        {canEdit && !isCompleted && (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Select a split below{" "}
            <span className="text-slate-400 dark:text-slate-500">
              or type a value
            </span>{" "}
            — the other side fills automatically.
            <br />
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Total is always 5 votes — winner gets 3, runner-up gets 2.
            </span>
          </p>
        )}

        {/* Option buttons (edit mode) */}
        {canEdit && !isCompleted ? (
          <div className="space-y-4">
            {/* Toggle cards */}
            <div className="grid grid-cols-2 gap-3">
              {VOTE_OPTIONS.map((opt) => {
                const isSelected = pro === opt.pro;
                const isPro = opt.pro > opt.con;
                return (
                  <button
                    key={opt.pro}
                    onClick={() => selectPro(opt.pro)}
                    className={cn(
                      "relative flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1",
                      isPro
                        ? isSelected
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-emerald-300"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10"
                        : isSelected
                          ? "border-red-500 bg-red-50 dark:bg-red-900/30 ring-red-300"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/50 dark:hover:bg-red-900/10",
                    )}
                  >
                    {isSelected && (
                      <span
                        className={cn(
                          "absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded",
                          isPro
                            ? "bg-emerald-500 text-white"
                            : "bg-red-500 text-white",
                        )}
                      >
                        ✓
                      </span>
                    )}

                    {/* PRO pill */}
                    <div className="flex items-center gap-2 w-full justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 w-7 text-right">
                        PRO
                      </span>
                      <span
                        className={cn(
                          "text-2xl font-black tabular-nums",
                          opt.pro > opt.con
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-600 dark:text-slate-300",
                        )}
                      >
                        {opt.pro}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">
                      vs
                    </span>

                    {/* CON pill */}
                    <div className="flex items-center gap-2 w-full justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 w-7 text-right">
                        CON
                      </span>
                      <span
                        className={cn(
                          "text-2xl font-black tabular-nums",
                          opt.con > opt.pro
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-600 dark:text-slate-300",
                        )}
                      >
                        {opt.con}
                      </span>
                    </div>

                    {/* Team label */}
                    <span
                      className={cn(
                        "mt-1 text-[10px] font-semibold truncate w-full text-center",
                        isPro
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {isPro ? proTeamName : conTeamName} wins
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Manual number inputs */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
                Or enter:
              </span>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide shrink-0">
                  PRO
                </span>
                <input
                  type="number"
                  min={2}
                  max={3}
                  value={proInput}
                  onChange={(e) => handleProInput(e.target.value)}
                  placeholder="2 or 3"
                  className={cn(
                    "w-16 text-center text-sm font-bold rounded-lg border px-2 py-1.5 transition-colors",
                    "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100",
                    "focus:outline-none focus:ring-2",
                    inputError && inputError.startsWith("PRO")
                      ? "border-red-400 focus:ring-red-400"
                      : pro !== null
                        ? "border-emerald-400 dark:border-emerald-600 focus:ring-emerald-400"
                        : "border-slate-300 dark:border-slate-600 focus:ring-slate-400",
                  )}
                />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-600 font-medium shrink-0">
                /
              </span>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide shrink-0">
                  CON
                </span>
                <input
                  type="number"
                  min={2}
                  max={3}
                  value={conInput}
                  onChange={(e) => handleConInput(e.target.value)}
                  placeholder="2 or 3"
                  className={cn(
                    "w-16 text-center text-sm font-bold rounded-lg border px-2 py-1.5 transition-colors",
                    "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100",
                    "focus:outline-none focus:ring-2",
                    inputError && inputError.startsWith("CON")
                      ? "border-red-400 focus:ring-red-400"
                      : con !== null
                        ? "border-red-400 dark:border-red-600 focus:ring-red-400"
                        : "border-slate-300 dark:border-slate-600 focus:ring-slate-400",
                  )}
                />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                = {TOTAL_VOTES}
              </span>
            </div>

            {/* Input validation error */}
            {inputError && (
              <p className="text-center text-xs text-red-500 dark:text-red-400">
                {inputError}
              </p>
            )}
          </div>
        ) : (
          /* Read-only display */
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                PRO
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {proTeamName}
              </p>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {proDisplay}
              </p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                CON
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {conTeamName}
              </p>
              <p className="text-3xl font-black text-red-600 dark:text-red-400">
                {conDisplay}
              </p>
            </div>
          </div>
        )}

        {/* Save button */}
        {canEdit && !isCompleted && (
          <div className="text-center space-y-2">
            <button
              onClick={submit}
              disabled={saving || !hasSelection}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
                hasSelection
                  ? "bg-[#C8A061] hover:bg-[#b8904f] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed",
                saving && "opacity-60",
              )}
            >
              {saving ? "Saving..." : "Save Audience Votes"}
            </button>
            {saved && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Votes saved!
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
        )}

        {isCompleted && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Round completed — votes are final.
          </p>
        )}

        {/* Results ratio bar */}
        {hasSelection && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">
                PRO: {proDisplay} ({proPercent}%)
              </span>
              <span className="text-red-600 dark:text-red-400">
                CON: {conDisplay} ({conPercent}%)
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              <div
                className="bg-emerald-500 dark:bg-emerald-600 transition-all duration-500 rounded-l-full"
                style={{ width: `${proPercent}%` }}
              />
              <div
                className="bg-red-500 dark:bg-red-600 transition-all duration-500 rounded-r-full"
                style={{ width: `${conPercent}%` }}
              />
            </div>
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Ratio: {proDisplay} : {conDisplay} (Total {TOTAL_VOTES} votes)
            </p>
          </div>
        )}

        {!hasSelection && !canEdit && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 italic">
            No audience votes recorded.
          </p>
        )}
      </div>
    </div>
  );
}
