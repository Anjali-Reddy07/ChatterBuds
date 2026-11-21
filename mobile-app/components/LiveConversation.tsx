"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Headphones,
  Check,
  Copy,
  ChevronDown,
  Globe,
  ShieldCheck,
  User,
} from "lucide-react";
import { AVAILABLE_LANGUAGES } from "./RoomSetup";
import { AudioVisualizer } from "./AudioVisualizer";

interface LiveConversationProps {
  roomCode: string;
  myLang: string;
  onSelectMyLang: (lang: string) => void;
  partnerConnected: boolean;
  partnerLang: string | null;
  partnerPhone?: string;
  partnerName?: string;
  onLeaveRoom: () => void;
  // Audio state
  isRecording: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  isPlaying: boolean; // True when synthesized audio is streaming into user's earbuds (Echo-Guard)
  callStatus?: "connecting" | "connected" | "speaking" | "translating";
  isConnected: boolean;
  isWakingServer?: boolean;
  wakeAttempt?: number;
  onOpenSettings?: () => void;
}

export function LiveConversation({
  roomCode,
  myLang,
  onSelectMyLang,
  partnerConnected,
  partnerLang,
  partnerPhone,
  partnerName,
  onLeaveRoom,
  isRecording,
  isSpeaking,
  audioLevel,
  isPlaying,
  callStatus = "connecting",
  isConnected,
  isWakingServer,
  wakeAttempt = 0,
}: LiveConversationProps) {
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Live Call Duration Timer (00:42)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isConnected && partnerConnected) {
      timer = setInterval(() => {
        setCallDurationSec((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isConnected, partnerConnected]);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/?room=${roomCode}`;
      await navigator.clipboard.writeText(url);
      setCopiedRoom(true);
      setTimeout(() => setCopiedRoom(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  // Live status subtitle
  const getStatusDisplay = () => {
    if (isPlaying) {
      return {
        text: "Translating to your earbuds...",
        pillClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        pulse: true,
      };
    }
    if (isSpeaking) {
      return {
        text: "Speaking... (Auto-translating)",
        pillClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        pulse: true,
      };
    }
    if (!partnerConnected) {
      return {
        text: "Waiting for partner to answer...",
        pillClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        pulse: true,
      };
    }
    return {
      text: "Connected • Live Voice Translation",
      pillClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      pulse: false,
    };
  };

  const statusInfo = getStatusDisplay();
  const displayName = partnerName || partnerPhone || `Room #${roomCode}`;
  const displayPhone = partnerPhone || `Room Code #${roomCode}`;

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] justify-between pb-6 pt-4 px-4 bg-gradient-to-b from-[#060913] via-[#090d1c] to-[#04060c] text-slate-100 select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="flex items-center justify-between z-20">
        {/* Room Code Badge */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 transition active:scale-95 shadow-md"
          title="Copy invite link"
        >
          <span>#{roomCode}</span>
          {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
        </button>

        {/* User's Selected Language Selector Badge */}
        <div className="relative">
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-xs font-semibold text-white hover:border-cyan-400 transition shadow-lg active:scale-95"
            title="Change your listening language"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hear In: <strong className="text-cyan-300">{myLang}</strong></span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-1.5 flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Your Preferred Language
              </span>
              {AVAILABLE_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    onSelectMyLang(l.name);
                    setIsLangDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition ${
                    myLang === l.name
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold"
                      : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span>{l.flag} {l.name}</span>
                  {myLang === l.name && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Center Caller Profile & Audio Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 z-10 my-auto">
        {/* Large Phone Avatar with Pulsing Audio Ring */}
        <div className="relative">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-2xl relative ${
              isPlaying
                ? "bg-gradient-to-tr from-emerald-500/30 to-teal-500/20 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.4)] scale-105"
                : isSpeaking
                ? "bg-gradient-to-tr from-cyan-500/30 to-blue-500/20 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.45)] scale-105"
                : "bg-slate-900/80 border-white/10"
            }`}
          >
            {partnerName ? (
              <span className="text-4xl font-black text-white font-mono">
                {partnerName.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <User className="w-14 h-14 text-cyan-300/80" />
            )}
          </div>

          {/* Glowing Animated Breathing Ring */}
          <div
            className={`absolute -inset-4 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 ${
              isPlaying
                ? "bg-emerald-500/30 opacity-100 animate-pulse"
                : isSpeaking
                ? "bg-cyan-500/35 opacity-100 animate-pulse"
                : "bg-cyan-500/10 opacity-30"
            }`}
          />
        </div>

        {/* Resolved Caller Name & Number */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black tracking-tight text-white font-mono">
              {displayName}
            </h1>
            {partnerName && (
              <span className="p-1 rounded-full bg-cyan-500/20 text-cyan-300" title="Verified Truecaller Profile">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </span>
            )}
          </div>

          <p className="text-sm text-slate-400 font-mono tracking-wide">
            {displayPhone}
          </p>

          {/* Connection & Live Call Duration */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${statusInfo.pillClass}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  statusInfo.pulse ? "bg-cyan-400 animate-ping-slow" : "bg-emerald-400"
                }`}
              />
              <span>{statusInfo.text}</span>
            </span>

            {partnerConnected && (
              <span className="px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/10 text-xs font-mono font-bold text-slate-300">
                {formatDuration(callDurationSec)}
              </span>
            )}
          </div>
        </div>

        {/* Live Audio Waveform Visualizer */}
        <div className="w-full max-w-xs h-14 flex items-center justify-center">
          <AudioVisualizer
            isSpeaking={isSpeaking}
            isPlaying={isPlaying}
            audioLevel={isPlaying ? 0.75 : audioLevel}
          />
        </div>

        {/* Echo-Guard & Auto-Listen Notice */}
        <div className="px-3.5 py-1.5 rounded-full bg-slate-950/60 border border-white/5 text-[11px] text-slate-400 flex items-center gap-1.5 backdrop-blur-md">
          {isPlaying ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              Echo-Guard: Mic auto-paused while translation plays
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5 text-cyan-400" />
              Auto-Listen Active • Speak naturally without holding buttons
            </span>
          )}
        </div>
      </div>

      {/* Bottom Phone Call Control Dock (Mute, Speaker, End Call) */}
      <footer className="w-full max-w-xs mx-auto flex items-center justify-around z-20 pt-2">
        {/* Mute Mic Button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`flex flex-col items-center gap-1.5 group transition active:scale-95`}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center border transition shadow-lg ${
              isMuted
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                : "bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {isMuted ? "Unmute" : "Mute"}
          </span>
        </button>

        {/* Red End Call Button */}
        <button
          onClick={onLeaveRoom}
          className="flex flex-col items-center gap-1.5 transition active:scale-95"
          title="End Call"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 flex items-center justify-center shadow-xl shadow-rose-600/40 text-white transition">
            <PhoneOff className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
            End
          </span>
        </button>

        {/* Speaker / Earbuds Toggle */}
        <button
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          className="flex flex-col items-center gap-1.5 group transition active:scale-95"
          title={isSpeakerOn ? "Speaker Output" : "Earbuds Output"}
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center border transition shadow-lg ${
              isSpeakerOn
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                : "bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500"
            }`}
          >
            {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {isSpeakerOn ? "Speaker" : "Earbuds"}
          </span>
        </button>
      </footer>
    </div>
  );
}
