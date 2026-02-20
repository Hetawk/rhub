/**
 * Zod validation schemas for debate system
 * All API inputs are validated through these schemas
 */

import { z } from "zod";
import { SCORING } from "./config";

// ---- Auth schemas ----

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifySchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().length(6, "Verification code must be 6 digits"),
});

export const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().length(6, "Reset code must be 6 digits"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128),
});

// ---- Role hierarchy ----

export const ROLE_HIERARCHY = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  JUDGE_ADMIN: 3,
  HEAD_JUDGE: 2,
  JUDGE: 1,
  USER: 0,
} as const;

export type RoleName = keyof typeof ROLE_HIERARCHY;

/** Roles that can manage events/games */
export const MANAGE_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "JUDGE_ADMIN"];

/** Roles that can score */
export const JUDGE_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "JUDGE_ADMIN",
  "HEAD_JUDGE",
  "JUDGE",
];

/**
 * Check if a role has at least the specified minimum level
 */
export function hasRole(userRole: string, minRole: RoleName): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as RoleName] ?? 0;
  const minLevel = ROLE_HIERARCHY[minRole];
  return userLevel >= minLevel;
}

/**
 * Check if user can manage events (create, edit, assign judges)
 */
export function canManage(userRole: string): boolean {
  return hasRole(userRole, "JUDGE_ADMIN");
}

/**
 * Check if user can score (is a judge+ role)
 */
export function canScore(userRole: string): boolean {
  return hasRole(userRole, "JUDGE");
}

// ---- Event schemas ----

export const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  subtitle: z.string().max(200).optional().nullable(),
  organizer: z.string().max(200).optional().nullable(),
  startDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  rules: z.string().max(10000).optional().nullable(),
  minScore: z.number().min(1).max(10).default(4),
  maxScore: z.number().min(1).max(10).default(6),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z
    .enum(["DRAFT", "REGISTRATION", "ACTIVE", "COMPLETED", "ARCHIVED"])
    .optional(),
});

// ---- Team schemas ----

export const teamMemberSchema = z.object({
  name: z.string().min(1, "Member name required").max(100),
  role: z.string().max(50).optional().nullable(),
  userId: z.string().optional().nullable(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name required").max(100),
  city: z.string().max(100).optional().nullable(),
  members: z.array(teamMemberSchema).optional(),
});

export const importTeamsSchema = z.object({
  teams: z
    .array(
      z.object({
        name: z.string().min(1),
        city: z.string().optional().nullable(),
        members: z.array(teamMemberSchema).optional(),
      }),
    )
    .min(1, "At least one team is required"),
});

// ---- Judge schemas ----

export const assignJudgeSchema = z.object({
  userId: z.string().min(1, "User ID required"),
  alias: z.string().min(1, "Judge alias required").max(50),
  isHeadJudge: z.boolean().default(false),
});

export const createJudgeByEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2).max(100),
  alias: z.string().min(1, "Judge alias required").max(50),
  isHeadJudge: z.boolean().default(false),
});

// ---- Round / Game schemas ----

const gameTypeEnum = z.enum(["TEST", "REAL"]);

export const judgeSlotInput = z.object({
  judgeId: z.string().min(1),
  position: z.number().int().min(1).max(10),
});

export const createRoundSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters").max(500),
  title: z.string().max(200).optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  startTime: z.string().datetime({ offset: true }).optional().nullable(),
  gameType: gameTypeEnum.default("REAL"),
  proTeamId: z.string().min(1, "PRO team required"),
  conTeamId: z.string().min(1, "CON team required"),
  conSpeaksFirst: z.boolean().default(false),
  judgeSlots: z.array(judgeSlotInput).optional(),
  // Timer settings
  timerEnabled: z.boolean().default(true),
  speechDurationSec: z.number().int().min(30).max(1800).default(240),
  prepTimeSec: z.number().int().min(0).max(600).default(60),
});

export const updateRoundSchema = z.object({
  topic: z.string().min(3).max(500).optional(),
  title: z.string().max(200).optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  startTime: z.string().datetime({ offset: true }).optional().nullable(),
  status: z
    .enum(["SCHEDULED", "LIVE", "SCORING", "COMPLETED", "CANCELLED"])
    .optional(),
  timerEnabled: z.boolean().optional(),
  speechDurationSec: z.number().int().min(30).max(1800).optional(),
  prepTimeSec: z.number().int().min(0).max(600).optional(),
});

// ---- Score schemas ----

const speechTypeEnum = z.enum([
  "CONSTRUCTIVE",
  "CROSS_FIRE_1",
  "REBUTTAL",
  "CROSS_FIRE_2",
  "SUMMARY",
  "GRAND_CROSS_FIRE",
  "FINAL_FOCUS",
]);

export const submitScoreSchema = z.object({
  roundTeamId: z.string().min(1, "Round team ID required"),
  speechType: speechTypeEnum,
  criteriaScores: z.record(
    z.string(),
    z.number().min(SCORING.MIN_CRITERIA).max(SCORING.MAX_CRITERIA),
  ),
  comment: z.string().max(1000).optional().nullable(),
});

// ---- Audience vote schema (head judge enters counts) ----

export const audienceVoteSchema = z.object({
  proVotes: z.number().int().min(0, "Votes cannot be negative"),
  conVotes: z.number().int().min(0, "Votes cannot be negative"),
});

// ---- Complete round (lock game) ----

export const completeRoundSchema = z.object({
  audienceProVotes: z.number().int().min(0).optional(),
  audienceConVotes: z.number().int().min(0).optional(),
  winner: z.enum(["PRO", "CON", "TIE"]).optional(),
});

// ---- Export schemas ----

export const exportFormat = z.enum(["csv", "xlsx"]);

// ---- Helper: safe parse with error formatting ----

export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.issues[0];
  return {
    success: false,
    error: firstError
      ? `${firstError.path.join(".")}: ${firstError.message}`
      : "Validation failed",
  };
}

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type ImportTeamsInput = z.infer<typeof importTeamsSchema>;
export type AssignJudgeInput = z.infer<typeof assignJudgeSchema>;
export type CreateJudgeByEmailInput = z.infer<typeof createJudgeByEmailSchema>;
export type CreateRoundInput = z.infer<typeof createRoundSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;
export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;
export type AudienceVoteInput = z.infer<typeof audienceVoteSchema>;
