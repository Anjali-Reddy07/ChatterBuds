"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Headphones,
  RefreshCw,
  Copy,
  Check,
  Share2,
  Globe2,
  Settings2,
  ArrowRight,
  ShieldCheck,
  Radio,
  Zap,
  Sparkles,
  Wifi,
} from "lucide-react";

export const AVAILABLE_LANGUAGES = [
  { code: "Auto-Detect", name: "Auto-Detect", native: "✨ Whisper AI", flag: "🌐" },
  { code: "English", name: "English", native: "English", flag: "🇺🇸" },
  { code: "Telugu", name: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
  { code: "Hindi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "Odia", name: "Odia", native: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  { code: "Tamil", name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "Kannada", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "Malayalam", name: "Malayalam", native: "മലയാളം", flag: "🇮🇳" },
  { code: "Bengali", name: "Bengali", native: "বাংলা", flag: "🇮🇳" },
  { code: "Marathi", name: "Marathi", native: "मराठी", flag: "🇮🇳" },
  { code: "Gujarati", name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳" },
  { code: "Spanish", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "French", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "German", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "Japanese", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "Korean", name: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "Chinese", name: "Chinese (Mandarin)", native: "中文", flag: "🇨🇳" },
  { code: "Arabic", name: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "Russian", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "Portuguese", name: "Portuguese", native: "Português", flag: "🇧🇷" },
];

interface RoomSetupProps {
  roomCode: string;
  onSetRoomCode: (code: string) => void;
  selectedLang: string;
  onSelectLang: (lang: string) => void;
  wsUrl: string;
  onSetWsUrl: (url: string) => void;
  onJoinRoom: () => void;
}

export function RoomSetup({
  roomCode,
  onSetRoomCode,
  selectedLang,
  onSelectLang,
  wsUrl,
  onSetWsUrl,
  onJoinRoom,
}: RoomSetupProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isRotating, setIsRotating] = useState(false);

  const generateRandomCode = () => {
    setIsRotating(true);
    const num = Math.floor(1000 + Math.random() * 9000).toString();
    onSetRoomCode(num);
    setTimeout(() => setIsRotating(false), 500);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setShareUrl(`${origin}/?room=${roomCode}`);
    }
  }, [roomCode]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join ChatterBuds Live Voice Room",
          text: `Join my live two-way voice translation session on ChatterBuds! Room code: ${roomCode}`,
          url: shareUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const currentLangObj = AVAILABLE_LANGUAGES.find((l) => l.code === selectedLang) || AVAILABLE_LANGUAGES[0];

  return (
    <div className="flex flex-col gap-5 py-2 animate-in fade-in duration-300">
      {/* Top Header & Branding */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-500 p-[1.5px] shadow-lg shadow-cyan-500/25 transition-transform duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center backdrop-blur-sm">
                <Headphones className="w-5 h-5 text-cyan-400 animate-pulse-slow" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-ping-slow" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                ChatterBuds
              </h1>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                Live AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Real-time two-way Bluetooth earbud translator</p>
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
            showAdvanced
              ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
              : "glass-pill text-slate-400 hover:text-white hover:border-slate-600"
          }`}
          title="Server Connection Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Advanced Server Configuration Drawer */}
      {showAdvanced && (
        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/30 flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              WebSocket Engine Endpoint
            </label>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
              WSS Active
            </span>
          </div>
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => onSetWsUrl(e.target.value)}
            placeholder="ws://localhost:8000/ws"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400 transition"
          />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Connects to your local or cloud Groq voice interpreter backend.
          </p>
        </div>
      )}

      {/* Language Selection Card */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            Your Spoken Language
          </label>
          <span className="text-xs text-slate-400 font-medium">
            {currentLangObj.flag} {currentLangObj.native}
          </span>
        </div>

        <div className="relative">
          <select
            value={selectedLang}
            onChange={(e) => onSelectLang(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 hover:border-slate-600 text-white text-sm rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:border-cyan-400 transition shadow-inner font-semibold cursor-pointer"
          >
            {AVAILABLE_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-900 text-white py-1">
                {lang.flag} {lang.name} — {lang.native}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
            <span className="text-xs">▼</span>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
          <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
          <span>Whisper Large v3 Turbo auto-detects spoken dialect & nuance.</span>
        </div>
      </div>

      {/* Room Code & Instant Pairing Card */}
      <div className="p-5 rounded-2xl glass-panel border border-white/10 shadow-xl flex flex-col items-center gap-4 text-center relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Room Header Strip */}
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
          <div className="text-left">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Room Code
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-3xl font-black tracking-[0.2em] text-cyan-400 font-mono drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                {roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition active:scale-90"
                title="Copy Room Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              </button>
            </div>
          </div>

          <button
            onClick={generateRandomCode}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl glass-pill text-slate-300 hover:text-white hover:border-slate-500 transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? "animate-spin" : ""}`} />
            New Code
          </button>
        </div>

        {/* QR Code Frame */}
        <div className="relative group p-3 bg-white rounded-2xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]">
          <div className="absolute -inset-1 rounded-[18px] bg-gradient-to-tr from-cyan-500 via-transparent to-purple-500 opacity-30 blur-sm pointer-events-none" />
          {shareUrl ? (
            <QRCodeSVG
              value={shareUrl}
              size={160}
              level="H"
              includeMargin={false}
              fgColor="#05070e"
            />
          ) : (
            <div className="w-40 h-40 bg-slate-200 animate-pulse rounded-lg" />
          )}
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs font-semibold text-slate-200">Point Partner Phone Camera to Scan</span>
          <span className="text-[11px] text-slate-400">Connects instantly without manual typing</span>
        </div>

        {/* Sharing Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl glass-pill hover:border-cyan-500/50 text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
            {copiedLink ? "Link Copied!" : "Copy Link"}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl glass-pill hover:border-purple-500/50 text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            <Share2 className="w-4 h-4 text-purple-400" />
            Share Remote
          </button>
        </div>
      </div>

      {/* Bluetooth Earbuds Isolation Advice Card */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-500/20 text-slate-300 text-xs shadow-sm">
        <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <span className="font-semibold text-white block">Earbud Acoustic Isolation Ready</span>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            Put in paired Bluetooth earbuds for stereo translated audio. Built-in <strong>Echo-Guard</strong> prevents microphone feedback while receiving partner speech.
          </p>
        </div>
      </div>

      {/* Enter Room CTA Button */}
      <button
        onClick={onJoinRoom}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-500/25 transition-all duration-200 active:scale-[0.98] group"
      >
        <span>Enter Room & Start Translating</span>
        <ArrowRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );
}
