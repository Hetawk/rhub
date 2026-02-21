"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Pencil,
  Check,
  X,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeechTimerProps {
  defaultDurationSec?: number;
  topic?: string;
  onTopicChange?: (topic: string) => void;
  enabled?: boolean;
}

type TimerState = "idle" | "running" | "paused";
type SoundType = "alarm" | "bell" | "buzzer" | "silent";

// ── Web Audio helpers ────────────────────────────────────────────────────────

function createOsc(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  gain: number,
  start: number,
  dur: number,
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.01);
}

function playAlarm(ctx: AudioContext) {
  const t = ctx.currentTime;
  createOsc(ctx, "sine", 1000, 1.0, t + 0.0, 0.38);
  createOsc(ctx, "sine", 900, 1.0, t + 0.45, 0.38);
  createOsc(ctx, "sine", 780, 1.0, t + 0.9, 0.55);
}

function playBell(ctx: AudioContext) {
  const t = ctx.currentTime;
  createOsc(ctx, "sine", 880, 1.2, t, 0.8);
  createOsc(ctx, "sine", 1760, 0.6, t, 0.5);
  createOsc(ctx, "sine", 2640, 0.3, t, 0.3);
}

function playBuzzer(ctx: AudioContext) {
  const t = ctx.currentTime;
  createOsc(ctx, "sawtooth", 120, 0.8, t, 0.15);
  createOsc(ctx, "sawtooth", 120, 0.8, t + 0.2, 0.15);
  createOsc(ctx, "sawtooth", 120, 0.8, t + 0.4, 0.25);
}

function ringSound(ctx: AudioContext, type: SoundType) {
  if (type === "alarm") playAlarm(ctx);
  else if (type === "bell") playBell(ctx);
  else if (type === "buzzer") playBuzzer(ctx);
}

function playOvertimeTick(ctx: AudioContext) {
  createOsc(ctx, "sine", 660, 0.55, ctx.currentTime, 0.15);
}

function secsToMMSS(secs: number) {
  const a = Math.abs(secs);
  return { m: Math.floor(a / 60), s: a % 60 };
}

// ────────────────────────────────────────────────────────────────────────────

