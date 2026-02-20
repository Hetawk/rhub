/**
 * Role display metadata — single source of truth for the entire app.
 *
 * Safe to import from both server and client components (no Prisma/Node deps).
 * The role keys are derived from ROLE_HIERARCHY in schemas.ts, so TypeScript
 * will error here if a role is added to the hierarchy but not given metadata.
 */

import { ROLE_HIERARCHY, type RoleName } from "@/lib/dbt/schemas";

export type { RoleName };

export type RoleMeta = {
  /** Human-readable label, e.g. "Judge Admin" */
  label: string;
  /** Tailwind text-color class for inline text */
  color: string;
  /** Tailwind classes for a small badge/pill component */
  badge: string;
  /** Numeric level (mirrors ROLE_HIERARCHY) */
  level: number;
};

/**
 * Complete display metadata for every UserRole value.
 * Typed as `Record<RoleName, …>` so TypeScript enforces exhaustiveness —
 * missing or misspelled keys are compile errors.
 */
export const ROLE_META: Record<RoleName, RoleMeta> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    color: "text-purple-600",
    badge:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    level: ROLE_HIERARCHY.SUPER_ADMIN,
  },
  ADMIN: {
    label: "Admin",
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    level: ROLE_HIERARCHY.ADMIN,
  },
  JUDGE_ADMIN: {
    label: "Judge Admin",
    color: "text-indigo-600",
    badge:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    level: ROLE_HIERARCHY.JUDGE_ADMIN,
  },
  HEAD_JUDGE: {
    label: "Head Judge",
    color: "text-amber-600",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    level: ROLE_HIERARCHY.HEAD_JUDGE,
  },
  JUDGE: {
    label: "Judge",
    color: "text-emerald-600",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    level: ROLE_HIERARCHY.JUDGE,
  },
  AUDIENCE: {
    label: "Audience",
    color: "text-slate-500",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    level: ROLE_HIERARCHY.AUDIENCE,
  },
};

/**
 * Get display metadata for a role string.
 * Falls back gracefully to AUDIENCE if the role is unknown/undefined.
 */
export function getRoleMeta(role: string | null | undefined): RoleMeta {
  if (!role) return ROLE_META.AUDIENCE;
  return ROLE_META[role as RoleName] ?? ROLE_META.AUDIENCE;
}

/**
 * Ordered array of roles from highest to lowest level,
 * useful for <select> dropdowns and admin UIs.
 */
export const ROLES_ORDERED: RoleName[] = (
  Object.entries(ROLE_HIERARCHY) as [RoleName, number][]
)
  .sort(([, a], [, b]) => b - a)
  .map(([role]) => role);

// Re-export the core helpers so callers need only one import
export {
  ROLE_HIERARCHY,
  hasRole,
  canManage,
  canScore,
} from "@/lib/dbt/schemas";
