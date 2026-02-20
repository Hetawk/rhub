"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  SPEECH_TYPES,
  SPEECH_CRITERIA,
  SCORING,
  SIDE_LABELS,
  SIDE_COLORS,
} from "@/lib/dbt";
import { cn } from "@/lib/utils";

// ---- Persistent Draft Storage ----
interface DraftState {
  drafts: Record<string, Record<string, Record<string, number>>>;
  comments: Record<string, Record<string, string>>;
}

function getDraftKey(roundId: string, userId: string) {
  return `dbt-draft-${roundId}-${userId}`;
}

function loadDraft(roundId: string, userId: string): DraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getDraftKey(roundId, userId));
    return raw ? (JSON.parse(raw) as DraftState) : null;
  } catch {
    return null;
  }
}

function saveDraft(roundId: string, userId: string, state: DraftState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getDraftKey(roundId, userId), JSON.stringify(state));
  } catch {
    // Storage may be full or unavailable — silently ignore
  }
}

function clearDraftEntry(
  roundId: string,
  userId: string,
  roundTeamId: string,
  speechType: string,
) {
  if (typeof window === "undefined") return;
  try {
    const key = getDraftKey(roundId, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const state = JSON.parse(raw) as DraftState;
    if (state.drafts[roundTeamId]?.[speechType]) {
      delete state.drafts[roundTeamId][speechType];
    }
    if (state.comments[roundTeamId]?.[speechType]) {
      delete state.comments[roundTeamId][speechType];
    }
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
}

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

interface Props {
  roundId: string;
  currentUserId?: string;
  isJudge: boolean;
  minScore?: number;
  maxScore?: number;
}

export function ScoringSheet({
  roundId,
  currentUserId,
  isJudge,
  minScore = SCORING.MIN_CRITERIA,
  maxScore = SCORING.MAX_CRITERIA,
}: Props) {
  const [roundTeams, setRoundTeams] = useState<RoundTeamData[]>([]);
  const [judgeSlots, setJudgeSlots] = useState<JudgeSlotData[]>([]);
  const [mySlot, setMySlot] = useState<JudgeSlotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [lockTimers, setLockTimers] = useState<Record<string, number>>({});
  const [autoSaveAt, setAutoSaveAt] = useState<Date | null>(null);

  // Draft scores for current judge
  const [drafts, setDrafts] = useState<
    Record<string, Record<string, Record<string, number>>>
  >({});
  const [comments, setComments] = useState<
    Record<string, Record<string, string>>
  >({});

  // Track whether we've already restored from localStorage for this session
  const restoredRef = useRef(false);
  // Debounce timer for auto-save
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/scores`);
      const data = await res.json();
      if (data.round) {
        setRoundTeams(data.round.roundTeams);
        setJudgeSlots(data.round.judgeSlots);

        // Find my slot
        let foundSlot: JudgeSlotData | null = null;
        if (currentUserId) {
          foundSlot =
            data.round.judgeSlots.find(
              (s: JudgeSlotData) => s.judge.user.id === currentUserId,
            ) || null;
          setMySlot(foundSlot);
        }

        // Initialize lock timers
        const timers: Record<string, number> = {};
        for (const rt of data.round.roundTeams) {
          for (const score of rt.scores) {
            if (score.lockedAt && !score.isLocked) {
              const remaining = Math.max(
                0,
                Math.ceil(
                  (new Date(score.lockedAt).getTime() - Date.now()) / 1000,
                ),
              );
              const key = `${score.slot.id}-${rt.id}-${score.speechType}`;
              timers[key] = remaining;
            }
          }
        }
        setLockTimers(timers);

        // ---- Restore persisted draft on first load ----
        if (!restoredRef.current && currentUserId && foundSlot) {
          restoredRef.current = true;
          const saved = loadDraft(roundId, currentUserId);
          if (saved) {
            // Only restore entries for speech types that have NOT been submitted yet
            const submittedKeys = new Set<string>();
            for (const rt of data.round.roundTeams) {
              for (const score of rt.scores) {
                if (score.slot.id === foundSlot.id) {
                  submittedKeys.add(`${rt.id}-${score.speechType}`);
                }
              }
            }

            const filteredDrafts: typeof saved.drafts = {};
            const filteredComments: typeof saved.comments = {};

            for (const [rtId, speechMap] of Object.entries(saved.drafts)) {
              for (const [speechType, criteria] of Object.entries(speechMap)) {
                if (!submittedKeys.has(`${rtId}-${speechType}`)) {
                  filteredDrafts[rtId] = filteredDrafts[rtId] || {};
                  filteredDrafts[rtId][speechType] = criteria;
                }
              }
            }
            for (const [rtId, speechMap] of Object.entries(saved.comments)) {
              for (const [speechType, comment] of Object.entries(speechMap)) {
                if (!submittedKeys.has(`${rtId}-${speechType}`)) {
                  filteredComments[rtId] = filteredComments[rtId] || {};
                  filteredComments[rtId][speechType] = comment;
                }
              }
            }

            if (Object.keys(filteredDrafts).length > 0) {
              setDrafts(filteredDrafts);
            }
            if (Object.keys(filteredComments).length > 0) {
              setComments(filteredComments);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch scores:", e);
    } finally {
      setLoading(false);
    }
  }, [roundId, currentUserId]);

  useEffect(() => {
    fetchScores();
    // Poll for updates every 5s
    const interval = setInterval(fetchScores, 5000);
    return () => clearInterval(interval);
  }, [fetchScores]);

  // Auto-save drafts + comments to localStorage whenever they change (debounced 800ms)
  useEffect(() => {
    if (!currentUserId || !restoredRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft(roundId, currentUserId, { drafts, comments });
      setAutoSaveAt(new Date());
    }, 800);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [drafts, comments, roundId, currentUserId]);

  // Countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setLockTimers((prev) => {
        const next: Record<string, number> = {};
        for (const [key, val] of Object.entries(prev)) {
          if (val > 0) next[key] = val - 1;
          else next[key] = 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCriteriaChange = (
    roundTeamId: string,
    speechType: string,
    criteriaKey: string,
    value: number,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [roundTeamId]: {
        ...prev[roundTeamId],
        [speechType]: {
          ...prev[roundTeamId]?.[speechType],
          [criteriaKey]: value,
        },
      },
    }));
  };

  const handleCommentChange = (
    roundTeamId: string,
    speechType: string,
    value: string,
  ) => {
    setComments((prev) => ({
      ...prev,
      [roundTeamId]: {
        ...prev[roundTeamId],
        [speechType]: value,
      },
    }));
  };

  const submitScore = async (roundTeamId: string, speechType: string) => {
    const key = `${roundTeamId}-${speechType}`;
    setSubmitting(key);
    try {
      const criteriaScores = drafts[roundTeamId]?.[speechType];
      if (!criteriaScores) return;

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

      // Clear the submitted entry from localStorage
      if (currentUserId) {
        clearDraftEntry(roundId, currentUserId, roundTeamId, speechType);
      }

      await fetchScores();
    } catch (e) {
      console.error("Submit error:", e);
    } finally {
      setSubmitting(null);
    }
  };

  // Get existing score for a judge slot + team + speech
  const getExistingScore = (
    roundTeamId: string,
    slotId: string,
    speechType: string,
  ): SpeechScoreData | undefined => {
    const rt = roundTeams.find((t) => t.id === roundTeamId);
    return rt?.scores.find(
      (s) => s.slot.id === slotId && s.speechType === speechType,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const proTeam = roundTeams.find((t) => t.side === "PRO");
  const conTeam = roundTeams.find((t) => t.side === "CON");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800">
          Finals Scoring Sheet
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Scoring Range: {minScore}–{maxScore} per criteria |{" "}
          {SCORING.CRITERIA_COUNT} criteria per speech
        </p>
        {/* Auto-save indicator — only shown while judge has unsaved drafts */}
        {isJudge && autoSaveAt && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center justify-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
            Draft auto-saved at{" "}
            {autoSaveAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        )}
        <div className="flex justify-center gap-8 mt-3">
          {proTeam && (
            <span
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                SIDE_COLORS.PRO.bg,
                SIDE_COLORS.PRO.text,
              )}
            >
              PRO: {proTeam.team.name}
            </span>
          )}
          {conTeam && (
            <span
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                SIDE_COLORS.CON.bg,
                SIDE_COLORS.CON.text,
              )}
            >
              CON: {conTeam.team.name}
            </span>
          )}
        </div>
      </div>

      {/* Judges legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {judgeSlots.map((slot) => (
          <div
            key={slot.id}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm border",
              mySlot?.id === slot.id
                ? "bg-amber-50 border-amber-300 font-semibold"
                : "bg-slate-50 border-slate-200",
            )}
          >
            J{slot.position}: {slot.judge.alias} ({slot.judge.user.name})
            {mySlot?.id === slot.id && (
              <span className="ml-1 text-amber-600">(You)</span>
            )}
          </div>
        ))}
      </div>

      {/* Speech scoring sections */}
      {SPEECH_TYPES.map((speech) => (
        <SpeechSection
          key={speech.key}
          speech={speech}
          proTeam={proTeam}
          conTeam={conTeam}
          judgeSlots={judgeSlots}
          mySlot={mySlot}
          isJudge={isJudge}
          minScore={minScore}
          maxScore={maxScore}
          drafts={drafts}
          comments={comments}
          lockTimers={lockTimers}
          submitting={submitting}
          getExistingScore={getExistingScore}
          onCriteriaChange={handleCriteriaChange}
          onCommentChange={handleCommentChange}
          onSubmit={submitScore}
        />
      ))}
    </div>
  );
}

// ---- Speech Section Component ----

interface SpeechSectionProps {
  speech: (typeof SPEECH_TYPES)[number];
  proTeam?: RoundTeamData;
  conTeam?: RoundTeamData;
  judgeSlots: JudgeSlotData[];
  mySlot: JudgeSlotData | null;
  isJudge: boolean;
  minScore: number;
  maxScore: number;
  drafts: Record<string, Record<string, Record<string, number>>>;
  comments: Record<string, Record<string, string>>;
  lockTimers: Record<string, number>;
  submitting: string | null;
  getExistingScore: (
    roundTeamId: string,
    slotId: string,
    speechType: string,
  ) => SpeechScoreData | undefined;
  onCriteriaChange: (
    rtId: string,
    speechType: string,
    criteriaKey: string,
    value: number,
  ) => void;
  onCommentChange: (rtId: string, speechType: string, value: string) => void;
  onSubmit: (rtId: string, speechType: string) => void;
}

function SpeechSection({
  speech,
  proTeam,
  conTeam,
  judgeSlots,
  mySlot,
  isJudge,
  minScore,
  maxScore,
  drafts,
  comments,
  lockTimers,
  submitting,
  getExistingScore,
  onCriteriaChange,
  onCommentChange,
  onSubmit,
}: SpeechSectionProps) {
  const criteria = SPEECH_CRITERIA[speech.key];
  const teams = [proTeam, conTeam].filter(Boolean) as RoundTeamData[];

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Speech header */}
      <div className="bg-slate-800 px-4 py-3 text-center">
        <span className="text-sm text-slate-400 mr-2">{speech.order}</span>
        <span className="text-white font-semibold">{speech.label}</span>
      </div>

      {/* Criteria headers */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-3 py-2 text-left font-medium text-slate-500 w-20">
                Side
              </th>
              {criteria.map((c) => (
                <th
                  key={c.key}
                  className="px-2 py-2 text-center font-medium text-slate-500 min-w-[90px]"
                >
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-bold text-slate-700 w-16">
                Sum
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const side = team.side;
              const sc = SIDE_COLORS[side];

              return judgeSlots.map((slot) => {
                const existing = getExistingScore(team.id, slot.id, speech.key);
                const isMySlot = mySlot?.id === slot.id;
                const canEdit = isJudge && isMySlot && !existing?.isLocked;
                const timerKey = `${slot.id}-${team.id}-${speech.key}`;
                const timer = lockTimers[timerKey];
                const draftScores = drafts[team.id]?.[speech.key] || {};
                const submitKey = `${team.id}-${speech.key}`;

                // Calculate sum from existing or draft
                let sum = 0;
                if (existing) {
                  sum = existing.totalScore || 0;
                } else {
                  sum = Object.values(draftScores).reduce((a, b) => a + b, 0);
                }

                return (
                  <tr
                    key={`${team.id}-${slot.id}`}
                    className={cn("border-b last:border-0", sc.bg)}
                  >
                    <td
                      className={cn("px-3 py-2 font-medium text-xs", sc.text)}
                    >
                      {SIDE_LABELS[side]}
                      <span className="block text-[10px] opacity-60">
                        J{slot.position}: {slot.judge.alias}
                      </span>
                    </td>
                    {criteria.map((c) => {
                      const existingVal = existing?.criteria.find(
                        (cr) => cr.criteriaKey === c.key,
                      )?.score;
                      const draftVal = draftScores[c.key];
                      const displayVal = existingVal ?? draftVal;

                      return (
                        <td key={c.key} className="px-1 py-1 text-center">
                          {canEdit && !existing ? (
                            <input
                              type="number"
                              min={minScore}
                              max={maxScore}
                              step={0.5}
                              value={draftVal ?? ""}
                              onChange={(e) =>
                                onCriteriaChange(
                                  team.id,
                                  speech.key,
                                  c.key,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-14 px-1 py-1 text-center border rounded text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none"
                            />
                          ) : (
                            <span className="text-sm font-mono">
                              {displayVal !== undefined ? displayVal : "–"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <span className={cn("font-bold text-sm", sc.text)}>
                        {sum > 0 ? sum : "–"}
                      </span>
                      {canEdit && !existing && (
                        <button
                          onClick={() => onSubmit(team.id, speech.key)}
                          disabled={submitting === submitKey}
                          className="block mx-auto mt-1 px-2 py-0.5 text-[10px] bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                        >
                          {submitting === submitKey ? "..." : "Submit"}
                        </button>
                      )}
                      {timer !== undefined && timer > 0 && (
                        <span className="block text-[10px] text-amber-600 mt-1">
                          Locks in {timer}s
                        </span>
                      )}
                      {existing?.isLocked && (
                        <span className="block text-[10px] text-slate-400 mt-1">
                          🔒
                        </span>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* Comment section for current judge */}
      {isJudge &&
        mySlot &&
        teams.map((team) => {
          const existing = getExistingScore(team.id, mySlot.id, speech.key);
          if (existing) return null;
          return (
            <div key={team.id} className="px-4 py-2 border-t bg-slate-50">
              <label className="text-xs text-slate-500 block mb-1">
                Comment ({SIDE_LABELS[team.side]}):
              </label>
              <input
                type="text"
                value={comments[team.id]?.[speech.key] || ""}
                onChange={(e) =>
                  onCommentChange(team.id, speech.key, e.target.value)
                }
                placeholder="Optional comment..."
                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-amber-300 focus:outline-none"
              />
            </div>
          );
        })}
    </div>
  );
}
