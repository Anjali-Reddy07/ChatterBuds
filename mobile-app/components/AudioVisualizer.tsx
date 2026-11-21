"use client";

import React from "react";
import { Volume2, Mic, ShieldCheck } from "lucide-react";

interface AudioVisualizerProps {
  isSpeaking: boolean;
  isPlaying: boolean;
  audioLevel: number;
}

export function AudioVisualizer({ isSpeaking, isPlaying, audioLevel }: AudioVisualizerProps) {
  // 15 audio frequency spectrum bars with acoustic distribution curve
  const multipliers = [0.3, 0.5, 0.7, 0.9, 1.2, 1.4, 1.6, 1.8, 1.6, 1.4, 1.2, 0.9, 0.7, 0.5, 0.3];

  if (isPlaying) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-1 px-4 w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-center gap-1.5 h-8">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-emerald-500 to-teal-300 animate-pulse"
              style={{
                height: `${10 + ((i % 4) + 1) * 5}px`,
                animationDelay: `${i * 120}ms`,
                animationDuration: "900ms",
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Echo-Guard Active • Partner Audio in Earbuds</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-1 px-4 w-full">
      <div className="flex items-center justify-center gap-1 h-9">
        {multipliers.map((multiplier, idx) => {
          let height = 4;
          if (isSpeaking) {
            // Scale dynamically based on microphone volume level
            height = Math.max(6, Math.min(32, Math.round(audioLevel * multiplier * 0.45)));
          }

          return (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-75 ${
                isSpeaking
                  ? "bg-gradient-to-t from-cyan-500 to-teal-300 shadow-[0_0_10px_rgba(6,182,212,0.8)] scale-y-100"
                  : "bg-slate-800/80"
              }`}
              style={{
                height: `${height}px`,
              }}
            />
          );
        })}
      </div>

      <div className="text-[10px] font-medium tracking-wide flex items-center gap-1.5 text-slate-400">
        {isSpeaking ? (
          <span className="text-cyan-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
            Transcribing with Whisper Turbo...
          </span>
        ) : (
          <span className="text-slate-500 flex items-center gap-1">
            <Mic className="w-3 h-3 text-slate-500" />
            VAD Listening for voice...
          </span>
        )}
      </div>
    </div>
  );
}
