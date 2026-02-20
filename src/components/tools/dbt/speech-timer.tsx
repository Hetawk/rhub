"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { SPEECH_TYPES } from "@/lib/dbt/config";

interface SpeechTimerProps {
  /** Default duration per speech in seconds (from round config) */
  defaultDurationSec?: number;
  /** Prep time in seconds */
  prepTimeSec?: number;
  /** Topic text displayed above the timer */
  topic?: string;
  /** Callback when timer reaches zero */
  onTimeUp?: (speechType: string) => void;
  /** Current speech index (controlled externally) */
  currentSpeechIndex?: number;
  /** Whether timer is enabled */
  enabled?: boolean;
}

type TimerState = "idle" | "running" | "paused" | "done";

export function SpeechTimer({
  defaultDurationSec = 240,
  prepTimeSec = 60,
  topic,
  onTimeUp,
  currentSpeechIndex: controlledIndex,
  enabled = true,
}: SpeechTimerProps) {
  const [speechIdx, setSpeechIdx] = useState(controlledIndex ?? 0);
  const [secondsLeft, setSecondsLeft] = useState(defaultDurationSec);
  const [state, setState] = useState<TimerState>("idle");
  const [isPrep, setIsPrep] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync controlled index
  useEffect(() => {
    if (controlledIndex !== undefined) {
      setSpeechIdx(controlledIndex);
      setSecondsLeft(defaultDurationSec);
      setState("idle");
      setIsPrep(false);
    }
  }, [controlledIndex, defaultDurationSec]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        clearTimer();
        setState("done");
        if (!isPrep) {
          const speech = SPEECH_TYPES[speechIdx];
          onTimeUp?.(speech?.key ?? "");
        }
        return 0;
      }
      return prev - 1;
    });
  }, [clearTimer, isPrep, speechIdx, onTimeUp]);

  const start = useCallback(() => {
    clearTimer();
    setState("running");
    intervalRef.current = setInterval(tick, 1000);
  }, [clearTimer, tick]);

  const pause = useCallback(() => {
    clearTimer();
    setState("paused");
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (state === "paused") start();
  }, [state, start]);

  const reset = useCallback(() => {
    clearTimer();
    setSecondsLeft(isPrep ? prepTimeSec : defaultDurationSec);
    setState("idle");
  }, [clearTimer, isPrep, prepTimeSec, defaultDurationSec]);

  const startPrep = useCallback(() => {
    clearTimer();
    setIsPrep(true);
    setSecondsLeft(prepTimeSec);
    setState("running");
    intervalRef.current = setInterval(tick, 1000);
  }, [clearTimer, prepTimeSec, tick]);

  const startSpeech = useCallback(() => {
    clearTimer();
    setIsPrep(false);
    setSecondsLeft(defaultDurationSec);
    setState("running");
    intervalRef.current = setInterval(tick, 1000);
  }, [clearTimer, defaultDurationSec, tick]);

  const goToSpeech = useCallback(
    (idx: number) => {
      clearTimer();
      setSpeechIdx(idx);
      setSecondsLeft(defaultDurationSec);
      setState("idle");
      setIsPrep(false);
    },
    [clearTimer, defaultDurationSec],
  );

  const nextSpeech = useCallback(() => {
    if (speechIdx < SPEECH_TYPES.length - 1) {
      goToSpeech(speechIdx + 1);
    }
  }, [speechIdx, goToSpeech]);

  const prevSpeech = useCallback(() => {
    if (speechIdx > 0) {
      goToSpeech(speechIdx - 1);
    }
  }, [speechIdx, goToSpeech]);

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  if (!enabled) return null;

  const currentSpeech = SPEECH_TYPES[speechIdx];
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isLow = secondsLeft <= 30 && state === "running";
  const isCritical = secondsLeft <= 10 && state === "running";
  const progress = isPrep
    ? ((prepTimeSec - secondsLeft) / prepTimeSec) * 100
    : ((defaultDurationSec - secondsLeft) / defaultDurationSec) * 100;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Topic display */}
      {topic && (
        <div className="w-full text-center px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Topic
          </p>
          <p className="text-base text-slate-200 font-medium italic">
            &ldquo;{topic}&rdquo;
          </p>
        </div>
      )}

      {/* Speech label */}
      <div className="text-center">
        <p className="text-sm text-slate-400">
          Speech {speechIdx + 1} of {SPEECH_TYPES.length}
        </p>
        <h3 className="text-lg font-semibold text-white">
          {currentSpeech?.label ?? "—"}
        </h3>
        {isPrep && (
          <span className="inline-block mt-1 px-3 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
            PREP TIME
          </span>
        )}
      </div>

      {/* Big countdown */}
      <div
        className={`relative flex items-center justify-center w-64 h-64 rounded-full border-4 transition-colors duration-300 ${
          isCritical
            ? "border-red-500 bg-red-500/10"
            : isLow
              ? "border-amber-500 bg-amber-500/10"
              : state === "done"
                ? "border-slate-600 bg-slate-800/50"
                : "border-gold-500 bg-slate-800/30"
        }`}
        style={
          !isCritical && !isLow && state !== "done"
            ? { borderColor: "#d4af37" }
            : undefined
        }
      >
        {/* Progress ring */}
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
            className="text-slate-700/30"
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 46}`}
            strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className={
              isCritical
                ? "text-red-500"
                : isLow
                  ? "text-amber-500"
                  : "text-[#d4af37]"
            }
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>

        {/* Time display */}
        <div className="z-10 text-center">
          <p
            className={`font-mono font-bold tabular-nums transition-colors ${
              isCritical
                ? "text-red-400 text-6xl animate-pulse"
                : isLow
                  ? "text-amber-400 text-6xl"
                  : state === "done"
                    ? "text-slate-500 text-6xl"
                    : "text-white text-6xl"
            }`}
          >
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </p>
          {state === "done" && (
            <p className="text-sm text-slate-400 mt-1">TIME&apos;S UP</p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {state === "idle" && (
          <>
            <button
              onClick={startPrep}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Start Prep ({Math.floor(prepTimeSec / 60)}:
              {String(prepTimeSec % 60).padStart(2, "0")})
            </button>
            <button
              onClick={startSpeech}
              className="px-4 py-2 bg-[#d4af37] hover:bg-[#c4a030] text-slate-900 rounded-lg text-sm font-medium transition-colors"
            >
              Start Speech
            </button>
          </>
        )}
        {state === "running" && (
          <button
            onClick={pause}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Pause
          </button>
        )}
        {state === "paused" && (
          <>
            <button
              onClick={resume}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Resume
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Reset
            </button>
          </>
        )}
        {state === "done" && (
          <button
            onClick={reset}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Speech navigation */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={prevSpeech}
          disabled={speechIdx === 0}
          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous speech"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Speech dots */}
        <div className="flex gap-1.5">
          {SPEECH_TYPES.map((s, i) => (
            <button
              key={s.key}
              onClick={() => goToSpeech(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                i === speechIdx
                  ? "bg-[#d4af37] scale-125"
                  : "bg-slate-600 hover:bg-slate-400"
              }`}
              title={s.label}
            />
          ))}
        </div>

        <button
          onClick={nextSpeech}
          disabled={speechIdx === SPEECH_TYPES.length - 1}
          className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next speech"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
