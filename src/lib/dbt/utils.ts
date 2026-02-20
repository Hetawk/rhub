/**
 * Debate scoring utility functions
 */

import { SCORING, SPEECH_CRITERIA, type SpeechTypeKey } from "./config";

/**
 * Validate a criteria score is within bounds
 */
export function isValidCriteriaScore(score: number): boolean {
  return score >= SCORING.MIN_CRITERIA && score <= SCORING.MAX_CRITERIA;
}

/**
 * Calculate total score for a speech from criteria scores
 */
export function calcSpeechTotal(
  criteriaScores: Record<string, number>,
): number {
  return Object.values(criteriaScores).reduce((sum, s) => sum + s, 0);
}

/**
 * Check if all criteria are filled for a speech
 */
export function isSpeechComplete(
  speechType: SpeechTypeKey,
  criteriaScores: Record<string, number>,
): boolean {
  const defs = SPEECH_CRITERIA[speechType];
  return defs.every(
    (c) =>
      criteriaScores[c.key] !== undefined &&
      isValidCriteriaScore(criteriaScores[c.key]),
  );
}

/**
 * Calculate judge total for one side across all speeches
 */
export function calcJudgeSideTotal(
  speechScores: { speechType: SpeechTypeKey; total: number }[],
): number {
  return speechScores.reduce((sum, s) => sum + s.total, 0);
}

/**
 * Determine winner from judge totals
 */
export function determineWinner(
  proTotal: number,
  conTotal: number,
): "PRO" | "CON" | "TIE" {
  if (proTotal > conTotal) return "PRO";
  if (conTotal > proTotal) return "CON";
  return "TIE";
}

/**
 * Calculate final decision from multiple judges
 * Each judge votes for a side; majority wins
 */
export function calcFinalDecision(
  judgeTotals: { proTotal: number; conTotal: number }[],
): {
  proWins: number;
  conWins: number;
  winner: "PRO" | "CON" | "TIE";
  proGrandTotal: number;
  conGrandTotal: number;
} {
  let proWins = 0;
  let conWins = 0;
  let proGrandTotal = 0;
  let conGrandTotal = 0;

  for (const jt of judgeTotals) {
    proGrandTotal += jt.proTotal;
    conGrandTotal += jt.conTotal;
    const w = determineWinner(jt.proTotal, jt.conTotal);
    if (w === "PRO") proWins++;
    else if (w === "CON") conWins++;
  }

  return {
    proWins,
    conWins,
    winner: proWins > conWins ? "PRO" : conWins > proWins ? "CON" : "TIE",
    proGrandTotal,
    conGrandTotal,
  };
}

/**
 * Generate 6-digit OTP token
 */
export function genOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Format score for display (e.g., 4.5 → "4.5", 5 → "5")
 */
export function fmtScore(score: number): string {
  return Number.isInteger(score) ? score.toString() : score.toFixed(1);
}
