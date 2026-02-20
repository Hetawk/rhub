import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";
import sharp from "sharp";

type Params = { params: Promise<{ id: string }> };

type LogosOption = "both" | "aec" | "lsuic" | "none" | "custom";

/**
 * GET /api/tools/dbt/events/[id]/results-image
 * Generates a beautiful PNG results card for a debate event/round.
 *
 * Query params:
 *   round      — specific roundId (optional; defaults to last completed/all)
 *   logos      — "both" | "aec" | "lsuic" | "none" | "custom"  (default: "both")
 *   logoUrl    — custom logo URL (when logos=custom)
 *   logoCount  — "1" | "2"  (how many custom logos; default "1")
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get("round");
    const logosOpt = (searchParams.get("logos") || "both") as LogosOption;
    const customLogoUrl = searchParams.get("logoUrl");

    // ---- Load event data ----
    const event = await prisma.debateEvent.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        rounds: {
          where: roundId ? { id: roundId } : undefined,
          orderBy: { roundNum: "asc" },
          include: {
            roundTeams: {
              include: {
                team: true,
                scores: {
                  include: {
                    criteria: true,
                    slot: { include: { judge: true } },
                  },
                },
              },
            },
            judgeSlots: {
              orderBy: { position: "asc" },
              include: {
                judge: {
                  include: { user: { select: { id: true, name: true } } },
                },
                scores: { include: { roundTeam: { include: { team: true } } } },
              },
            },
          },
        },
      },
    });

    if (!event)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (!event.rounds.length)
      return NextResponse.json({ error: "No rounds found" }, { status: 404 });

    // ---- Build results per round ----
    type RoundResult = {
      roundTitle: string;
      topic: string;
      proTeam: string;
      conTeam: string;
      judgeResults: {
        alias: string;
        proTotal: number;
        conTotal: number;
        winner: "PRO" | "CON" | "TIE";
      }[];
      overallWinner: "PRO" | "CON" | "TIE";
      proTotalAll: number;
      conTotalAll: number;
    };

    const roundResults: RoundResult[] = event.rounds.map((round) => {
      const proTeamData = round.roundTeams.find((rt) => rt.side === "PRO");
      const conTeamData = round.roundTeams.find((rt) => rt.side === "CON");

      const judgeResults = round.judgeSlots.map((slot) => {
        let proTotal = 0,
          conTotal = 0;
        if (proTeamData) {
          proTotal = proTeamData.scores
            .filter((s) => s.slot.id === slot.id)
            .reduce((sum, s) => sum + (s.totalScore || 0), 0);
        }
        if (conTeamData) {
          conTotal = conTeamData.scores
            .filter((s) => s.slot.id === slot.id)
            .reduce((sum, s) => sum + (s.totalScore || 0), 0);
        }
        return {
          alias: slot.judge.alias,
          proTotal,
          conTotal,
          winner: (proTotal > conTotal
            ? "PRO"
            : conTotal > proTotal
              ? "CON"
              : "TIE") as "PRO" | "CON" | "TIE",
        };
      });

      const proWins = judgeResults.filter((j) => j.winner === "PRO").length;
      const conWins = judgeResults.filter((j) => j.winner === "CON").length;
      const overallWinner: "PRO" | "CON" | "TIE" =
        proWins > conWins ? "PRO" : conWins > proWins ? "CON" : "TIE";
      const proTotalAll = judgeResults.reduce((s, j) => s + j.proTotal, 0);
      const conTotalAll = judgeResults.reduce((s, j) => s + j.conTotal, 0);

      return {
        roundTitle: round.title || `Round ${round.roundNum}`,
        topic: round.topic,
        proTeam: proTeamData?.team.name || "PRO Team",
        conTeam: conTeamData?.team.name || "CON Team",
        judgeResults,
        overallWinner,
        proTotalAll,
        conTotalAll,
      };
    });

    // ---- Load logos as base64 ----
    const publicDir = path.join(process.cwd(), "public");

    async function loadLogoBase64(filePath: string): Promise<string | null> {
      try {
        if (!fs.existsSync(filePath)) return null;
        const buf = await sharp(filePath)
          .resize(120, 60, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer();
        return `data:image/png;base64,${buf.toString("base64")}`;
      } catch {
        return null;
      }
    }

    async function loadRemoteLogoBase64(url: string): Promise<string | null> {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        const resized = await sharp(buf)
          .resize(120, 60, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer();
        return `data:image/png;base64,${resized.toString("base64")}`;
      } catch {
        return null;
      }
    }

    let aecLogo: string | null = null;
    let lsuicLogo: string | null = null;
    let customLogoData: string | null = null;

    if (logosOpt === "both" || logosOpt === "aec") {
      aecLogo = await loadLogoBase64(path.join(publicDir, "aec_logo.png"));
    }
    if (logosOpt === "both" || logosOpt === "lsuic") {
      lsuicLogo = await loadLogoBase64(path.join(publicDir, "lsuic-logo.png"));
    }
    if (logosOpt === "custom" && customLogoUrl) {
      customLogoData = await loadRemoteLogoBase64(customLogoUrl);
    }

    // ---- Generate SVG ----
    const W = 1200;
    const roundH = 320;
    const H = 260 + roundResults.length * (roundH + 30) + 80;

    const trophySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#F59E0B">
      <path d="M6 2v2H2v4c0 2.21 1.79 4 4 4h.26c.61 1.71 1.96 3.06 3.74 3.68V18H8a2 2 0 00-2 2v2h12v-2a2 2 0 00-2-2h-2v-2.32c1.78-.62 3.13-1.97 3.74-3.68H20c2.21 0 4-1.79 4-4V4h-4V2H6zm14 2h2v2.5c0 .94-.7 1.73-1.6 1.94L18 8.44V4zm-12 0h8v6c0 2.21-1.79 4-4 4s-4-1.79-4-4V4zm2 0H4v2.5c0 .94.7 1.73 1.6 1.94L8 8.44V4z"/>
    </svg>`;
    const trophyB64 = `data:image/svg+xml;base64,${Buffer.from(trophySvg).toString("base64")}`;

    // Build logo row
    let logoElements = "";
    const logos: { src: string; label: string }[] = [];
    if (aecLogo) logos.push({ src: aecLogo, label: "AEC" });
    if (lsuicLogo) logos.push({ src: lsuicLogo, label: "LSUIC" });
    if (customLogoData) logos.push({ src: customLogoData, label: "" });

    if (logos.length > 0) {
      const spacing = W / (logos.length + 1);
      logos.forEach((logo, i) => {
        const x = spacing * (i + 1) - 60;
        logoElements += `<image href="${logo.src}" x="${x}" y="20" width="120" height="60" preserveAspectRatio="xMidYMid meet"/>`;
      });
    }

    // Build round blocks
    let roundElements = "";
    let yOffset = 200;

    roundResults.forEach((r) => {
      const proWinner = r.overallWinner === "PRO";
      const conWinner = r.overallWinner === "CON";
      const tie = r.overallWinner === "TIE";

      // Judge score table rows
      let judgeRows = "";
      r.judgeResults.forEach((j, idx) => {
        const rowY = 170 + idx * 32;
        const jWin =
          j.winner === "PRO" ? "PRO" : j.winner === "CON" ? "CON" : "";
        judgeRows += `
          <rect x="100" y="${rowY}" width="400" height="30" rx="6" fill="${idx % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)"}"/>
          <text x="160" y="${rowY + 20}" font-size="15" fill="#CBD5E1" font-family="system-ui,sans-serif">${j.alias}</text>
          <text x="340" y="${rowY + 20}" font-size="15" fill="${j.winner === "PRO" ? "#34D399" : "#CBD5E1"}" font-family="system-ui,sans-serif" text-anchor="middle">${j.proTotal.toFixed(1)}</text>
          <text x="430" y="${rowY + 20}" font-size="15" fill="${j.winner === "CON" ? "#F87171" : "#CBD5E1"}" font-family="system-ui,sans-serif" text-anchor="middle">${j.conTotal.toFixed(1)}</text>
          ${jWin ? `<text x="${jWin === "PRO" ? 520 : 580}" y="${rowY + 20}" font-size="11" fill="${jWin === "PRO" ? "#34D399" : "#F87171"}" font-family="system-ui,sans-serif">WIN</text>` : ""}
        `;
      });

      roundElements += `
        <g transform="translate(60, ${yOffset})">
          <!-- Round card background -->
          <rect x="0" y="0" width="${W - 120}" height="${roundH}" rx="16" fill="rgba(30,41,59,0.95)" stroke="${tie ? "#64748B" : proWinner ? "#34D399" : "#F87171"}" stroke-width="2"/>

          <!-- Round title + topic -->
          <text x="30" y="40" font-size="20" font-weight="700" fill="#F1F5F9" font-family="system-ui,sans-serif">${escSvg(r.roundTitle)}</text>
          <text x="30" y="64" font-size="14" fill="#94A3B8" font-family="system-ui,sans-serif">&ldquo;${escSvg(r.topic.slice(0, 80))}${r.topic.length > 80 ? "…" : ""}&rdquo;</text>

          <!-- PRO team -->
          <rect x="30" y="85" width="200" height="50" rx="10" fill="${proWinner ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)"}" stroke="${proWinner ? "#34D399" : "rgba(255,255,255,0.1)"}" stroke-width="${proWinner ? "2" : "1"}"/>
          <text x="130" y="107" font-size="13" fill="#94A3B8" font-family="system-ui,sans-serif" text-anchor="middle">PRO</text>
          <text x="130" y="126" font-size="16" font-weight="700" fill="${proWinner ? "#34D399" : "#F1F5F9"}" font-family="system-ui,sans-serif" text-anchor="middle">${escSvg(r.proTeam)}</text>
          ${proWinner ? `<image href="${trophyB64}" x="228" y="90" width="36" height="36"/>` : ""}

          <!-- VS -->
          <text x="${W / 2 - 60}" y="118" font-size="18" font-weight="900" fill="#64748B" font-family="system-ui,sans-serif" text-anchor="middle">VS</text>

          <!-- CON team -->
          <rect x="${W - 260}" y="85" width="200" height="50" rx="10" fill="${conWinner ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.05)"}" stroke="${conWinner ? "#F87171" : "rgba(255,255,255,0.1)"}" stroke-width="${conWinner ? "2" : "1"}"/>
          <text x="${W - 160}" y="107" font-size="13" fill="#94A3B8" font-family="system-ui,sans-serif" text-anchor="middle">CON</text>
          <text x="${W - 160}" y="126" font-size="16" font-weight="700" fill="${conWinner ? "#F87171" : "#F1F5F9"}" font-family="system-ui,sans-serif" text-anchor="middle">${escSvg(r.conTeam)}</text>
          ${conWinner ? `<image href="${trophyB64}" x="${W - 276}" y="90" width="36" height="36"/>` : ""}

          <!-- Tie text -->
          ${tie ? `<text x="${W / 2 - 60}" y="145" font-size="13" fill="#F59E0B" font-family="system-ui,sans-serif" text-anchor="middle">TIE</text>` : ""}

          <!-- Judge scores header -->
          <text x="160" y="162" font-size="12" fill="#64748B" font-family="system-ui,sans-serif" text-anchor="left">JUDGE</text>
          <text x="340" y="162" font-size="12" fill="#64748B" font-family="system-ui,sans-serif" text-anchor="middle">PRO Score</text>
          <text x="430" y="162" font-size="12" fill="#64748B" font-family="system-ui,sans-serif" text-anchor="middle">CON Score</text>
          ${judgeRows}

          <!-- Total scores -->
          <rect x="100" y="${170 + r.judgeResults.length * 32 + 8}" width="400" height="36" rx="8" fill="rgba(255,255,255,0.08)"/>
          <text x="160" y="${170 + r.judgeResults.length * 32 + 30}" font-size="15" font-weight="700" fill="#F1F5F9" font-family="system-ui,sans-serif">TOTAL</text>
          <text x="340" y="${170 + r.judgeResults.length * 32 + 30}" font-size="16" font-weight="700" fill="${proWinner ? "#34D399" : "#F1F5F9"}" font-family="system-ui,sans-serif" text-anchor="middle">${r.proTotalAll.toFixed(1)}</text>
          <text x="430" y="${170 + r.judgeResults.length * 32 + 30}" font-size="16" font-weight="700" fill="${conWinner ? "#F87171" : "#F1F5F9"}" font-family="system-ui,sans-serif" text-anchor="middle">${r.conTotalAll.toFixed(1)}</text>

          <!-- Winner badge -->
          ${
            !tie
              ? `
          <rect x="${W - 220}" y="160" width="160" height="60" rx="10" fill="${proWinner ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}" stroke="${proWinner ? "#34D399" : "#F87171"}" stroke-width="1.5"/>
          <text x="${W - 140}" y="185" font-size="11" fill="${proWinner ? "#34D399" : "#F87171"}" font-family="system-ui,sans-serif" text-anchor="middle">WINNER</text>
          <text x="${W - 140}" y="208" font-size="18" font-weight="800" fill="${proWinner ? "#34D399" : "#F87171"}" font-family="system-ui,sans-serif" text-anchor="middle">${escSvg(proWinner ? r.proTeam : r.conTeam)}</text>
          `
              : `
          <rect x="${W - 220}" y="160" width="160" height="60" rx="10" fill="rgba(245,158,11,0.15)" stroke="#F59E0B" stroke-width="1.5"/>
          <text x="${W - 140}" y="185" font-size="11" fill="#F59E0B" font-family="system-ui,sans-serif" text-anchor="middle">RESULT</text>
          <text x="${W - 140}" y="208" font-size="20" font-weight="800" fill="#F59E0B" font-family="system-ui,sans-serif" text-anchor="middle">TIE</text>
          `
          }
        </g>
      `;
      yOffset += roundH + 30;
    });

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="60%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

  <!-- Top accent bar -->
  <rect width="${W}" height="5" fill="url(#goldGrad)"/>

  <!-- Logos row -->
  ${logoElements}

  <!-- Event title -->
  <text x="${W / 2}" y="130" font-size="28" font-weight="800"
        fill="#F1F5F9" font-family="system-ui,sans-serif" text-anchor="middle">
    ${escSvg(event.title)}
  </text>
  ${event.subtitle ? `<text x="${W / 2}" y="163" font-size="17" fill="#F59E0B" font-family="system-ui,sans-serif" text-anchor="middle">${escSvg(event.subtitle)}</text>` : ""}
  ${event.organizer ? `<text x="${W / 2}" y="${event.subtitle ? 187 : 163}" font-size="14" fill="#94A3B8" font-family="system-ui,sans-serif" text-anchor="middle">${escSvg(event.organizer)}</text>` : ""}

  <!-- Round results -->
  ${roundElements}

  <!-- Footer -->
  <text x="${W / 2}" y="${H - 20}" font-size="12" fill="#475569"
        font-family="system-ui,sans-serif" text-anchor="middle">
    Generated by EKD Digital Debate Hub • rhub.ekddigital.com
  </text>
  <rect x="0" y="${H - 5}" width="${W}" height="5" fill="url(#goldGrad)"/>
</svg>`;

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .png({ quality: 95, compressionLevel: 8 })
      .toBuffer();

    const eventSegment = event.slug || id;
    const filename = roundId
      ? `debate-results-${eventSegment}-${roundId.slice(0, 8)}.png`
      : `debate-results-${eventSegment}.png`;

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Results image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate results image" },
      { status: 500 },
    );
  }
}

function escSvg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
