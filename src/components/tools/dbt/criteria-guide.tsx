"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SCORING } from "@/lib/dbt";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CriterionDef {
  label: string;
  description: string;
  tip?: string;
}

interface SpeechGuide {
  key: string;
  label: string;
  shortLabel: string;
  speechType: string;
  durationMins: number;
  icon: string;
  color: {
    bg: string;
    border: string;
    badge: string;
    text: string;
    iconBg: string;
    num: string;
  };
  intro: string;
  criteria: CriterionDef[];
}

// ─── Guide Data ───────────────────────────────────────────────────────────────

const GUIDE: SpeechGuide[] = [
  {
    key: "CONSTRUCTIVE",
    label: "Constructive Speech",
    shortLabel: "Constructive",
    speechType: "1st Speaker · Constructive Speech",
    durationMins: 5,
    icon: "🏗",
    color: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800/50",
      badge: "bg-blue-600 text-white",
      text: "text-blue-700 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      num: "text-blue-500 dark:text-blue-400",
    },
    intro:
      "The Constructive Speech opens the debate. Teams must clearly define their stance and build a persuasive, well-structured case for or against the motion.",
    criteria: [
      {
        label: "Clarity of Position",
        description:
          "Is the team's stance on the motion clearly stated and consistently maintained throughout the speech? Judges look for an unambiguous opening that leaves no doubt about which side the team defends.",
        tip: "Award higher scores when the speaker's position is crystal-clear within the first 30 seconds.",
      },
      {
        label: "Relevance to the Motion",
        description:
          "Do the arguments directly address and advance the team's position on the debate topic? Arguments must stay on-topic and not drift into tangential issues.",
        tip: "Penalize tangents that consume time without strengthening the team's case.",
      },
      {
        label: "Argument Structure",
        description:
          "Are claims logically supported with reasoning, evidence, statistics, or real-world examples? Strong arguments follow a clear structure: claim → warrant → impact.",
        tip: "Look for the 'so what?' — does the speaker explain WHY their point matters to the motion?",
      },
      {
        label: "Organization & Flow",
        description:
          "Are points introduced in a logical sequence with smooth transitions? Judges should be able to follow the argument without confusion.",
        tip: "Signposting (e.g., 'my first point is…') and transitions improve this score significantly.",
      },
      {
        label: "Delivery & Time Control",
        description:
          "Is the speaker confident, audible, and well-paced? Does the speech use the allocated time fully without running over or finishing extremely early?",
        tip: "Finishing more than 45 seconds early or going overtime should lower this score.",
      },
    ],
  },
  {
    key: "CROSS_FIRE_1",
    label: "1st Crossfire",
    shortLabel: "1st Cross-Fire",
    speechType: "1st Speaker · Cross-Examination",
    durationMins: 6,
    icon: "⚔️",
    color: {
      bg: "bg-orange-50 dark:bg-orange-950/30",
      border: "border-orange-200 dark:border-orange-800/50",
      badge: "bg-orange-500 text-white",
      text: "text-orange-700 dark:text-orange-400",
      iconBg: "bg-orange-100 dark:bg-orange-900/40",
      num: "text-orange-500 dark:text-orange-400",
    },
    intro:
      "The first Crossfire is a rapid back-and-forth exchange between the 1st speakers of each team. It tests the ability to probe weaknesses, defend positions, and control the floor.",
    criteria: [
      {
        label: "Quality of Questions",
        description:
          "Are the questions strategic, precise, and purposeful? Strong questions expose contradictions, force concessions, or highlight weaknesses in the opposing case.",
        tip: "Vague or yes/no questions with no strategic purpose should score lower.",
      },
      {
        label: "Responsiveness",
        description:
          "When answering questions, does the speaker respond directly and honestly? Evasion, redirection, or refusing to engage damages this score.",
        tip: "A speaker can disagree with a question's premise but must still address the underlying challenge.",
      },
      {
        label: "Control & Decorum",
        description:
          "Does the speaker manage the pace of the exchange, stay calm under pressure, and maintain professional conduct? Getting flustered or becoming combative hurts this score.",
        tip: "Control means neither monopolizing the exchange nor being steamrolled.",
      },
      {
        label: "Listening Skills",
        description:
          "Does the speaker genuinely engage with what the opponent says? Follow-up questions that build on previous answers demonstrate strong active listening.",
        tip: "Ignoring an answer and moving to a pre-planned next question signals poor listening.",
      },
      {
        label: "Strategic Use of Time",
        description:
          "Is the time in the crossfire used to expose flaws in the opposing case and build strategic advantages, rather than score points emotionally?",
        tip: "The best crossfire moments create openings the team can exploit in later speeches.",
      },
    ],
  },
  {
    key: "REBUTTAL",
    label: "Rebuttal Speech",
    shortLabel: "Rebuttal",
    speechType: "2nd Speaker · Rebuttal Speech",
    durationMins: 5,
    icon: "🔄",
    color: {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-800/50",
      badge: "bg-purple-600 text-white",
      text: "text-purple-700 dark:text-purple-400",
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      num: "text-purple-500 dark:text-purple-400",
    },
    intro:
      "The Rebuttal is the 2nd speaker's moment to directly attack the opposing team's constructive arguments while defending their own team's case. It must be reactive, not a second constructive.",
    criteria: [
      {
        label: "Direct Clash",
        description:
          "Does the speaker clearly identify specific opposing arguments before challenging them? Judges must be able to tell exactly which argument is being refuted.",
        tip: "Start rebuttals with 'Opponent argued X — this is wrong because Y.'",
      },
      {
        label: "Effectiveness of Refutation",
        description:
          "Are the responses logical, well-explained, and genuinely damaging to the opposing argument? Simply saying 'that's not true' without explanation earns no credit.",
        tip: "The best refutations turn the opponent's own logic against them.",
      },
      {
        label: "Prioritization",
        description:
          "Does the speaker focus on the most important and impactful opposing arguments first, rather than spending time on minor or trivial points?",
        tip: "Attacking 5 weak points is less effective than thoroughly dismantling 2 core arguments.",
      },
      {
        label: "Defense of Own Case",
        description:
          "When the opposing team has attacked, does the speaker rebuild and reinforce their own team's arguments? A one-sided rebuttal that only attacks and never defends is incomplete.",
        tip: "Acknowledging criticism and then explaining why it doesn't undermine your case is a strong approach.",
      },
      {
        label: "Comparative Analysis",
        description:
          "Does the speaker explain why their team's overall position is more credible, impactful, or logically sound than the opponent's? This begins the process of 'weighing' the round.",
        tip: "Strong comparative analysis sets up the Summary and Final Focus speeches strategically.",
      },
    ],
  },
  {
    key: "CROSS_FIRE_2",
    label: "2nd Crossfire",
    shortLabel: "2nd Cross-Fire",
    speechType: "2nd Speaker · Cross-Examination",
    durationMins: 6,
    icon: "⚔️",
    color: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800/50",
      badge: "bg-amber-500 text-white",
      text: "text-amber-700 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      num: "text-amber-500 dark:text-amber-400",
    },
    intro:
      "The second Crossfire follows the rebuttals. Both 2nd speakers engage on the deepest substantive clashes of the round. The exchange should reflect an understanding of what is actually at stake.",
    criteria: [
      {
        label: "Quality of Questions",
        description:
          "Are questions targeted at the deepest points of disagreement that surfaced in the rebuttals? By this stage, questions should be more precise and focused on core clashes.",
        tip: "Superficial questions that ignore rebuttal exchanges are a missed opportunity.",
      },
      {
        label: "Responsiveness",
        description:
          "Are answers direct and forthcoming? Does the speaker engage honestly with difficult questions rather than deflecting?",
        tip: "Conceding a minor point gracefully can strengthen overall credibility.",
      },
      {
        label: "Control & Decorum",
        description:
          "Does the speaker maintain composure and civility, even when the exchanges become heated? Respect for the process reflects debate maturity.",
        tip: "Talking over opponents or raising one's voice without purpose should reduce this score.",
      },
      {
        label: "Listening Skills",
        description:
          "Does the speaker accurately track and engage with the opponent's actual responses, adapting follow-up questions accordingly?",
        tip: "Speakers who pursue the answer they expected rather than the answer given are poor listeners.",
      },
      {
        label: "Strategic Use of Time",
        description:
          "Is the crossfire used to generate leverage for the Summary? Smart speakers use this time to establish agreements and disagreements that simplify the judge's decision.",
        tip: "Getting an opponent to agree on a key premise is more valuable than winning an argument by volume.",
      },
    ],
  },
  {
    key: "SUMMARY",
    label: "Summary Speech",
    shortLabel: "Summary",
    speechType: "1st Speaker · Summary Speech",
    durationMins: 5,
    icon: "📋",
    color: {
      bg: "bg-teal-50 dark:bg-teal-950/30",
      border: "border-teal-200 dark:border-teal-800/50",
      badge: "bg-teal-600 text-white",
      text: "text-teal-700 dark:text-teal-400",
      iconBg: "bg-teal-100 dark:bg-teal-900/40",
      num: "text-teal-500 dark:text-teal-400",
    },
    intro:
      "The Summary Speech narrows the round to its most critical issues. The 1st speaker must synthesize the entire debate into clear, digestible points without introducing new arguments.",
    criteria: [
      {
        label: "Issue Selection",
        description:
          "Does the speaker correctly identify and focus on the most important contentious issues, rather than restating every argument made across the round?",
        tip: "A good Summary focuses on 2–3 key issues that, if won, win the round.",
      },
      {
        label: "Crystallization",
        description:
          "Are the most important points simplified, sharpened, and made easy for judges to understand and remember? Complex arguments should become clear, memorable claims.",
        tip: "Think of crystallization as distilling a long legal case into a single, powerful closing argument.",
      },
      {
        label: "Consistency",
        description:
          "Does the speaker avoid introducing new arguments at this late stage? New contentions in the Summary are procedurally improper and should be penalized.",
        tip: "Extending and applying existing arguments is acceptable; launching new arguments is not.",
      },
      {
        label: "Impact Framing",
        description:
          "Does the speaker clearly articulate the real-world consequences of winning each argument? Why does it matter who wins this clash?",
        tip: "Impacts should explain magnitude (how big?), probability (how likely?), and relevance (why does it matter to the motion?).",
      },
      {
        label: "Balance",
        description:
          "Does the speaker devote appropriate time to both attacking the opposing case and reinforcing their own team's strongest arguments?",
        tip: "An all-attack Summary that ignores opponent challenges to your own case leaves judges with unresolved doubts.",
      },
    ],
  },
  {
    key: "GRAND_CROSS_FIRE",
    label: "Grand Crossfire",
    shortLabel: "Grand Cross",
    speechType: "All Speakers · Grand Cross-Examination",
    durationMins: 8,
    icon: "🌐",
    color: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-800/50",
      badge: "bg-rose-600 text-white",
      text: "text-rose-700 dark:text-rose-400",
      iconBg: "bg-rose-100 dark:bg-rose-900/40",
      num: "text-rose-500 dark:text-rose-400",
    },
    intro:
      "The Grand Crossfire involves all four debaters simultaneously. It is the most complex and dynamic segment — chaos must be turned into clarity. Teams that control this exchange often swing the round.",
    criteria: [
      {
        label: "Questioning Strategy",
        description:
          "Are questions purposeful and clearly linked to the team's overall case strategy? The best teams use the Grand Crossfire to lock in concessions and expose fatal weaknesses.",
        tip: "Random or exploratory questions waste valuable floor time in this segment.",
      },
      {
        label: "Responsiveness & Defense",
        description:
          "Do speakers answer directly and defend their team's positions under pressure from multiple opponents? Teams must hold their ground without becoming defensive or dismissive.",
        tip: "Short, confident answers often work better than long explanations in the Grand Crossfire.",
      },
      {
        label: "Control & Floor Management",
        description:
          "Does the team help organize the chaotic four-speaker dynamic? Being heard, staying on point, and preventing the exchange from descending into talking over each other all count.",
        tip: "Calmly re-directing an out-of-control exchange demonstrates maturity and leadership.",
      },
      {
        label: "Listening & Adaptation",
        description:
          "Does the speaker track what opponents actually say in the moment and adapt their questions and responses accordingly?",
        tip: "In a four-speaker exchange, the ability to process and respond to multiple streams of argument simultaneously is elite-level.",
      },
      {
        label: "Professionalism & Decorum",
        description:
          "Does the entire team maintain debate ethics, sportsmanship, and mutual respect — even when tensions are high?",
        tip: "Interrupting rudely or speaking disrespectfully should significantly reduce this score.",
      },
    ],
  },
  {
    key: "FINAL_FOCUS",
    label: "Final Focus Speech",
    shortLabel: "Final Focus",
    speechType: "2nd Speaker · Final Focus Speech",
    durationMins: 5,
    icon: "🎯",
    color: {
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      border: "border-indigo-200 dark:border-indigo-800/50",
      badge: "bg-indigo-600 text-white",
      text: "text-indigo-700 dark:text-indigo-400",
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
      num: "text-indigo-500 dark:text-indigo-400",
    },
    intro:
      "The Final Focus is the last speech in the round — the 2nd speaker's definitive closing argument. It must directly guide judges to vote for this team by making it clear why they win on the most important issues.",
    criteria: [
      {
        label: "Decision Framing",
        description:
          "Does the speaker give judges a clear, compelling reason to vote for their team? The best Final Focus speeches lay out a simple 'path to victory' that is easy for judges to follow.",
        tip: "Explicitly say: 'Vote for us because, on issue X, we have demonstrated Y.'",
      },
      {
        label: "Weighing Mechanism",
        description:
          "Does the speaker compare the impacts of both sides' strongest arguments and explain why their impacts outweigh the opposition's? Weighing addresses magnitude, probability, and relevance.",
        tip: "Don't just assert you win — explain WHY your win matters more than the opponent's best argument.",
      },
      {
        label: "Clarity & Precision",
        description:
          "Are the final points concise, well-phrased, and memorable? Judges take notes; the best Final Focus speeches make those notes easy to write.",
        tip: "Aim for 2–3 sharp, memorable closing lines that crystallize the round's outcome.",
      },
      {
        label: "Strategic Collapse",
        description:
          "Does the speaker narrow the round to only the strongest issues, abandoning peripheral arguments in favor of depth on the critical ones?",
        tip: "A speaker who tries to win every argument in the Final Focus usually wins none convincingly.",
      },
      {
        label: "Persuasiveness & Authority",
        description:
          "Does the speaker sound confident, decisive, and conclusive? The final impression left with judges should be that this team has won — not that it hopes it has.",
        tip: "Vocal confidence, strong eye contact, and a measured pace all contribute to authoritative delivery.",
      },
    ],
  },
];

