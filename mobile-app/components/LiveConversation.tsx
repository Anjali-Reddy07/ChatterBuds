"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  ArrowLeft,
  Mic,
  Volume2,
  Radio,
  Play,
  Copy,
  Check,
  Share2,
  Headphones,
  Sparkles,
  Loader2,
  Settings2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { AudioMode, ConversationMode } from "@/hooks/useAudioRecorder";
import { ChatMessage } from "@/hooks/useChatterWebSocket";
import { AudioVisualizer } from "./AudioVisualizer";

interface LiveConversationProps {
  roomCode: string;
  myLang: string;
  partnerConnected: boolean;
  partnerLang: string | null;
  mode: AudioMode;
  conversationMode?: ConversationMode;
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
  isWakingServer?: boolean;
  wakeAttempt?: number;
  isLocalhostIssue?: boolean;
  messages: ChatMessage[];
  isPlaying: boolean;
  onReplayAudio: (base64Audio: string) => void;
  onOpenSettings?: () => void;
}

export function LiveConversation({
  roomCode,
  myLang,
  partnerConnected,
  partnerLang,
  mode,
  conversationMode = "in-person",
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
  isWakingServer,
  wakeAttempt = 0,
  isLocalhostIssue,
  messages,
  isPlaying,
  onReplayAudio,
  onOpenSettings,
}: LiveConversationProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedRoom, setCopiedRoom] = useState(false);

  // Auto-scroll chat log on new messages or audio play
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isPlaying]);

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  const handleCopyRoomLink = async () => {
    try {
      const url = `${window.location.origin}/?room=${roomCode}`;
      await navigator.clipboard.writeText(url);
      setCopiedRoom(true);
      setTimeout(() => setCopiedRoom(false), 2000);
    } catch (e) {
      console.error("Room copy failed:", e);
    }
  };

  // Determine contextual center status text
  const getContextualText = () => {
    if (isPlaying) {
      return {
        title: "Playing Translation",
        subtitle: `Speaking in your earbuds • Echo-Guard Active`,
        status: "playing",
      };
    }
    if (isSpeaking) {
      return {
        title: "Listening to You...",
        subtitle: `Streaming ${myLang} to Whisper Turbo AI`,
        status: "speaking",
      };
    }
    if (!partnerConnected) {
      return {
        title: "Waiting for Partner",
        subtitle: `Share room #${roomCode} to connect partner's phone`,
        status: "waiting",
      };
    }
    return {
      title: mode === "vad" ? "Ready to Listen" : "Ready to Talk",
      subtitle:
        mode === "vad"
          ? `Speak naturally in ${myLang} — pauses translate automatically`
          : `Press & hold the button below to speak in ${myLang}`,
      status: "ready",
    };
  };

  const currentStatus = getContextualText();

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] justify-between pb-2 bg-gradient-to-b from-slate-950 via-[#070a14] to-slate-950">
      {/* Top Header */}
      <header className="p-3 bg-slate-950/80 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <button
          onClick={onLeaveRoom}
          className="p-2.5 rounded-xl glass-pill text-slate-300 hover:text-white hover:border-slate-500 transition-all active:scale-90"
          title="Exit Room"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyRoomLink}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-xs font-mono font-bold tracking-wider text-cyan-300 hover:border-cyan-400 transition"
              title="Click to copy invite link"
            >
              <span>#{roomCode}</span>
              {copiedRoom ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400/80" />}
            </button>
            <span className="text-[11px] font-semibold text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-700/60">
              {myLang}
            </span>
            <span className="text-[11px] font-medium text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded-lg border border-cyan-500/30 flex items-center gap-1">
              {conversationMode === "in-person" ? "👥 In-Person" : "🌐 Long-Distance"}
            </span>
          </div>

          {/* Partner Status Pill */}
          <div className="flex items-center gap-1.5">
            {partnerConnected ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                Partner Connected {partnerLang ? `(${partnerLang})` : ""}
              </span>
            ) : (
              <button
                onClick={handleCopyRoomLink}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400 hover:text-amber-300 transition"
                title="Tap to copy invite link"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping-slow shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <span>Waiting for partner (Tap to invite)</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => onSetMode("vad")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              mode === "vad"
                ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Auto-Listen Voice Activity Detection"
          >
            Auto
          </button>
          <button
            onClick={() => onSetMode("ptt")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              mode === "ptt"
                ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Hold-to-Talk Push-to-Talk"
          >
            Hold
          </button>
        </div>
      </header>

      {/* Reassuring Cloud Voice Engine Status Indicator (Auto-connects & wakes Render) */}
      {!isConnected && (
        <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900/90 to-teal-950/60 border border-cyan-500/30 text-xs text-slate-200 flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            <div>
              <span className="font-semibold text-cyan-300 block">Connecting to ChatterBuds Cloud Voice Engine...</span>
              <span className="text-[11px] text-slate-400">
                {isWakingServer || wakeAttempt > 0
                  ? `Waking up translation server (~30s on first start, attempt ${wakeAttempt || 1})...`
                  : "Establishing secure real-time audio channel..."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Echo-Guard Live Strip */}
      <div className="px-4 py-1.5 bg-slate-950/40 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              Echo-Guard: Playing in Earbuds (Mic Muted)
            </span>
          ) : isSpeaking ? (
            <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Speech Detected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-400">
              <Headphones className="w-3.5 h-3.5 text-slate-500" />
              {mode === "vad" ? "Auto-Listen (0.75s silence pause)" : "Press Hold-to-Talk to speak"}
            </span>
          )}
        </div>

        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400" : isWakingServer ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`} />
          {isConnected ? "Engine Online" : isWakingServer ? "Waking Up" : "Connecting"}
        </span>
      </div>

      {/* Center Void Replacement: Live Audio Visualizer / Mic Orb */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
          <div className="relative group">
            {/* Glowing Orb Rings */}
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                isPlaying
                  ? "bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-emerald-500/10 border-2 border-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.3)] scale-105"
                  : isSpeaking
                  ? "bg-gradient-to-tr from-cyan-500/30 via-teal-500/30 to-blue-500/20 border-2 border-cyan-400/60 shadow-[0_0_50px_rgba(6,182,212,0.45)] scale-110"
                  : "bg-slate-900/60 border border-white/10 shadow-xl"
              }`}
            >
              {isPlaying ? (
                <Volume2 className="w-12 h-12 text-emerald-400 animate-pulse" />
              ) : isSpeaking ? (
                <Radio className="w-12 h-12 text-cyan-400 animate-bounce" />
              ) : (
                <Headphones className="w-12 h-12 text-cyan-400/80" />
              )}
            </div>

            {/* Radiant Breathing Ring */}
            <div
              className={`absolute -inset-3 rounded-full blur-xl pointer-events-none transition-opacity duration-300 ${
                isPlaying
                  ? "bg-emerald-500/25 opacity-100"
                  : isSpeaking
                  ? "bg-cyan-500/30 opacity-100"
                  : "bg-cyan-500/10 opacity-40"
              }`}
            />
          </div>

          <div className="flex flex-col gap-1 max-w-xs">
            <h3 className="text-base font-bold text-white tracking-wide">
              {currentStatus.title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {currentStatus.subtitle}
            </p>
          </div>

          {!partnerConnected && (
            <button
              onClick={handleCopyRoomLink}
              className="mt-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-all active:scale-95 shadow-sm"
            >
              {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
              {copiedRoom ? "Invite Copied!" : "Share Room Invite Link"}
            </button>
          )}
        </div>
      ) : (
        /* Bilingual Chat Stream */
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scroll-smooth"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"} gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              {/* Speaker Label */}
              <div className="flex items-center gap-1.5 px-1.5 text-[10px] font-semibold text-slate-400">
                <span className={msg.isSelf ? "text-cyan-400 font-bold" : "text-purple-400 font-bold"}>
                  {msg.isSelf ? "You" : "Partner"}
                </span>
                <span>•</span>
                <span className="text-slate-300">{msg.sourceLang}</span>
                <span>➔</span>
                <span className="text-emerald-400">{msg.targetLang}</span>
                <span>•</span>
                <span className="text-slate-500 font-mono">{msg.timestamp}</span>
              </div>

              {/* Chat Bubble Container */}
              <div
                className={`max-w-[88%] rounded-2xl p-4 shadow-xl flex flex-col gap-2 transition-all relative group ${
                  msg.isSelf
                    ? "bg-gradient-to-br from-cyan-950/70 via-slate-900/90 to-slate-900 border border-cyan-500/30 rounded-tr-sm text-slate-100 glow-cyan"
                    : "bg-gradient-to-br from-purple-950/70 via-slate-900/90 to-slate-900 border border-purple-500/30 rounded-tl-sm text-white glow-purple"
                }`}
              >
                {/* Translated Text (Hero text) */}
                <div className="text-[15px] font-semibold leading-relaxed tracking-normal text-white">
                  {msg.translatedText}
                </div>

                {/* Original Transcription Strip */}
                <div className="text-xs text-slate-400 italic border-t border-white/10 pt-2 flex items-center justify-between gap-2.5">
                  <span className="truncate">&ldquo;{msg.originalText}&rdquo;</span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.translatedText)}
                      className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition active:scale-90"
                      title="Copy translated text"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>

                    {msg.audioBase64 && (
                      <button
                        onClick={() => onReplayAudio(msg.audioBase64!)}
                        className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition active:scale-90 flex items-center gap-1 shadow-sm"
                        title="Replay translated speech in earbuds"
                      >
                        <Play className="w-3 h-3 fill-current text-cyan-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Audio Interaction Control Dock */}
      <div className="px-4 pt-2.5 pb-2 border-t border-white/10 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center gap-3 shadow-2xl">
        {/* Dynamic Spectrum Waveform Visualizer */}
        <AudioVisualizer isSpeaking={isSpeaking} isPlaying={isPlaying} audioLevel={audioLevel} />

        {/* Audio Input Controller */}
        {mode === "vad" ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <div
              className={`flex items-center gap-2.5 px-6 py-3 rounded-full border text-xs font-bold tracking-wide transition-all duration-200 ${
                isSpeaking
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.8)] scale-105"
                  : isPlaying
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "glass-pill text-slate-300 border-white/10"
              }`}
            >
              <Mic className={`w-4 h-4 ${isSpeaking ? "animate-bounce text-slate-950" : "text-cyan-400"}`} />
              <span>
                {isPlaying
                  ? "Partner Speaking (Echo-Guard)"
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
              className={`w-full max-w-sm py-4 px-6 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-3 transition-all select-none shadow-2xl active:scale-95 ${
                isPlaying
                  ? "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
                  : isSpeaking
                  ? "bg-gradient-to-r from-rose-500 via-red-500 to-pink-500 text-white shadow-rose-500/50 scale-[1.02] ring-4 ring-rose-500/30"
                  : "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 shadow-cyan-500/25"
              }`}
            >
              <Mic className={`w-5 h-5 ${isSpeaking ? "animate-pulse" : "text-slate-950"}`} />
              <span>
                {isPlaying
                  ? "Echo-Guard Active"
                  : isSpeaking
                  ? "Release to Send"
                  : "Hold to Talk"}
              </span>
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              Hold while speaking • Release to translate
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