export function SpeechTimer({
  defaultDurationSec = 300,
  topic: topicProp,
  onTopicChange,
  enabled = true,
}: SpeechTimerProps) {
  const [duration, setDuration] = useState(defaultDurationSec);
  const [secondsLeft, setSecondsLeft] = useState(defaultDurationSec);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [soundOn, setSoundOn] = useState(true);
  const [soundType, setSoundType] = useState<SoundType>("alarm");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [localTopic, setLocalTopic] = useState(topicProp ?? "");
  const [editTopic, setEditTopic] = useState(false);
  const [editTopicValue, setEditTopicValue] = useState("");
  useEffect(() => {
    setLocalTopic(topicProp ?? "");
  }, [topicProp]);

  const [editDuration, setEditDuration] = useState(false);
  const [editMins, setEditMins] = useState(0);
  const [editSecs, setEditSecs] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(soundOn);
  const soundTypeRef = useRef(soundType);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);
  useEffect(() => {
    soundTypeRef.current = soundType;
  }, [soundType]);

  const isOvertime = secondsLeft < 0;
  const progress =
    duration === 0
      ? 100
      : secondsLeft >= 0
        ? ((duration - secondsLeft) / duration) * 100
        : 100;

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      const next = prev - 1;
      if (prev === 1) {
        if (soundOnRef.current && soundTypeRef.current !== "silent") {
          ensureAudio();
          if (audioCtxRef.current)
            ringSound(audioCtxRef.current, soundTypeRef.current);
        }
      }
      if (
        next < 0 &&
        -next % 3 === 0 &&
        soundOnRef.current &&
        soundTypeRef.current !== "silent"
      ) {
        ensureAudio();
        if (audioCtxRef.current) playOvertimeTick(audioCtxRef.current);
      }
      return next;
    });
  }, [ensureAudio]);

  const start = useCallback(() => {
    ensureAudio();
    clearTimer();
    setTimerState("running");
    intervalRef.current = setInterval(tick, 1000);
  }, [clearTimer, tick, ensureAudio]);

  const pause = useCallback(() => {
    clearTimer();
    setTimerState("paused");
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (timerState === "paused") start();
  }, [timerState, start]);

  const reset = useCallback(() => {
    clearTimer();
    setSecondsLeft(duration);
    setTimerState("idle");
  }, [clearTimer, duration]);

  const manualRing = () => {
    ensureAudio();
    if (audioCtxRef.current && soundType !== "silent")
      ringSound(audioCtxRef.current, soundType);
  };

  const openEditDuration = () => {
    setEditMins(Math.floor(duration / 60));
    setEditSecs(duration % 60);
    setEditDuration(true);
  };

  const saveEditDuration = () => {
    const nd = Math.max(5, editMins * 60 + editSecs);
    setDuration(nd);
    setSecondsLeft(nd);
    setTimerState("idle");
    clearTimer();
    setEditDuration(false);
  };

  useEffect(() => () => clearTimer(), [clearTimer]);

  if (!enabled) return null;

  const { m: minutes, s: seconds } = secsToMMSS(secondsLeft);
  const isRunning = timerState === "running";
  const isLow = secondsLeft > 10 && secondsLeft <= 30 && isRunning;
  const isCritical = secondsLeft >= 0 && secondsLeft <= 10 && isRunning;
  const circum = 2 * Math.PI * 46;

  const ringBorder = isOvertime
    ? "border-red-500"
    : isCritical
      ? "border-red-400"
      : isLow
        ? "border-amber-400"
        : "border-[#C8A061]";
  const ringPulse = isOvertime && isRunning ? "animate-pulse" : "";
  const svgColor = isOvertime
    ? "text-red-500"
    : isCritical
      ? "text-red-400"
      : isLow
        ? "text-amber-400"
        : "text-[#C8A061]";
  const timeColor = isOvertime
    ? "text-red-400"
    : isCritical
      ? "text-red-300"
      : isLow
        ? "text-amber-300"
        : "text-white";

  const clockSize = isFullscreen ? "30rem" : "22rem";
  const btnBase =
    "font-semibold rounded-xl transition-colors flex items-center gap-2";

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="flex items-center justify-between w-full gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            ensureAudio();
            setSoundOn((v) => !v);
          }}
          title={soundOn ? "Mute sound" : "Unmute sound"}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border",
            soundOn
              ? "bg-[#C8A061]/15 text-[#C8A061] border-[#C8A061]/30 hover:bg-[#C8A061]/25"
              : "bg-muted text-muted-foreground border-border hover:bg-accent",
          )}
        >
          {soundOn ? (
            <Volume2 className="w-3.5 h-3.5" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {soundOn ? "Sound On" : "Muted"}
          </span>
        </button>
        {soundOn && (
          <select
            value={soundType}
            onChange={(e) => setSoundType(e.target.value as SoundType)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-[#C8A061]/40"
          >
            <option value="alarm">Alarm</option>
            <option value="bell">Bell</option>
            <option value="buzzer">Buzzer</option>
            <option value="silent">Silent</option>
          </select>
        )}
        <button
          onClick={manualRing}
          title="Ring now"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border border-[#C8A061]/40 bg-[#C8A061]/10 text-[#C8A061] hover:bg-[#C8A061]/20 hover:border-[#C8A061]/70 active:scale-95 transition-all"
        >
          {soundOn && soundType !== "silent" ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
          <span className="hidden sm:inline">Ring</span>
        </button>
      </div>
      <button
        onClick={() => setIsFullscreen((v) => !v)}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted text-foreground hover:bg-accent transition-colors"
      >
        {isFullscreen ? (
          <Minimize2 className="w-3.5 h-3.5" />
        ) : (
          <Maximize2 className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {isFullscreen ? "Exit" : "Fullscreen"}
        </span>
      </button>
    </div>
  );

  // ── Topic block ───────────────────────────────────────────────────────────────
  const topicBlock =
    localTopic || onTopicChange ? (
      <div className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            Topic
          </span>
          {onTopicChange && !editTopic && (
            <button
              onClick={() => {
                setEditTopicValue(localTopic);
                setEditTopic(true);
              }}
              className="text-muted-foreground hover:text-[#C8A061] transition-colors"
              title="Edit topic"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
        {editTopic ? (
          <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
            <input
              autoFocus
              value={editTopicValue}
              onChange={(e) => setEditTopicValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setLocalTopic(editTopicValue);
                  onTopicChange?.(editTopicValue);
                  setEditTopic(false);
                }
                if (e.key === "Escape") setEditTopic(false);
              }}
              className="flex-1 min-w-0 text-sm text-center border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#C8A061]/40"
            />
            <button
              onClick={() => {
                setLocalTopic(editTopicValue);
                onTopicChange?.(editTopicValue);
                setEditTopic(false);
              }}
              className="text-emerald-500 hover:text-emerald-400"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditTopic(false)}
              className="text-muted-foreground hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p
            className={cn(
              "font-medium italic",
              isFullscreen ? "text-lg text-white" : "text-sm text-foreground",
            )}
          >
            &ldquo;{localTopic}&rdquo;
          </p>
        )}
      </div>
    ) : null;

  // ── Clock face ────────────────────────────────────────────────────────────────
  const clockFace = (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full border-4 bg-zinc-900 transition-colors duration-300",
        ringBorder,
        ringPulse,
      )}
      style={{ width: clockSize, height: clockSize, flexShrink: 0 }}
    >
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-zinc-700"
        />
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth={isFullscreen ? "4" : "3"}
          strokeDasharray={String(circum)}
          strokeDashoffset={String(circum * (1 - progress / 100))}
          strokeLinecap="round"
          className={svgColor}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="z-10 text-center select-none px-2 flex flex-col items-center">
        {isOvertime && (
          <p
            className="text-red-400 font-bold uppercase tracking-widest mb-1 animate-pulse"
            style={{ fontSize: isFullscreen ? "1rem" : "0.7rem" }}
          >
            OVERTIME
          </p>
        )}
        <p
          className={cn(
            "font-mono font-black tabular-nums leading-none transition-colors",
            timeColor,
          )}
          style={{
            fontSize: isFullscreen ? "7rem" : "5rem",
            letterSpacing: "-0.02em",
          }}
        >
          {isOvertime && (
            <span style={{ fontSize: isFullscreen ? "5rem" : "3.5rem" }}>
              −
            </span>
          )}
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </p>
        {timerState === "paused" && (
          <p className="text-zinc-400 mt-2 text-sm font-medium tracking-widest uppercase">
            Paused
          </p>
        )}
      </div>
    </div>
  );

  // ── Controls ──────────────────────────────────────────────────────────────────
  const controls = (
    <div className="flex items-center justify-center gap-3">
      {timerState === "idle" && (
        <button
          onClick={start}
          className={cn(
            btnBase,
            "px-8 py-3.5 bg-[#C8A061] hover:bg-[#D4AF6A] text-zinc-900",
            isFullscreen ? "text-base" : "text-sm",
          )}
        >
          <Play
            className={cn(
              "fill-zinc-900",
              isFullscreen ? "w-5 h-5" : "w-4 h-4",
            )}
          />
          Start
        </button>
      )}
      {timerState === "running" && (
        <button
          onClick={pause}
          className={cn(
            btnBase,
            "px-8 py-3.5 bg-muted hover:bg-accent text-foreground border border-border",
            isFullscreen ? "text-base" : "text-sm",
          )}
        >
          <Pause className={cn(isFullscreen ? "w-5 h-5" : "w-4 h-4")} />
          Pause
        </button>
      )}
      {timerState === "paused" && (
        <button
          onClick={resume}
          className={cn(
            btnBase,
            "px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white",
            isFullscreen ? "text-base" : "text-sm",
          )}
        >
          <Play
            className={cn("fill-white", isFullscreen ? "w-5 h-5" : "w-4 h-4")}
          />
          Resume
        </button>
      )}
      {timerState !== "idle" && (
        <button
          onClick={reset}
          className={cn(
            btnBase,
            "px-5 py-3.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted",
            isFullscreen ? "text-base" : "text-sm",
          )}
        >
          <RotateCcw className={cn(isFullscreen ? "w-5 h-5" : "w-4 h-4")} />
          Reset
        </button>
      )}
    </div>
  );

  // ── Duration editor (idle only) ───────────────────────────────────────────────
  const durationEditor =
    timerState === "idle" &&
    (editDuration ? (
      <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-4 py-2.5 border border-border flex-wrap justify-center">
        <span className="text-xs text-muted-foreground font-medium">
          Set time:
        </span>
        <input
          type="number"
          min={0}
          max={99}
          value={editMins}
          onChange={(e) => setEditMins(Math.max(0, +e.target.value || 0))}
          className="w-16 text-center text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#C8A061]/40 font-mono"
          placeholder="min"
          autoFocus
        />
        <span className="text-muted-foreground font-bold text-lg">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={editSecs}
          onChange={(e) =>
            setEditSecs(Math.min(59, Math.max(0, +e.target.value || 0)))
          }
          className="w-16 text-center text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#C8A061]/40 font-mono"
          placeholder="sec"
        />
        <button
          onClick={saveEditDuration}
          className="text-emerald-500 hover:text-emerald-400 transition-colors"
        >
          <Check className="w-5 h-5" />
        </button>
        <button
          onClick={() => setEditDuration(false)}
          className="text-muted-foreground hover:text-red-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    ) : (
      <button
        onClick={openEditDuration}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:border-[#C8A061]/40 hover:bg-muted transition-colors text-sm font-medium"
      >
        <Pencil className="w-4 h-4" />
        Set duration ({Math.floor(duration / 60)}:
        {String(duration % 60).padStart(2, "0")})
      </button>
    ));

  // ── Fullscreen layout ──────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950">
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-sm font-medium border border-zinc-700"
        >
          <Minimize2 className="w-4 h-4" />
          Exit Fullscreen
        </button>
        <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto px-4 py-16">
          {toolbar}
          {topicBlock}
          {clockFace}
          {controls}
          {durationEditor}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {toolbar}
      {topicBlock}
      {clockFace}
      {controls}
      {durationEditor}
    </div>
  );
}