// ─── Scoring legend ───────────────────────────────────────────────────────────

const SCORE_LEGEND = [
  {
    score: `${SCORING.MAX_CRITERIA}.0`,
    label: "Exceptional",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    desc: "Virtually flawless execution of this criterion. Rare and memorable.",
  },
  {
    score: "5.5",
    label: "Excellent",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50/60 dark:bg-emerald-900/10",
    border: "border-emerald-200 dark:border-emerald-800/60",
    desc: "Very strong performance; minor gaps in execution.",
  },
  {
    score: "5.0",
    label: "Good",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    desc: "Solid, competent execution with some room for improvement.",
  },
  {
    score: "4.5",
    label: "Adequate",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    desc: "Meets minimum expectations; noticeable weaknesses present.",
  },
  {
    score: `${SCORING.MIN_CRITERIA}.0`,
    label: "Below expectations",
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    desc: "Criterion barely addressed; significant improvement needed.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CriteriaGuide() {
  const [active, setActive] = useState(GUIDE[0].key);
  const [showLegend, setShowLegend] = useState(false);

  const guide = GUIDE.find((g) => g.key === active) ?? GUIDE[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl bg-[#182e5f] dark:bg-[#0f1e40] px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs tracking-widest uppercase font-semibold text-slate-300 mb-0.5">
              EKD Debate Hub
            </p>
            <h2 className="text-lg font-bold tracking-tight">
              Judging Criteria Guide
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-sm">
              Reference for judges on how to evaluate each speech type. Scores
              range from{" "}
              <span className="font-bold text-[#C8A061]">
                {SCORING.MIN_CRITERIA}.0
              </span>{" "}
              to{" "}
              <span className="font-bold text-[#C8A061]">
                {SCORING.MAX_CRITERIA}.0
              </span>{" "}
              per criterion.
            </p>
          </div>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 text-white/80 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            {showLegend ? "Hide" : "Show"} Score Guide
          </button>
        </div>
      </div>

      {/* Score legend (collapsible) */}
      {showLegend && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {SCORE_LEGEND.map((s) => (
            <div
              key={s.score}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-center space-y-0.5",
                s.bg,
                s.border,
              )}
            >
              <p className={cn("text-xl font-black tabular-nums", s.color)}>
                {s.score}
              </p>
              <p className={cn("text-xs font-bold", s.color)}>{s.label}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Speech type selector — scrollable pill row */}
      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex gap-2 min-w-max pb-1">
          {GUIDE.map((g, idx) => (
            <button
              key={g.key}
              onClick={() => setActive(g.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all whitespace-nowrap",
                active === g.key
                  ? cn(g.color.badge, "border-transparent shadow-sm")
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600",
              )}
            >
              <span>{g.icon}</span>
              <span className="hidden xs:inline">{g.shortLabel}</span>
              <span className="xs:hidden">{idx + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active speech card */}
      <div
        className={cn(
          "rounded-xl border-2 overflow-hidden",
          guide.color.bg,
          guide.color.border,
        )}
      >
        {/* Speech header */}
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-start gap-4">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0",
              guide.color.iconBg,
            )}
          >
            {guide.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn("text-base font-bold", guide.color.text)}>
                {guide.label}
              </h3>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  guide.color.badge,
                )}
              >
                {guide.durationMins} min
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {guide.speechType}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {guide.intro}
            </p>
          </div>
        </div>

        {/* Criteria list */}
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {guide.criteria.map((c, idx) => (
            <div key={c.label} className="px-5 py-4 space-y-1.5">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black mt-0.5",
                    guide.color.badge,
                  )}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className={cn("text-sm font-bold", guide.color.text)}>
                    {c.label}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {c.description}
                  </p>
                  {c.tip && (
                    <div className="flex items-start gap-1.5 bg-white/50 dark:bg-white/5 rounded-lg px-3 py-2 mt-1">
                      <span className="text-[11px] shrink-0 mt-px">💡</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                        {c.tip}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            const idx = GUIDE.findIndex((g) => g.key === active);
            if (idx > 0) setActive(GUIDE[idx - 1].key);
          }}
          disabled={active === GUIDE[0].key}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev&nbsp;Speech
        </button>

        {/* Position dots */}
        <div className="flex gap-1.5">
          {GUIDE.map((g) => (
            <button
              key={g.key}
              onClick={() => setActive(g.key)}
              className={cn(
                "rounded-full transition-all duration-200",
                active === g.key
                  ? cn("w-5 h-2", guide.color.badge)
                  : "w-2 h-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
              )}
              aria-label={g.label}
            />
          ))}
        </div>

        <button
          onClick={() => {
            const idx = GUIDE.findIndex((g) => g.key === active);
            if (idx < GUIDE.length - 1) setActive(GUIDE[idx + 1].key);
          }}
          disabled={active === GUIDE[GUIDE.length - 1].key}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next&nbsp;Speech →
        </button>
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 pb-2">
        All 5 criteria are weighted equally. Total speech score ranges from{" "}
        {SCORING.MIN_SPEECH} to {SCORING.MAX_SPEECH} points.
      </p>
    </div>
  );
}
