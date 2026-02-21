"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  UserCog,
  Search,
  UserPlus,
  RefreshCw,
  Check,
  X,
  ChevronLeft,
  Eye,
  EyeOff,
  Trash2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleMeta } from "@/lib/roles";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RoleChangeBanner } from "@/components/role-change-banner";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface AdminUser {
  id: string;
  name: string;
  role: string;
  roleChangedAt?: string | null;
  sessionCreatedAt?: string;
}

const ALL_ROLES = [
  { value: "USER", label: "User" },
  { value: "JUDGE", label: "Judge" },
  { value: "HEAD_JUDGE", label: "Head Judge" },
  { value: "JUDGE_ADMIN", label: "Judge Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

function UsersContent() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("USER");
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Inline editing
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ id: string; ok: boolean } | null>(
    null,
  );

  const isSuperAdmin = adminUser?.role === "SUPER_ADMIN";

  const fetchUsers = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setTableLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.id || !["SUPER_ADMIN", "ADMIN"].includes(data.role)) {
          router.replace(
            data.id ? "/dashboard" : "/login?redirect=/admin/users",
          );
          return;
        }
        setAdminUser({ id: data.id, name: data.name, role: data.role });
        setLoading(false);
      })
      .catch(() => router.replace("/login?redirect=/admin/users"));
  }, [router]);

  useEffect(() => {
    if (!loading) fetchUsers();
  }, [loading, fetchUsers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (!loading) fetchUsers();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          role: createRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create user");
        return;
      }
      setShowCreate(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("USER");
      fetchUsers();
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: data.user.role } : u,
          ),
        );
        setFeedback({ id: userId, ok: true });
      } else {
        setFeedback({ id: userId, ok: false });
        alert(data.error || "Failed to update role.");
      }
    } catch {
      setFeedback({ id: userId, ok: false });
    } finally {
      setSavingId(null);
      setEditingRole(null);
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const handleToggleActive = async (userId: string, current: boolean) => {
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isActive: data.user.isActive } : u,
          ),
        );
      }
    } catch {
      // ignore
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotal((t) => t - 1);
        setFeedback({ id: userId, ok: true });
        setTimeout(() => setFeedback(null), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete user.");
        setFeedback({ id: userId, ok: false });
        setTimeout(() => setFeedback(null), 2000);
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading || !adminUser) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
      </div>
    );
  }

  return (
    <AppShell
      user={{ id: adminUser.id, name: adminUser.name, role: adminUser.role }}
    >
      <div className="max-w-6xl space-y-6 py-2">
        <RoleChangeBanner
          roleChangedAt={adminUser.roleChangedAt ?? null}
          sessionCreatedAt={adminUser.sessionCreatedAt ?? null}
        />
        {/* Header */}
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Admin Panel
          </Link>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-ekd-gold" />
              <h1 className="text-2xl font-bold text-foreground">
                User Management
              </h1>
              <span className="ml-2 text-xs font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {total} users
              </span>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-ekd-gold hover:bg-ekd-light-gold text-ekd-dark-brown font-semibold px-4 py-2 text-sm transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              New User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className={cn(
                "w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
              )}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={cn(
              "rounded-xl border border-border bg-background px-3 py-2 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
            )}
          >
            <option value="">All Roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchUsers}
            disabled={tableLoading}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw
              className={cn("h-4 w-4", tableLoading && "animate-spin")}
            />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {tableLoading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      User
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Joined
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => {
                    const roleMeta = getRoleMeta(u.role);
                    const isMe = u.id === adminUser?.id;
                    const canEdit =
                      isSuperAdmin ||
                      (u.role !== "SUPER_ADMIN" && u.role !== "ADMIN");
                    const saving = savingId === u.id;
                    const fb = feedback?.id === u.id;

                    return (
                      <tr
                        key={u.id}
                        className={cn(
                          "hover:bg-muted/20 transition-colors",
                          !u.isActive && "opacity-60",
                        )}
                      >
                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ekd-gold to-ekd-maroon text-white text-xs font-bold shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[180px]">
                                {u.name}
                                {isMe && (
                                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                                    (you)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role — inline select */}
                        <td className="px-4 py-3">
                          {editingRole === u.id && canEdit ? (
                            <select
                              autoFocus
                              defaultValue={u.role}
                              onChange={(e) =>
                                handleUpdateRole(u.id, e.target.value)
                              }
                              onBlur={() => setEditingRole(null)}
                              disabled={saving}
                              className="rounded-lg border border-ekd-gold bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ekd-gold/30"
                            >
                              {ALL_ROLES.filter((r) =>
                                isSuperAdmin
                                  ? true
                                  : r.value !== "SUPER_ADMIN" &&
                                    r.value !== "ADMIN",
                              ).map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => canEdit && setEditingRole(u.id)}
                              disabled={!canEdit || saving}
                              className={cn(
                                "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full",
                                roleMeta.badge,
                                canEdit &&
                                  "cursor-pointer hover:opacity-80 transition-opacity",
                              )}
                              title={
                                canEdit ? "Click to change role" : undefined
                              }
                            >
                              {saving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : fb ? (
                                feedback?.ok ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )
                              ) : null}
                              {roleMeta.label}
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                                u.isActive
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                              )}
                            >
                              {u.isActive ? "Active" : "Disabled"}
                            </span>
                            {!u.emailVerified && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                Unverified
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            {/* Toggle active */}
                            {canEdit && !isMe && (
                              <button
                                onClick={() =>
                                  handleToggleActive(u.id, u.isActive)
                                }
                                disabled={saving}
                                title={
                                  u.isActive
                                    ? "Disable account"
                                    : "Enable account"
                                }
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              >
                                {u.isActive ? (
                                  <ShieldOff className="h-3.5 w-3.5" />
                                ) : (
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            {/* Delete — SUPER_ADMIN only */}
                            {isSuperAdmin && !isMe && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                disabled={saving}
                                title="Delete user"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create User modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-foreground">Create New User</h2>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setCreateError("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {createError && (
                  <p className="text-sm text-red-500 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2">
                    {createError}
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    minLength={2}
                    placeholder="John Doe"
                    className={cn(
                      "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                    className={cn(
                      "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePwd ? "text" : "password"}
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className={cn(
                        "w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-11 text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePwd(!showCreatePwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      tabIndex={-1}
                    >
                      {showCreatePwd ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Role
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className={cn(
                      "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-ekd-gold/30 focus:border-ekd-gold",
                    )}
                  >
                    {ALL_ROLES.filter((r) =>
                      isSuperAdmin
                        ? true
                        : r.value !== "SUPER_ADMIN" && r.value !== "ADMIN",
                    ).map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-ekd-gold hover:bg-ekd-light-gold text-ekd-dark-brown font-semibold py-2.5 text-sm transition-colors disabled:opacity-50"
                  >
                    {createLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {createLoading ? "Creating…" : "Create User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setCreateError("");
                    }}
                    className="px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-ekd-gold" />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}
