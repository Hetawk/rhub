/**
 * POST /api/tools/dbt/events/import
 * Imports historical debate results from JSON (or a structured CSV via JSON wrapper).
 *
 * Expected JSON body shape:
 * {
 *   event: {
 *     title, subtitle?, organizer?, startDate?, endDate?, location?,
 *     description?, rules?, minScore?, maxScore?
 *   },
 *   rounds: Array<{
 *     title, topic, roundNum?, gameType?,
 *     proTeam: { name },
 *     conTeam: { name },
 *     winner?: "PRO" | "CON" | "TIE",
 *     judges: Array<{
 *       alias,
 *       proScore: number,
 *       conScore: number
 *     }>,
 *     notes?: string
 *   }>
 * }
 *
 * Requires: JUDGE_ADMIN+
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { canManage } from "@/lib/dbt/schemas";
import { cookies } from "next/headers";
import { z } from "zod";

// ---------- validation schemas ----------
const importJudgeSchema = z.object({
  alias: z.string().min(1).max(80),
  proScore: z.number().min(0),
  conScore: z.number().min(0),
});

const importRoundSchema = z.object({
  title: z.string().min(1).max(200),
  topic: z.string().min(1).max(500),
  roundNum: z.number().int().min(1).optional(),
  gameType: z.enum(["REAL", "TEST"]).default("REAL"),
  proTeam: z.object({ name: z.string().min(1).max(200) }),
  conTeam: z.object({ name: z.string().min(1).max(200) }),
  winner: z.enum(["PRO", "CON", "TIE"]).optional(),
  judges: z.array(importJudgeSchema).min(1).max(20),
  notes: z.string().max(2000).optional(),
});

const importEventSchema = z.object({
  event: z.object({
    title: z.string().min(1).max(300),
    subtitle: z.string().max(300).optional(),
    organizer: z.string().max(200).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    location: z.string().max(200).optional(),
    description: z.string().max(3000).optional(),
    rules: z.string().max(3000).optional(),
    minScore: z.number().min(0).default(0),
    maxScore: z.number().min(1).default(100),
  }),
  rounds: z.array(importRoundSchema).min(1).max(100),
});

// ---------- handler ----------
export async function POST(req: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await validateSession(token);
    if (!user || !canManage(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Parse + validate
    const body = await req.json();
    const parsed = importEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { event: evData, rounds: roundsData } = parsed.data;

    // Generate unique slug
    const base = evData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const slug = `${base}-import-${Date.now().toString(36)}`;

    // Run the entire import in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create event (status COMPLETED = archived import)
      const newEvent = await tx.debateEvent.create({
        data: {
          slug,
          title: evData.title,
          subtitle: evData.subtitle,
          organizer: evData.organizer,
          startDate: evData.startDate ? new Date(evData.startDate) : new Date(),
          endDate: evData.endDate ? new Date(evData.endDate) : null,
          location: evData.location,
          description: evData.description || `[Imported historical results]`,
          rules: evData.rules,
          minScore: evData.minScore,
          maxScore: evData.maxScore,
          status: "COMPLETED",
          createdBy: user.id,
        },
      });

      const createdRounds: {
        id: string;
        roundNum: number;
        title: string;
        winner: string;
      }[] = [];

      for (let ri = 0; ri < roundsData.length; ri++) {
        const rd = roundsData[ri];
        const roundNum = rd.roundNum ?? ri + 1;

        // 2. Create teams (no compound unique in schema — check first)
        let proTeamRecord = await tx.debateTeam.findFirst({
          where: { eventId: newEvent.id, name: rd.proTeam.name },
        });
        if (!proTeamRecord) {
          proTeamRecord = await tx.debateTeam.create({
            data: { eventId: newEvent.id, name: rd.proTeam.name },
          });
        }

        let conTeamRecord = await tx.debateTeam.findFirst({
          where: { eventId: newEvent.id, name: rd.conTeam.name },
        });
        if (!conTeamRecord) {
          conTeamRecord = await tx.debateTeam.create({
            data: { eventId: newEvent.id, name: rd.conTeam.name },
          });
        }

        // 3. Create round (note: no `notes` or `winner` field on DebateRound —
        //    the winner is derived from SpeechScores; notes go in description)
        const round = await tx.debateRound.create({
          data: {
            eventId: newEvent.id,
            title: rd.title,
            topic: rd.topic,
            roundNum,
            gameType: rd.gameType,
            status: "COMPLETED",
            completedAt: new Date(),
            completedBy: user.id,
          },
        });

        // 4. Create DebateRoundTeam entries (model: DebateRoundTeam)
        const proRoundTeam = await tx.debateRoundTeam.create({
          data: { roundId: round.id, teamId: proTeamRecord.id, side: "PRO" },
        });
        const conRoundTeam = await tx.debateRoundTeam.create({
          data: { roundId: round.id, teamId: conTeamRecord.id, side: "CON" },
        });

        // 5. Create judges + judge slots + synthetic scores
        //    DebateJudge.userId is required. For imported judges we create/find a
        //    stub user (role=AUDIENCE, email=<sanitised-alias>@imported.rhub.local).
        for (let ji = 0; ji < rd.judges.length; ji++) {
          const jd = rd.judges[ji];

          // Stub user for imported judge
          const importEmail = `imported.judge.${jd.alias
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .slice(0, 40)}@imported.rhub.local`;

          let stubUser = await tx.user.findFirst({
            where: { email: importEmail },
          });
          if (!stubUser) {
            stubUser = await tx.user.create({
              data: {
                email: importEmail,
                name: jd.alias,
                role: "AUDIENCE",
                emailVerified: false,
                isActive: false, // stub — not a real account
              },
            });
          }

          // Upsert DebateJudge by eventId + userId
          let judge = await tx.debateJudge.findFirst({
            where: { eventId: newEvent.id, userId: stubUser.id },
          });
          if (!judge) {
            judge = await tx.debateJudge.create({
              data: {
                eventId: newEvent.id,
                userId: stubUser.id,
                alias: jd.alias,
              },
            });
          }

          // Judge slot for this round
          const slot = await tx.judgeSlot.create({
            data: { roundId: round.id, judgeId: judge.id, position: ji + 1 },
          });

          // Use CONSTRUCTIVE as the proxy speech type for the aggregated imported score.
          // One score record per team per judge captures the total.
          await tx.speechScore.createMany({
            data: [
              {
                roundTeamId: proRoundTeam.id,
                slotId: slot.id,
                speechType: "CONSTRUCTIVE",
                totalScore: jd.proScore,
                isLocked: true,
              },
              {
                roundTeamId: conRoundTeam.id,
                slotId: slot.id,
                speechType: "CONSTRUCTIVE",
                totalScore: jd.conScore,
                isLocked: true,
              },
            ],
          });
        }

        // Derive winner from aggregate judge scores
        const proAgg = rd.judges.reduce((s, j) => s + j.proScore, 0);
        const conAgg = rd.judges.reduce((s, j) => s + j.conScore, 0);
        const derivedWinner =
          rd.winner ??
          (proAgg > conAgg ? "PRO" : conAgg > proAgg ? "CON" : "TIE");

        createdRounds.push({
          id: round.id,
          roundNum,
          title: rd.title,
          winner: derivedWinner,
        });
      }

      return {
        eventId: newEvent.id,
        slug: newEvent.slug,
        rounds: createdRounds,
      };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
