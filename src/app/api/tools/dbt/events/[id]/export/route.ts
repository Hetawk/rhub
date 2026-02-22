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

type Params = { params: Promise<{ id: string }> };

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

const CRITERIA_COUNT = 5;

// Shared include shape for a round with all scoring data
const ROUND_INCLUDE = {
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
    orderBy: { position: "asc" as const },
    include: {
      judge: {
        include: { user: { select: { name: true } } },
      },
    },
  },
} as const;

function buildRoundResult(
  round: Awaited<ReturnType<typeof prisma.debateRound.findUnique>> & {
    roundTeams: {
      side: string;
      team: { name: string };
      scores: {
        slotId: string;
        totalScore: number | null;
        speechType: string;
        lockedAt: Date | null;
        criteria: { criteriaKey: string; score: number }[];
      }[];
    }[];
    judgeSlots: {
      id: string;
      position: number;
      judge: { alias: string };
    }[];
  },
  eventTitle: string,
) {
  const proRt = round!.roundTeams.find((rt) => rt.side === "PRO");
  const conRt = round!.roundTeams.find((rt) => rt.side === "CON");

  const judgeResults = round!.judgeSlots.map((slot) => {
    const proScores = proRt?.scores.filter((s) => s.slotId === slot.id) ?? [];
    const conScores = conRt?.scores.filter((s) => s.slotId === slot.id) ?? [];

    const proTotal = proScores.reduce((sum, s) => sum + (s.totalScore ?? 0), 0);
    const conTotal = conScores.reduce((sum, s) => sum + (s.totalScore ?? 0), 0);

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

  return {
    event: eventTitle,
    round: round!.title ?? `Round ${round!.roundNum}`,
    roundNum: round!.roundNum,
    topic: round!.topic,
    gameType: round!.gameType,
    status: round!.status,
    completedAt: round!.completedAt,
    proposition: proRt?.team?.name ?? "—",
    opposition: conRt?.team?.name ?? "—",
    audienceVotes: {
      pro: round!.audienceProVotes,
      con: round!.audienceConVotes,
    },
    decision,
    judges: judgeResults,
  };
}

function buildCsvForResult(
  result: ReturnType<typeof buildRoundResult>,
  includeRoundHeader = true,
): string[] {
  const rows: string[] = [];

  if (includeRoundHeader) {
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
  }

  // Scores table header
  rows.push(
    toCsvRow([
      "Judge",
      "Position",
      "Side",
      "Speech Type",
      "Crit 1",
      "Crit 2",
      "Crit 3",
      "Crit 4",
      "Crit 5",
      "Total",
      "Locked At",
    ]),
  );

  for (const judge of result.judges) {
    for (const score of judge.scores) {
      const speechCriteria =
        SPEECH_CRITERIA[score.speechType as SpeechTypeKey] ?? [];
      rows.push(
        toCsvRow([
          judge.judgeName,
          judge.judgePosition,
          score.side,
          score.speechType,
          ...speechCriteria.map((c) => score.criteria[c.key] ?? ""),
          score.total,
          score.lockedAt ? new Date(score.lockedAt).toISOString() : "Unlocked",
        ]),
      );
    }
    rows.push(
      toCsvRow([
        judge.judgeName,
        judge.judgePosition,
        "PRO TOTAL",
        "",
        ...Array(CRITERIA_COUNT).fill(""),
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
        ...Array(CRITERIA_COUNT).fill(""),
        judge.oppositionTotal,
        "",
      ]),
    );
    rows.push("");
  }

  return rows;
}

// GET — Export all rounds for an event as CSV or JSON
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

    const { id: eventSlug } = await params;
    const format = req.nextUrl.searchParams.get("format") || "json";

    const event = await prisma.debateEvent.findFirst({
      where: { OR: [{ id: eventSlug }, { slug: eventSlug }] },
      include: {
        rounds: {
          orderBy: { roundNum: "asc" },
          include: ROUND_INCLUDE,
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const results = event.rounds.map((r) =>
      buildRoundResult(
        r as Parameters<typeof buildRoundResult>[0],
        event.title,
      ),
    );

    if (format === "csv") {
      const rows: string[] = [];

      // Event header
      rows.push(toCsvRow(["Event", event.title]));
      if (event.subtitle) rows.push(toCsvRow(["Subtitle", event.subtitle]));
      rows.push(toCsvRow(["Total Rounds", event.rounds.length]));
      rows.push("");

      // Criteria reference table (once, at top)
      rows.push(
        toCsvRow([
          "CRITERIA REFERENCE",
          "Speech Type",
          "Crit 1",
          "Crit 2",
          "Crit 3",
          "Crit 4",
          "Crit 5",
        ]),
      );
      for (const st of SPEECH_TYPES) {
        const stCriteria = SPEECH_CRITERIA[st.key as SpeechTypeKey] ?? [];
        rows.push(toCsvRow(["", st.key, ...stCriteria.map((c) => c.label)]));
      }
      rows.push("");

      // Each round as a section
      for (const result of results) {
        rows.push(
          toCsvRow([
            "════════════════",
            `ROUND ${result.roundNum}: ${result.round}`,
            "════════════════",
          ]),
        );
        rows.push(...buildCsvForResult(result, true));
        rows.push("");
      }

      const csv = rows.join("\n");
      const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}_ALL_ROUNDS_export.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON response
    return NextResponse.json({
      event: event.title,
      subtitle: event.subtitle,
      totalRounds: event.rounds.length,
      rounds: results,
    });
  } catch (error) {
    console.error("Event export error:", error);
    return NextResponse.json(
      { error: "Failed to export event results" },
      { status: 500 },
    );
  }
}
