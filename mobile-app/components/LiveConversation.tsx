"use client";

import React, { useRef, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Sparkles,
  Play,
  RotateCcw,
} from "lucide-react";
import { AudioMode } from "@/hooks/useAudioRecorder";
import { ChatMessage } from "@/hooks/useChatterWebSocket";
import { AudioVisualizer } from "./AudioVisualizer";

interface LiveConversationProps {
  roomCode: string;
  myLang: string;
  partnerConnected: boolean;
  partnerLang: string | null;
  mode: AudioMode;
  onSetMode: (mode: AudioMode) => void;
  onLeaveRoom: () => void;
  // Audio Recorder State
  isRecording: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  micPermission: "prompt" | "granted" | "denied";
  startHoldToTalk: () => void;
  stopHoldToTalk: () => void;
  // WebSocket State
  isConnected: boolean;
  connectionError: string | null;
  messages: ChatMessage[];
  isPlaying: boolean;
  onReplayAudio: (base64Audio: string) => void;
}

export function LiveConversation({
  roomCode,
  myLang,
  partnerConnected,
  partnerLang,
  mode,
  onSetMode,
  onLeaveRoom,
  isRecording,
  isSpeaking,
  audioLevel,
  micPermission,
  startHoldToTalk,
  stopHoldToTalk,
  isConnected,
  connectionError,
  messages,
  isPlaying,
  onReplayAudio,
}: LiveConversationProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat log on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isPlaying]);

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] justify-between pb-4">
      {/* Top Header & Status Bar */}
      <header className="p-3.5 bg-surface/90 backdrop-blur-md border-b border-surface-border flex items-center justify-between sticky top-0 z-20">
        <button
          onClick={onLeaveRoom}
          className="p-2 rounded-xl bg-surface-card border border-surface-border text-slate-300 hover:text-white transition active:scale-95"
          title="Exit Room"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              #{roomCode}
            </span>
            <span className="text-xs font-medium text-slate-300 bg-surface-card px-2 py-0.5 rounded border border-surface-border">
              {myLang}
            </span>
          </div>

          {/* Live Partner Status Badge */}
          <div className="mt-1 flex items-center gap-1.5">
            {partnerConnected ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-emerald">
                <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse"></span>
                Partner Connected {partnerLang ? `(${partnerLang})` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping-slow"></span>
                Waiting for partner...
              </span>
            )}
          </div>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center bg-surface-card border border-surface-border rounded-xl p-1">
          <button
            onClick={() => onSetMode("vad")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
              mode === "vad"
                ? "bg-primary text-surface shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Auto-Listen Voice Activity Detection"
          >
            Auto
          </button>
          <button
            onClick={() => onSetMode("ptt")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
              mode === "ptt"
                ? "bg-primary text-surface shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Hold-to-Talk for noisy environments"
          >
            Hold
          </button>
        </div>
      </header>

      {/* Connection Alert Banner */}
      {connectionError && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-300 text-center font-medium">
          {connectionError}
        </div>
      )}

      {/* Echo Guard & Status Banner */}
      <div className="px-4 py-1.5 bg-surface/40 flex items-center justify-between text-[11px] text-slate-400 border-b border-surface-border/40">
        <div className="flex items-center gap-1.5">
          {isPlaying ? (
            <span className="text-accent-emerald font-semibold flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              Echo-Guard: Mic Muted (Audio Playing)
            </span>
          ) : isSpeaking ? (
            <span className="text-primary font-semibold flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Streaming Speech...
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400">
              <Mic className="w-3.5 h-3.5" />
              {mode === "vad" ? "Listening continuously..." : "Press button to speak"}
            </span>
          )}
        </div>

        <span className="font-mono text-[10px] text-slate-500">
          {isConnected ? "WSS Online" : "Connecting..."}
        </span>
      </div>

      {/* Bilingual Chat Stream */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center text-primary/80">
              <Sparkles className="w-6 h-6 animate-pulse-slow" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300">Room Ready</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                {partnerConnected
                  ? `Speak in ${myLang} — your partner will hear the translation in their earbuds in real time!`
                  : "Invite your partner by sharing the 4-digit room code or QR code to begin translating."}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"} gap-1`}
            >
              {/* Sender label and language badge */}
              <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-slate-400">
                <span>{msg.isSelf ? "You" : "Partner"}</span>
                <span>•</span>
                <span className="text-primary font-medium">{msg.sourceLang}</span>
                <span>→</span>
                <span className="text-accent-emerald font-medium">{msg.targetLang}</span>
                <span>•</span>
                <span className="text-slate-400 font-mono">{msg.timestamp}</span>
              </div>

              {/* Chat Bubble Container */}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-md flex flex-col gap-1.5 transition-all ${
                  msg.isSelf
                    ? "bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-tr-sm text-slate-100"
                    : "bg-surface-card border border-surface-border rounded-tl-sm text-white"
                }`}
              >
                {/* Translated Text (Hero text) */}
                <div className="text-sm font-semibold leading-relaxed tracking-normal text-white">
                  {msg.translatedText}
                </div>

                {/* Original Transcript */}
                <div className="text-xs text-slate-400 italic border-t border-surface-border/40 pt-1.5 flex items-center justify-between gap-2">
                  <span>&ldquo;{msg.originalText}&rdquo;</span>

                  {msg.audioBase64 && (
                    <button
                      onClick={() => onReplayAudio(msg.audioBase64!)}
                      className="p-1 rounded-md bg-surface border border-surface-border text-slate-300 hover:text-white transition active:scale-90"
                      title="Replay translated audio in earbuds"
                    >
                      <Play className="w-3 h-3 fill-current text-primary" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Audio Interaction Dock */}
      <div className="px-4 pt-2 pb-1 border-t border-surface-border/60 bg-surface/80 backdrop-blur-md flex flex-col items-center gap-3">
        {/* Dynamic Sound Wave Visualizer */}
        <AudioVisualizer isSpeaking={isSpeaking} isPlaying={isPlaying} audioLevel={audioLevel} />

        {/* Talk Control depending on Mode */}
        {mode === "vad" ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <div
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs font-semibold tracking-wide transition-all ${
                isSpeaking
                  ? "bg-primary text-surface border-primary shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                  : isPlaying
                  ? "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/30"
                  : "bg-surface-card text-slate-300 border-surface-border"
              }`}
            >
              <Mic className={`w-4 h-4 ${isSpeaking ? "animate-bounce" : ""}`} />
              <span>
                {isPlaying
                  ? "Audio Playing (Echo-Guard)"
                  : isSpeaking
                  ? "Speaking..."
                  : "Auto-Listen (VAD Active)"}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-2">
            <button
              onMouseDown={startHoldToTalk}
              onMouseUp={stopHoldToTalk}
              onMouseLeave={stopHoldToTalk}
              onTouchStart={startHoldToTalk}
              onTouchEnd={stopHoldToTalk}
              disabled={isPlaying}
              className={`w-full max-w-xs py-4 px-6 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all select-none shadow-xl active:scale-95 ${
                isPlaying
                  ? "bg-surface-card border border-surface-border text-slate-500 cursor-not-allowed"
                  : isSpeaking
                  ? "bg-rose-500 text-white shadow-rose-500/40 animate-pulse"
                  : "bg-gradient-to-r from-primary to-accent-emerald text-surface shadow-primary/20"
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>
                {isPlaying
                  ? "Echo-Guard Active"
                  : isSpeaking
                  ? "Release to Send"
                  : "Hold to Talk"}
              </span>
            </button>
            <span className="text-[10px] text-slate-400">
              Hold while speaking, release when done.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
