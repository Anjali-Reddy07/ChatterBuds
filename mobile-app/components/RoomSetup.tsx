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
  Smartphone,
  Volume2,
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
  onOpenSettings?: () => void;
  isServerWaking?: boolean;
}

export function RoomSetup({
  roomCode,
  onSetRoomCode,
  selectedLang,
  onSelectLang,
  wsUrl,
  onSetWsUrl,
  onJoinRoom,
  onOpenSettings,
  isServerWaking,
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
    <div className="flex flex-col gap-4 py-2 animate-in fade-in duration-300">
      {/* Brand Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-500 p-[1.5px] shadow-lg shadow-cyan-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Headphones className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-ping-slow" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                ChatterBuds
              </h1>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                Live Voice
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Real-time two-way Bluetooth voice translator</p>
          </div>
        </div>

        <button
          onClick={() => {
            if (onOpenSettings) onOpenSettings();
            else setShowAdvanced(!showAdvanced);
          }}
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

      {/* Advanced Server Configuration Drawer (Collapsible) */}
      {showAdvanced && (
        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/30 flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              WebSocket Engine Endpoint
            </label>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
              Configurable
            </span>
          </div>
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => onSetWsUrl(e.target.value)}
            placeholder="wss://your-backend.onrender.com/ws"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400 transition"
          />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Points to your Render cloud service or localtunnel backend endpoint.
          </p>
        </div>
      )}

      {/* STEP 1: Choose Your Language */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
            1
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Step 1: Choose Your Language
          </h2>
        </div>

        <div className="relative">
          <select
            value={selectedLang}
            onChange={(e) => onSelectLang(e.target.value)}
            className="w-full bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 text-white text-sm rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:border-cyan-400 transition shadow-inner font-semibold cursor-pointer"
          >
            {AVAILABLE_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-900 text-white py-1">
                {lang.flag} {lang.name} ({lang.native})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
            <span className="text-xs">▼</span>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
          Select what you will speak. Incoming voice will be automatically translated into this language.
        </p>
      </div>

      {/* STEP 2: Pair Partner's Phone */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 shadow-lg flex flex-col items-center gap-3 text-center relative overflow-hidden">
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 font-bold text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Step 2: Pair Partner&apos;s Phone
            </h2>
          </div>

          <button
            onClick={generateRandomCode}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg glass-pill text-slate-300 hover:text-white transition active:scale-95"
            title="Generate New Room Code"
          >
            <RefreshCw className={`w-3 h-3 ${isRotating ? "animate-spin" : ""}`} />
            New Code
          </button>
        </div>

        {/* Room Code Display */}
        <div className="flex items-center justify-center gap-2 my-0.5">
          <span className="text-2xl font-black tracking-[0.25em] text-cyan-400 font-mono drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
            #{roomCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition active:scale-90"
            title="Copy Room Code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* QR Code Container */}
        <div className="relative p-2.5 bg-white rounded-2xl shadow-xl transition-transform duration-200 hover:scale-[1.01]">
          {shareUrl ? (
            <QRCodeSVG
              value={shareUrl}
              size={140}
              level="H"
              includeMargin={false}
              fgColor="#05070e"
            />
          ) : (
            <div className="w-36 h-36 bg-slate-200 animate-pulse rounded-lg" />
          )}
        </div>

        <p className="text-[11px] text-slate-300">
          Partner scans this code with their phone camera to join instantly.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl glass-pill hover:border-cyan-500/50 text-xs font-semibold text-slate-200 hover:text-white transition active:scale-95"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            {copiedLink ? "Link Copied!" : "Copy Link"}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl glass-pill hover:border-purple-500/50 text-xs font-semibold text-slate-200 hover:text-white transition active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
            Share Remote
          </button>
        </div>
      </div>

      {/* STEP 3: Connect Bluetooth Earbuds & Start */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 shadow-lg flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
            3
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Step 3: Connect Bluetooth Earbuds
          </h2>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-300 leading-relaxed">
            <span className="font-semibold text-emerald-400 block">Stereo Earbud Isolation Ready</span>
            Put in paired Bluetooth earbuds for hands-free stereo audio. <strong>Echo-Guard</strong> automatically mutes your microphone while receiving translation.
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onJoinRoom}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-500/25 transition-all duration-200 active:scale-[0.98] group"
        >
          <span>Start Live Translation</span>
          <ArrowRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
