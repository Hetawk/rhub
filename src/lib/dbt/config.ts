/**
 * Debate system configuration
 * Defines speech types, criteria, scoring rules
 */

// ---- Speech types (7 components) ----

export const SPEECH_TYPES = [
  {
    key: "CONSTRUCTIVE",
    label: "1st Speaker (Constructive Speech)",
    shortLabel: "1st Speaker",
    speechType: "Constructive Speech",
    durationMins: 5,
    order: 1,
    speaker: "1st",
  },
  {
    key: "CROSS_FIRE_1",
    label: "1st Speaker (Cross Fire)",
    shortLabel: "1st Cross-Fire",
    speechType: "Cross-Examination",
    durationMins: 6,
    order: 2,
    speaker: "1st",
  },
  {
    key: "REBUTTAL",
    label: "2nd Speaker (Rebuttal Speech)",
    shortLabel: "2nd Speaker",
    speechType: "Rebuttal Speech",
    durationMins: 5,
    order: 3,
    speaker: "2nd",
  },
  {
    key: "CROSS_FIRE_2",
    label: "2nd Speaker (Cross Fire)",
    shortLabel: "2nd Cross-Fire",
    speechType: "Cross-Examination",
    durationMins: 6,
    order: 4,
    speaker: "2nd",
  },
  {
    key: "SUMMARY",
    label: "1st Speaker (Summary Speech)",
    shortLabel: "Summary",
    speechType: "Summary Speech",
    durationMins: 5,
    order: 5,
    speaker: "1st",
  },
  {
    key: "GRAND_CROSS_FIRE",
    label: "Grand Cross Fire",
    shortLabel: "Grand Cross",
    speechType: "Grand Cross-Examination",
    durationMins: 8,
    order: 6,
    speaker: "both",
  },
  {
    key: "FINAL_FOCUS",
    label: "2nd Speaker (Final Focus Speech)",
    shortLabel: "Final Focus",
    speechType: "Final Focus Speech",
    durationMins: 5,
    order: 7,
    speaker: "2nd",
  },
] as const;

export type SpeechTypeKey = (typeof SPEECH_TYPES)[number]["key"];

// ---- Criteria per speech type ----

export interface CriteriaDef {
  key: string;
  label: string;
}

export const SPEECH_CRITERIA: Record<SpeechTypeKey, CriteriaDef[]> = {
  CONSTRUCTIVE: [
    { key: "clarity_of_position", label: "Clarity of Position" },
    { key: "argument_structure", label: "Argument Structure" },
    { key: "relevance_of_motion", label: "Relevance of Motion" },
    { key: "organization_flow", label: "Organization & Flow" },
    { key: "delivery_time_control", label: "Delivery & Time Control" },
  ],
  CROSS_FIRE_1: [
    { key: "quality_of_questions", label: "Quality of Questions" },
    { key: "responsiveness", label: "Responsiveness" },
    { key: "control_decorum", label: "Control & Decorum" },
    { key: "listening_skills", label: "Listening Skills" },
    { key: "strategic_use_of_time", label: "Strategic Use of Time" },
  ],
  REBUTTAL: [
    { key: "direct_clash", label: "Direct Clash" },
    {
      key: "effectiveness_of_refutation",
      label: "Effectiveness of Refutation",
    },
    { key: "prioritization", label: "Prioritization" },
    { key: "defense_of_own_case", label: "Defense of Own Case" },
    { key: "comparative_analysis", label: "Comparative Analysis" },
  ],
  CROSS_FIRE_2: [
    { key: "quality_of_questions", label: "Quality of Questions" },
    { key: "responsiveness", label: "Responsiveness" },
    { key: "control_decorum", label: "Control & Decorum" },
    { key: "listening_skills", label: "Listening Skills" },
    { key: "strategic_use_of_time", label: "Strategic Use of Time" },
  ],
  SUMMARY: [
    { key: "issue_selection", label: "Issue Selection" },
    { key: "crystallization", label: "Crystallization" },
    { key: "consistency", label: "Consistency" },
    { key: "impact_framing", label: "Impact Framing" },
    { key: "balance", label: "Balance" },
  ],
  GRAND_CROSS_FIRE: [
    { key: "questioning_strategy", label: "Questioning Strategy" },
    { key: "responsiveness_defense", label: "Responsiveness & Defense" },
    { key: "control_floor_mgmt", label: "Control & Floor Management" },
    { key: "listening_adaptation", label: "Listening & Adaptation" },
    { key: "professionalism_decorum", label: "Professionalism & Decorum" },
  ],
  FINAL_FOCUS: [
    { key: "issue_selection", label: "Issue Selection" },
    { key: "crystallization", label: "Crystallization" },
    { key: "consistency", label: "Consistency" },
    { key: "impact_framing", label: "Impact Framing" },
    { key: "balance", label: "Balance" },
  ],
};

// ---- Scoring rules ----

export const SCORING = {
  /** Min score per criteria */
  MIN_CRITERIA: 4,
  /** Max score per criteria */
  MAX_CRITERIA: 6,
  /** Number of criteria per speech */
  CRITERIA_COUNT: 5,
  /** Min total per speech (5 * 4) */
  MIN_SPEECH: 20,
  /** Max total per speech (5 * 6) */
  MAX_SPEECH: 30,
  /** Number of speech types */
  SPEECH_COUNT: 7,
  /** Min total per judge per side (7 * 20) */
  MIN_JUDGE_TOTAL: 140,
  /** Max total per judge per side (7 * 30) */
  MAX_JUDGE_TOTAL: 210,
  /** Seconds before score auto-locks */
  LOCK_DELAY_SECONDS: 30,
} as const;

// ---- Side labels ----

export const SIDE_LABELS = {
  PRO: "Pros",
  CON: "Cons",
} as const;

export const SIDE_COLORS = {
  PRO: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800/60",
    accent: "#059669",
  },
  CON: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800/60",
    accent: "#dc2626",
  },
} as const;
