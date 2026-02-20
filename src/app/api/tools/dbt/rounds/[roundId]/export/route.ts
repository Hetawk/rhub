import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { hasRole } from "@/lib/dbt/schemas";
import {
  SPEECH_CRITERIA,
  SPEECH_TYPES,
  type SpeechTypeKey,
} from "@/lib/dbt/config";
import {
  calcSpeechTotal,
  determineWinner,
  calcFinalDecision,
} from "@/lib/dbt/utils";
import { cookies } from "next/headers";

type Params = { params: Promise<{ roundId: string }> };

function escapeCsv(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsv).join(",");
}

// GET — Export round results as CSV or JSON
// ?format=csv|json (default: json)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await validateSession(token);
    if (!user || !hasRole(user.role, "JUDGE_ADMIN")) {
      return NextResponse.json(
        { error: "Only judge admin or above can export results" },
        { status: 403 },
      );
    }

    const { roundId } = await params;
    const format = req.nextUrl.searchParams.get("format") || "json";

    const round = await prisma.debateRound.findUnique({
      where: { id: roundId },
      include: {
        event: { select: { title: true } },
        roundTeams: {
          include: {
            team: true,
            scores: {
              include: {
                criteria: true,
                slot: {
                  include: {
                    judge: {
                      include: { user: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
        judgeSlots: {
          orderBy: { position: "asc" },
          include: {
            judge: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const proRt = round.roundTeams.find((rt) => rt.side === "PRO");
    const conRt = round.roundTeams.find((rt) => rt.side === "CON");

    // Build per-judge results
    const judgeResults = round.judgeSlots.map((slot) => {
      const proScores = proRt?.scores.filter((s) => s.slotId === slot.id) ?? [];
      const conScores = conRt?.scores.filter((s) => s.slotId === slot.id) ?? [];

      const proTotal = proScores.reduce(
        (sum, s) => sum + (s.totalScore ?? 0),
        0,
      );
      const conTotal = conScores.reduce(
        (sum, s) => sum + (s.totalScore ?? 0),
        0,
      );

      const allScores = [
        ...proScores.map((s) => ({ ...s, side: "PRO" as const })),
        ...conScores.map((s) => ({ ...s, side: "CON" as const })),
      ];

      return {
        judgeName: slot.judge.alias,
        judgePosition: slot.position,
        propositionTotal: proTotal,
        oppositionTotal: conTotal,
        winner: determineWinner(proTotal, conTotal),
        scores: allScores.map((s) => {
          const criteriaMap: Record<string, number> = {};
          s.criteria.forEach((c) => {
            criteriaMap[c.criteriaKey] = c.score;
          });
          return {
            side: s.side,
            speechType: s.speechType,
            criteria: criteriaMap,
            total: s.totalScore ?? calcSpeechTotal(criteriaMap),
            lockedAt: s.lockedAt,
          };
        }),
      };
    });

    const decision = calcFinalDecision(
      judgeResults.map((j) => ({
        proTotal: j.propositionTotal,
        conTotal: j.oppositionTotal,
      })),
    );

    const result = {
      event: round.event.title,
      round: round.title ?? `Round ${round.roundNum}`,
      topic: round.topic,
      gameType: round.gameType,
      status: round.status,
      completedAt: round.completedAt,
      proposition: proRt?.team?.name ?? "—",
      opposition: conRt?.team?.name ?? "—",
      audienceVotes: {
        pro: round.audienceProVotes,
        con: round.audienceConVotes,
      },
      decision,
      judges: judgeResults,
    };

    if (format === "csv") {
      const rows: string[] = [];

      rows.push(toCsvRow(["Event", result.event]));
      rows.push(toCsvRow(["Round", result.round]));
      rows.push(toCsvRow(["Topic", result.topic]));
      rows.push(toCsvRow(["Game Type", result.gameType]));
      rows.push(toCsvRow(["Status", result.status]));
      rows.push(
        toCsvRow([
          "Completed At",
          result.completedAt
            ? new Date(result.completedAt).toISOString()
            : "Not completed",
        ]),
      );
      rows.push(toCsvRow(["Proposition", result.proposition]));
      rows.push(toCsvRow(["Opposition", result.opposition]));
      rows.push(
        toCsvRow([
          "Audience Votes",
          `Pro: ${result.audienceVotes.pro}`,
          `Con: ${result.audienceVotes.con}`,
        ]),
      );
      rows.push(
        toCsvRow([
          "Final Decision",
          result.decision.winner,
          `${result.decision.proWins}-${result.decision.conWins} judge votes`,
        ]),
      );
      rows.push("");

      // Build criteria columns from the first speech type
      const firstSpeechType = SPEECH_TYPES[0]?.key as SpeechTypeKey;
      const criteriaNames =
        SPEECH_CRITERIA[firstSpeechType]?.map((c) => c.key) ?? [];
      const criteriaLabels =
        SPEECH_CRITERIA[firstSpeechType]?.map((c) => c.label) ?? [];

      rows.push(
        toCsvRow([
          "Judge",
          "Position",
          "Side",
          "Speech Type",
          ...criteriaLabels,
          "Total",
          "Locked At",
        ]),
      );

      for (const judge of judgeResults) {
        for (const score of judge.scores) {
          rows.push(
            toCsvRow([
              judge.judgeName,
              judge.judgePosition,
              score.side,
              score.speechType,
              ...criteriaNames.map((c) => score.criteria[c] ?? ""),
              score.total,
              score.lockedAt
                ? new Date(score.lockedAt).toISOString()
                : "Unlocked",
            ]),
          );
        }
        rows.push(
          toCsvRow([
            judge.judgeName,
            judge.judgePosition,
            "PRO TOTAL",
            "",
            ...criteriaNames.map(() => ""),
            judge.propositionTotal,
            "",
          ]),
        );
        rows.push(
          toCsvRow([
            judge.judgeName,
            judge.judgePosition,
            "CON TOTAL",
            "",
            ...criteriaNames.map(() => ""),
            judge.oppositionTotal,
            "",
          ]),
        );
        rows.push("");
      }

      const csv = rows.join("\n");
      const filename = `${result.event.replace(/[^a-zA-Z0-9]/g, "_")}_${result.round.replace(/[^a-zA-Z0-9]/g, "_")}_results.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export results" },
      { status: 500 },
    );
  }
}
