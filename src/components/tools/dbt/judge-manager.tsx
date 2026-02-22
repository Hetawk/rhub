"use client";

/**
 * JudgeManager — Allows JUDGE_ADMIN+ to assign judges to a debate event.
 *
 * Features:
 *  - Live user search dropdown (queries /api/tools/dbt/users?q=...)
 *  - Selecting an existing user pre-fills the form
 *  - Typing an email not in the system sends an account-setup invite
 *  - Lists current judges with remove option
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getRoleMeta } from "@/lib/roles";

interface UserResult {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface JudgeData {
  id: string;
  alias: string;
  isHeadJudge: boolean;
  inviteEmail: string | null;
  inviteSentAt: string | null;
  user: { id: string; name: string; email: string; role: string };
  slots: { id: string; roundId: string; position: number }[];
}

interface RoundData {
  id: string;
  roundNum: number;
  topic: string | null;
  completedAt: string | null;
  judgeSlots: {
    id: string;
    position: number;
    isRoundHead: boolean;
    judgeId: string | null; // null = detached (scores preserved)
    detachedAlias: string | null; // alias snapshot when judge was removed
    judge: { id: string } | null;
  }[];
}

interface Props {
  eventId: string;
}

export function JudgeManager({ eventId }: Props) {
  const [judges, setJudges] = useState<JudgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [expandedJudgeId, setExpandedJudgeId] = useState<string | null>(null);
  const [togglingSlot, setTogglingSlot] = useState<{
    judgeId: string;
    roundId: string;
  } | null>(null);

  // Form state
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [alias, setAlias] = useState("");
  const [isHeadJudge, setIsHeadJudge] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(
    null,
  );
  const [resendSuccessId, setResendSuccessId] = useState<string | null>(null);

  // Alias editing
  const [editAliasId, setEditAliasId] = useState<string | null>(null);
  const [editAliasValue, setEditAliasValue] = useState("");
  const [savingAlias, setSavingAlias] = useState(false);

  // Judge reorder state — per-round drag-free ordering with up/down arrows
  const [reorderRoundId, setReorderRoundId] = useState<string | null>(null);
  // Local draft order: array of slotIds in display order
  const [reorderDraft, setReorderDraft] = useState<string[]>([]);
  const [savingReorder, setSavingReorder] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [activeInputMode, setActiveInputMode] = useState<"search" | "email">(
    "search",
  );

  // Round-view add-judge dropdown state
  const [rvAddOpen, setRvAddOpen] = useState<string | null>(null); // roundId whose add-dropdown is open
  const [rvAddJudgeId, setRvAddJudgeId] = useState(""); // judgeId selected in that dropdown
  const [settingRoundHead, setSettingRoundHead] = useState<string | null>(null); // slotId being promoted

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchJudges = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/dbt/events/${eventId}/judges`);
      const data = await res.json();
      setJudges(data.judges || []);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchRounds = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/dbt/events/${eventId}/rounds`);
      const data = await res.json();
      setRounds(data.rounds || []);
    } catch {
      /* silently ignore */
    } finally {
      setLoadingRounds(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchJudges();
    fetchRounds();
  }, [fetchJudges, fetchRounds]);

  const toggleRoundSlot = async (
    judgeId: string,
    roundId: string,
    isInRound: boolean,
    slotId?: string,
  ) => {
    setTogglingSlot({ judgeId, roundId });
    try {
      if (isInRound && slotId) {
        const res = await fetch(`/api/tools/dbt/rounds/${roundId}/slots`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotId }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert(d.error ?? "Failed to remove judge from round.");
          return;
        }
        const d = await res.json().catch(() => ({}));
        // If the server detached (scores preserved) rather than fully deleted, inform the user
        if (d.detached && d.message) {
          alert(`Score data preserved: ${d.message}`);
        }
      } else if (!isInRound) {
        const res = await fetch(`/api/tools/dbt/rounds/${roundId}/slots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ judgeId }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert(d.error ?? "Failed to add judge to round.");
          return;
        }
      }
      await Promise.all([fetchJudges(), fetchRounds()]);
    } catch {
      alert("Network error — please try again.");
    } finally {
      setTogglingSlot(null);
    }
  };

  /** Promote a slot to be the round's head judge (PATCH setRoundHead) */
  const setRoundHead = async (slotId: string, roundId: string) => {
    setSettingRoundHead(slotId);
    try {
      const res = await fetch(`/api/tools/dbt/rounds/${roundId}/slots`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setRoundHead: { slotId } }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Failed to set round head judge.");
      } else {
        await fetchRounds();
      }
    } catch {
      alert("Network error — please try again.");
    } finally {
      setSettingRoundHead(null);
    }
  };

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim() || activeInputMode !== "search") {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/tools/dbt/users?q=${encodeURIComponent(searchQuery)}&limit=10`,
        );
        const data = await res.json();
        setSearchResults(data.users || []);
        setShowDropdown(true);
      } catch {
        /* silently ignore */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [searchQuery, activeInputMode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectUser = (u: UserResult) => {
    setSelectedUser(u);
    setSearchQuery(u.name);
    setShowDropdown(false);
    // Auto-fill alias with first word of name
    if (!alias) setAlias(u.name.split(" ")[0] || u.name);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setSearchQuery("");
    setSearchResults([]);
    setAlias("");
    setIsHeadJudge(false);
    setManualEmail("");
    setManualName("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias.trim()) {
      setError("Alias is required");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      let body: Record<string, unknown>;
      if (activeInputMode === "search" && selectedUser) {
        body = { userId: selectedUser.id, alias: alias.trim(), isHeadJudge };
      } else if (activeInputMode === "email") {
        if (!manualEmail.trim()) {
          setError("Email is required");
          setSubmitting(false);
          return;
        }
        if (!manualName.trim()) {
          setError("Name is required");
          setSubmitting(false);
          return;
        }
        body = {
          email: manualEmail.trim(),
          name: manualName.trim(),
          alias: alias.trim(),
          isHeadJudge,
        };
      } else {
        setError("Please select a user or enter an email address");
        setSubmitting(false);
        return;
      }

      // Client-side duplicate check
      const targetEmail =
        activeInputMode === "search"
          ? selectedUser?.email
          : manualEmail.trim().toLowerCase();
      if (targetEmail) {
        const dup = judges.find(
          (j) => j.user.email.toLowerCase() === targetEmail.toLowerCase(),
        );
        if (dup) {
          setError(`${dup.alias} is already assigned to this event.`);
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch(`/api/tools/dbt/events/${eventId}/judges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to assign judge");
        return;
      }
      setSuccess(
        activeInputMode === "email" &&
          !judges.find((j) => j.inviteEmail === manualEmail)
          ? `Invite sent to ${manualEmail} — they'll receive an account setup link.`
          : `${data.judge.user.name} added as ${alias}.`,
      );
      resetForm();
      await fetchJudges();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const removeJudge = async (judgeId: string) => {
    if (!confirm("Remove this judge from the event?")) return;
    try {
      await fetch(`/api/tools/dbt/events/${eventId}/judges/${judgeId}`, {
        method: "DELETE",
      });
      await fetchJudges();
    } catch {
      /* silently ignore */
    }
  };

  const resendInvite = async (judgeId: string) => {
    setResendingInviteId(judgeId);
    setResendSuccessId(null);
    try {
      const res = await fetch(
        `/api/tools/dbt/events/${eventId}/judges/${judgeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resendInvite: true }),
        },
      );
      if (res.ok) {
        setResendSuccessId(judgeId);
        setTimeout(() => setResendSuccessId(null), 4000);
        await fetchJudges();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to resend invite");
      }
    } catch {
      alert("Network error — please try again.");
    } finally {
      setResendingInviteId(null);
    }
  };

  const toggleHeadJudge = async (judgeId: string, makeHead: boolean) => {
    const msg = makeHead
      ? "Make this judge the Head Judge? Any existing Head Judge will be demoted."
      : "Remove Head Judge role from this judge?";
    if (!confirm(msg)) return;
    try {
      const res = await fetch(
        `/api/tools/dbt/events/${eventId}/judges/${judgeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHeadJudge: makeHead }),
        },
      );
      if (res.ok) {
        await fetchJudges();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update judge role");
      }
    } catch {
      alert("Network error");
    }
  };

  // Open the reorder panel for a specific round, initialising the draft from current live slot positions
  const openReorder = (roundId: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return;
    // Sort live slots only (judgeId != null) by current position
    const sorted = [...round.judgeSlots]
      .filter((s) => s.judgeId !== null)
      .sort((a, b) => a.position - b.position);
    setReorderDraft(sorted.map((s) => s.id));
    setReorderRoundId(roundId);
    setReorderError(null);
  };

  const moveSlot = (index: number, dir: -1 | 1) => {
    const next = [...reorderDraft];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    // Prevent moving the round head judge away from position 0 (J1)
    const round = rounds.find((r) => r.id === reorderRoundId);
    const headSlotId = round?.judgeSlots.find((s) => s.isRoundHead)?.id;
    if (headSlotId) {
      if (next[index] === headSlotId && dir === 1) return; // head can't move down
      if (next[target] === headSlotId && dir === -1) return; // can't displace head
    }
    [next[index], next[target]] = [next[target], next[index]];
    setReorderDraft(next);
  };

  const saveReorder = async () => {
    if (!reorderRoundId) return;
    setSavingReorder(true);
    setReorderError(null);
    try {
      const reorder = reorderDraft.map((slotId, i) => ({
        slotId,
        position: i + 1,
      }));
      const res = await fetch(`/api/tools/dbt/rounds/${reorderRoundId}/slots`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder }),
      });
      if (!res.ok) {
        const d = await res.json();
        setReorderError(d.error || "Failed to save order");
        return;
      }
      await Promise.all([fetchJudges(), fetchRounds()]);
      setReorderRoundId(null);
    } catch {
      setReorderError("Network error");
    } finally {
      setSavingReorder(false);
    }
  };

  const hasHeadJudge = judges.some((j) => j.isHeadJudge);
  const openRounds = rounds.filter((r) => !r.completedAt);

  const updateAlias = async (judgeId: string, newAlias: string) => {
    if (!newAlias.trim()) return;
    setSavingAlias(true);
    try {
      const res = await fetch(
        `/api/tools/dbt/events/${eventId}/judges/${judgeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alias: newAlias.trim() }),
        },
      );
      if (res.ok) {
        await fetchJudges();
        setEditAliasId(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update alias");
      }
    } catch {
      alert("Network error");
    } finally {
      setSavingAlias(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Assign judge form */}
      <div className="border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-900/50 p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Assign Judge
        </h3>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-4 w-fit">
          <button
            onClick={() => {
              setActiveInputMode("search");
              setError("");
            }}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeInputMode === "search"
                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            Search Existing Users
          </button>
          <button
            onClick={() => {
              // If the search field looks like an email, carry it over
              if (!manualEmail && searchQuery.includes("@")) {
                setManualEmail(searchQuery);
              }
              setActiveInputMode("email");
              setError("");
            }}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              activeInputMode === "email"
                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            Invite by Email
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeInputMode === "search" ? (
            /* User search dropdown */
            <div className="relative" ref={dropdownRef}>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Search users by name or email
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedUser) setSelectedUser(null);
                }}
                onFocus={() =>
                  searchResults.length > 0 && setShowDropdown(true)
                }
                placeholder="Type a name or email…"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-[#C8A061]/40 focus:border-transparent dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {searching && (
                <div className="absolute right-3 top-8.5">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                </div>
              )}
              {/* Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg dark:shadow-slate-900/60 overflow-hidden">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUser(u)}
                      className="w-full px-3 py-2.5 flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                    >
                      <div className="text-left">
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {u.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {u.email}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          getRoleMeta(u.role).color,
                        )}
                      >
                        {getRoleMeta(u.role).label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown &&
                searchResults.length === 0 &&
                searchQuery.length > 1 &&
                !searching && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg dark:shadow-slate-900/60 p-3 text-xs text-slate-400 dark:text-slate-500 text-center">
                    No users found. Switch to &ldquo;Invite by Email&rdquo; to
                    invite someone new.
                  </div>
                )}
              {/* Selected user badge */}
              {selectedUser && (
                <div className="mt-2 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {selectedUser.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedUser.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      getRoleMeta(selectedUser.role).color,
                    )}
                  >
                    {getRoleMeta(selectedUser.role).label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setSearchQuery("");
                    }}
                    className="text-slate-400 hover:text-red-400 text-sm ml-1"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Manual email input */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Email address *
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="judge@example.com"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-[#C8A061]/40 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Full name *
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Judge's full name"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-[#C8A061]/40 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                This person will receive an email with a link to set up their
                account. Their judge role will be linked automatically.
              </p>
            </div>
          )}

          {/* Alias + head judge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Judge alias (display name) *
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="e.g. C-Doe, Kolia"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-[#C8A061]/40 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col justify-end gap-1 pb-0.5">
              <label
                className={cn(
                  "flex items-center gap-2",
                  hasHeadJudge
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer",
                )}
              >
                <input
                  type="checkbox"
                  checked={isHeadJudge}
                  disabled={hasHeadJudge}
                  onChange={(e) => setIsHeadJudge(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-200 accent-amber-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Head Judge
                </span>
              </label>
              {hasHeadJudge && (
                <p className="text-[10px] text-amber-600 leading-tight">
                  A Head Judge is already assigned.
                </p>
              )}
            </div>
          </div>

          {/* Errors + success */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Assign Judge"}
          </button>
        </form>
      </div>

      {/* Reorder judges panel — shown when a round is selected */}
      {openRounds.some(
        (r) => r.judgeSlots.filter((s) => s.judgeId !== null).length > 1,
      ) && (
        <div className="border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-900/50 overflow-hidden">
          <div className="px-5 py-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Reorder Judges (J1 / J2 / J3)
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Head Judge is always J1 and cannot be moved.
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Round selector */}
            {reorderRoundId === null ? (
              <div className="space-y-2">
                {openRounds
                  .filter(
                    (r) =>
                      r.judgeSlots.filter((s) => s.judgeId !== null).length > 1,
                  )
                  .map((r) => {
                    const label =
                      r.topic && r.topic.length > 0
                        ? `R${r.roundNum} — ${r.topic.length > 45 ? r.topic.substring(0, 45) + "…" : r.topic}`
                        : `Round ${r.roundNum}`;
                    // Build current order display from live slots only
                    const orderedSlots = [...r.judgeSlots]
                      .filter((s) => s.judgeId !== null)
                      .sort((a, b) => a.position - b.position);
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                            {label}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {orderedSlots.map((s, i) => {
                              const judge = judges.find((j) =>
                                j.slots.some((sl) => sl.id === s.id),
                              );
                              return (
                                <span key={s.id}>
                                  {i > 0 && " → "}
                                  <span
                                    className={
                                      s.isRoundHead
                                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                                        : ""
                                    }
                                  >
                                    J{s.position} {judge?.alias ?? "?"}
                                    {s.isRoundHead ? " 👑" : ""}
                                  </span>
                                </span>
                              );
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => openReorder(r.id)}
                          className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-600 font-medium transition-colors whitespace-nowrap"
                        >
                          ↕ Reorder
                        </button>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* Active reorder editor */
              (() => {
                const round = rounds.find((r) => r.id === reorderRoundId)!;
                const label =
                  round.topic && round.topic.length > 0
                    ? `R${round.roundNum} — ${round.topic.length > 40 ? round.topic.substring(0, 40) + "…" : round.topic}`
                    : `Round ${round.roundNum}`;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {label}
                      </p>
                      <button
                        onClick={() => setReorderRoundId(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        ✕ Cancel
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {reorderDraft.map((slotId, index) => {
                        const slot = round.judgeSlots.find(
                          (s) => s.id === slotId,
                        );
                        const judge = judges.find((j) =>
                          j.slots.some((s) => s.id === slotId),
                        );
                        // Lock at J1 if this slot is the round head
                        const isHead = !!slot?.isRoundHead;
                        const isFirst = index === 0;
                        const isLast = index === reorderDraft.length - 1;

                        return (
                          <div
                            key={slotId}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                              isHead
                                ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900",
                            )}
                          >
                            {/* Position badge */}
                            <span
                              className={cn(
                                "text-xs font-bold font-mono w-7 text-center shrink-0",
                                isHead
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-400 dark:text-slate-500",
                              )}
                            >
                              J{index + 1}
                            </span>

                            {/* Judge info */}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate block">
                                {judge?.alias ?? "Unknown"}
                              </span>
                              {isHead && (
                                <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                  Round Head Judge · locked at J1
                                </span>
                              )}
                            </div>

                            {/* Up / Down controls */}
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => moveSlot(index, -1)}
                                disabled={isFirst || isHead}
                                title="Move up"
                                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => moveSlot(index, 1)}
                                disabled={isLast || isHead}
                                title="Move down"
                                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {reorderError && (
                      <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                        {reorderError}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveReorder}
                        disabled={savingReorder}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {savingReorder ? "Saving…" : "Save Order"}
                      </button>
                      <button
                        onClick={() => setReorderRoundId(null)}
                        disabled={savingReorder}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* ── Judges by Round ────────────────────────────────── */}
      <div className="border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-900/50 overflow-hidden">
        <div className="px-5 py-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              Judges by Round
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              View and manage which judges are assigned to each round.
            </p>
          </div>
        </div>

        {loadingRounds ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          </div>
        ) : rounds.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-8">
            No rounds yet. Create a round first.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...rounds]
              .sort((a, b) => a.roundNum - b.roundNum)
              .map((r) => {
                const isCompleted = !!r.completedAt;
                // Live slots: judges still assigned (judgeId != null)
                const liveSlots = [...r.judgeSlots]
                  .filter((s) => s.judgeId !== null)
                  .sort((a, b) => a.position - b.position);
                // Current round head slot
                const roundHeadSlot = liveSlots.find((s) => s.isRoundHead);
                // Judges not yet in this round (available to add)
                const unassignedJudges = judges.filter(
                  (j) =>
                    !r.judgeSlots.some(
                      (s) => s.judgeId && s.judge?.id === j.id,
                    ),
                );
                const isAddOpen = rvAddOpen === r.id;

                return (
                  <div key={r.id} className="px-4 py-3">
                    {/* Round header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                        R{r.roundNum}
                      </span>
                      {r.topic && r.topic.trim() && (
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1 max-w-[260px]">
                          {r.topic}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 rounded px-1.5 py-0.5">
                          Completed
                        </span>
                      )}
                    </div>

                    {/* Judge chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {liveSlots.length === 0 ? (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                          No judges assigned
                        </span>
                      ) : (
                        liveSlots.map((slot) => {
                          const judge = judges.find((j) =>
                            j.slots.some((s) => s.id === slot.id),
                          );
                          const isToggling =
                            togglingSlot?.judgeId === (judge?.id ?? "") &&
                            togglingSlot?.roundId === r.id;
                          return (
                            <span
                              key={slot.id}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border text-[11px] font-medium px-2.5 py-0.5 transition-colors",
                                slot.isRoundHead
                                  ? "border-amber-400 dark:border-amber-600 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200"
                                  : judge?.isHeadJudge
                                    ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"
                                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                                isToggling && "opacity-50",
                              )}
                            >
                              <span className="font-mono text-[9px] font-bold opacity-60">
                                J{slot.position}
                              </span>
                              {judge?.alias ?? "?"}
                              {slot.isRoundHead && (
                                <span
                                  title="Round Head Judge"
                                  className="text-[9px] font-bold text-amber-600 dark:text-amber-400"
                                >
                                  👑
                                </span>
                              )}
                              {!isCompleted && judge && (
                                <button
                                  disabled={isToggling}
                                  onClick={() =>
                                    toggleRoundSlot(
                                      judge.id,
                                      r.id,
                                      true,
                                      slot.id,
                                    )
                                  }
                                  title="Remove from round"
                                  className="ml-0.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 transition-colors leading-none"
                                >
                                  ✕
                                </button>
                              )}
                            </span>
                          );
                        })
                      )}
                    </div>

                    {/* ── Head Judge Selector ────────────────────────── */}
                    {/* Only meaningful when 2+ judges are in the round */}
                    {!isCompleted && liveSlots.length > 1 && (
                      <div className="mb-2 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30 px-3 py-2">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide shrink-0 mt-0.5">
                            Round Head:
                          </span>

                          {roundHeadSlot ? (
                            /* ── Head is set: show who it is + allow promoting others ── */
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Current head — non-interactive, prominent amber chip */}
                              {(() => {
                                const headJudge = judges.find((j) =>
                                  j.slots.some(
                                    (s) => s.id === roundHeadSlot.id,
                                  ),
                                );
                                return (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 dark:border-amber-600 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-[10px] font-semibold px-2.5 py-0.5 select-none">
                                    👑
                                    <span className="font-mono text-[9px] opacity-70">
                                      J1
                                    </span>
                                    {headJudge?.alias ?? "?"}
                                  </span>
                                );
                              })()}

                              {/* Separator */}
                              <span className="text-[10px] text-slate-300 dark:text-slate-600 select-none">
                                ·
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 select-none">
                                promote:
                              </span>

                              {/* Other judges — click to make them the round head */}
                              {liveSlots
                                .filter((s) => !s.isRoundHead)
                                .map((slot) => {
                                  const slotJudge = judges.find((j) =>
                                    j.slots.some((s) => s.id === slot.id),
                                  );
                                  const isSetting =
                                    settingRoundHead === slot.id;
                                  return (
                                    <button
                                      key={slot.id}
                                      disabled={!!settingRoundHead}
                                      onClick={() =>
                                        setRoundHead(slot.id, r.id)
                                      }
                                      title="Set as round head judge (will become J1)"
                                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-medium px-2 py-0.5 text-slate-500 dark:text-slate-400 hover:border-amber-300 dark:hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 transition-colors cursor-pointer"
                                    >
                                      {isSetting ? (
                                        <span className="animate-spin inline-block leading-none">
                                          ⟳
                                        </span>
                                      ) : (
                                        <span className="opacity-50">☆</span>
                                      )}
                                      <span className="font-mono text-[9px] opacity-60">
                                        J{slot.position}
                                      </span>
                                      {slotJudge?.alias ?? "?"}
                                    </button>
                                  );
                                })}
                            </div>
                          ) : (
                            /* ── No head set: show dashed chips to pick one ── */
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium italic">
                                None set —
                              </span>
                              {liveSlots.map((slot) => {
                                const slotJudge = judges.find((j) =>
                                  j.slots.some((s) => s.id === slot.id),
                                );
                                const isSetting = settingRoundHead === slot.id;
                                return (
                                  <button
                                    key={slot.id}
                                    disabled={!!settingRoundHead}
                                    onClick={() => setRoundHead(slot.id, r.id)}
                                    title="Set as round head judge"
                                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-[10px] font-medium px-2 py-0.5 text-slate-500 dark:text-slate-400 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 transition-colors cursor-pointer"
                                  >
                                    {isSetting ? (
                                      <span className="animate-spin inline-block leading-none">
                                        ⟳
                                      </span>
                                    ) : (
                                      <span className="opacity-50">☆</span>
                                    )}
                                    <span className="font-mono text-[9px] opacity-60">
                                      J{slot.position}
                                    </span>
                                    {slotJudge?.alias ?? "?"}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Add judge — only on open rounds */}
                    {!isCompleted && (
                      <div className="relative">
                        {isAddOpen ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={rvAddJudgeId}
                              onChange={(e) => setRvAddJudgeId(e.target.value)}
                              className="flex-1 min-w-0 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-[#C8A061]/40 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                            >
                              <option value="">— select a judge —</option>
                              {unassignedJudges.map((j) => (
                                <option key={j.id} value={j.id}>
                                  {j.alias}
                                  {j.isHeadJudge ? " (HEAD)" : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              disabled={
                                !rvAddJudgeId ||
                                !!(
                                  togglingSlot?.judgeId === rvAddJudgeId &&
                                  togglingSlot?.roundId === r.id
                                )
                              }
                              onClick={async () => {
                                if (!rvAddJudgeId) return;
                                await toggleRoundSlot(
                                  rvAddJudgeId,
                                  r.id,
                                  false,
                                );
                                setRvAddOpen(null);
                                setRvAddJudgeId("");
                              }}
                              className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setRvAddOpen(null);
                                setRvAddJudgeId("");
                              }}
                              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          unassignedJudges.length > 0 && (
                            <button
                              onClick={() => {
                                setRvAddOpen(r.id);
                                setRvAddJudgeId("");
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full px-2.5 py-0.5 font-medium transition-colors"
                            >
                              ＋ Add judge
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Current judges list */}
      <div className="border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-900/50 overflow-hidden">
        <div className="px-5 py-3 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Assigned Judges ({judges.length})
          </h3>
          <button
            onClick={fetchJudges}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          </div>
        ) : judges.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-8">
            No judges assigned yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-50 dark:divide-slate-800">
            {judges.map((j) => (
              <li
                key={j.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {editAliasId === j.id ? (
                      <form
                        className="flex items-center gap-1.5 flex-wrap"
                        onSubmit={(e) => {
                          e.preventDefault();
                          updateAlias(j.id, editAliasValue);
                        }}
                      >
                        <input
                          autoFocus
                          value={editAliasValue}
                          onChange={(e) => setEditAliasValue(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Escape" && setEditAliasId(null)
                          }
                          placeholder="Display name"
                          className="border border-ekd-gold/50 rounded-md px-2.5 py-1 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ekd-gold/40 w-44"
                        />
                        <button
                          type="submit"
                          disabled={savingAlias || !editAliasValue.trim()}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-md px-2.5 py-1 font-medium disabled:opacity-50 transition-colors"
                        >
                          {savingAlias ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditAliasId(null)}
                          className="text-xs bg-muted hover:bg-accent text-muted-foreground rounded-md px-2.5 py-1 transition-colors"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                          {j.alias}
                        </span>
                        <button
                          title="Edit display name"
                          onClick={() => {
                            setEditAliasId(j.id);
                            setEditAliasValue(j.alias);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border text-[11px] font-medium text-muted-foreground hover:border-ekd-gold/60 hover:text-ekd-gold transition-colors"
                        >
                          ✏ Edit name
                        </button>
                      </>
                    )}
                    {j.isHeadJudge && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded px-1.5 py-0.5 font-semibold">
                        HEAD
                      </span>
                    )}
                    {j.inviteEmail && !j.user.role.match(/JUDGE|ADMIN/) && (
                      <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded px-1.5 py-0.5">
                        Invited
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {j.user.name} · {j.user.email}
                    {j.inviteSentAt && (
                      <span className="ml-1 text-slate-400 dark:text-slate-500">
                        (invite sent{" "}
                        {new Date(j.inviteSentAt).toLocaleDateString()})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {j.slots.length} round slot
                      {j.slots.length !== 1 ? "s" : ""} assigned
                    </p>
                    {openRounds.length > 0 && (
                      <button
                        onClick={() =>
                          setExpandedJudgeId(
                            expandedJudgeId === j.id ? null : j.id,
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold transition-all",
                          expandedJudgeId === j.id
                            ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
                            : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-400",
                        )}
                      >
                        {expandedJudgeId === j.id ? (
                          <>▴ close</>
                        ) : (
                          <>▾ assign to rounds</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Per-round checkboxes */}
                  {expandedJudgeId === j.id && (
                    <div className="mt-2 border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">
                      {loadingRounds ? (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 px-3 py-2">
                          Loading rounds…
                        </p>
                      ) : openRounds.length === 0 ? (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 px-3 py-2">
                          No open rounds
                        </p>
                      ) : (
                        openRounds.map((r) => {
                          const existingSlot = r.judgeSlots.find(
                            (s) => s.judge?.id === j.id && s.judgeId !== null,
                          );
                          const isInRound = !!existingSlot;
                          const isToggling =
                            togglingSlot?.judgeId === j.id &&
                            togglingSlot?.roundId === r.id;
                          const label =
                            r.topic && r.topic.length > 0
                              ? `R${r.roundNum} — ${
                                  r.topic.length > 45
                                    ? r.topic.substring(0, 45) + "…"
                                    : r.topic
                                }`
                              : `Round ${r.roundNum}`;
                          return (
                            <label
                              key={r.id}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors text-[11px] border-b border-slate-100 dark:border-slate-700/50 last:border-0",
                                isInRound
                                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"
                                  : "bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                                isToggling && "opacity-60 pointer-events-none",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isInRound}
                                disabled={isToggling}
                                onChange={() =>
                                  toggleRoundSlot(
                                    j.id,
                                    r.id,
                                    isInRound,
                                    existingSlot?.id,
                                  )
                                }
                                className="w-3.5 h-3.5 accent-amber-500 shrink-0"
                              />
                              <span className="flex-1">{label}</span>
                              {isToggling && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                  …
                                </span>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col gap-1.5">
                  {j.isHeadJudge ? (
                    <button
                      onClick={() => toggleHeadJudge(j.id, false)}
                      className="text-[10px] text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 rounded px-2 py-1 transition-colors font-medium whitespace-nowrap"
                    >
                      Remove Head
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleHeadJudge(j.id, true)}
                      className="text-[10px] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-400 rounded px-2 py-1 transition-colors whitespace-nowrap"
                    >
                      Make Head Judge
                    </button>
                  )}
                  <button
                    onClick={() => removeJudge(j.id)}
                    className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 transition-colors"
                  >
                    Remove
                  </button>
                  {j.inviteEmail && (
                    <button
                      onClick={() => resendInvite(j.id)}
                      disabled={resendingInviteId === j.id}
                      className="text-[10px] text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-2 py-1 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {resendingInviteId === j.id
                        ? "Sending…"
                        : resendSuccessId === j.id
                          ? "Sent ✓"
                          : "Resend Invite"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
