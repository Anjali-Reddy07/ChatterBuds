"use client";

import React from "react";

interface AudioVisualizerProps {
  isSpeaking: boolean;
  isPlaying: boolean;
  audioLevel: number;
}

export function AudioVisualizer({ isSpeaking, isPlaying, audioLevel }: AudioVisualizerProps) {
  // Generate 7 sound bars representing audio frequency spectrum
  const bars = [0.4, 0.7, 1.0, 1.3, 1.0, 0.7, 0.4];

  if (isPlaying) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-2">
        <span className="text-xs font-medium text-accent-emerald flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-accent-emerald inline-block"></span>
          Partner Speaking (Echo-Guard Active)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 h-10">
      {bars.map((multiplier, idx) => {
        let height = 6;
        if (isSpeaking) {
          height = Math.max(8, Math.min(36, Math.round(audioLevel * multiplier * 0.4)));
        }

        return (
          <div
            key={idx}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              isSpeaking
                ? "bg-primary shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                : "bg-surface-border"
            }`}
            style={{
              height: `${height}px`,
            }}
          />
        );
      })}
    </div>
  );
}
