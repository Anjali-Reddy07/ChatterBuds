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
} from "lucide-react";

export const AVAILABLE_LANGUAGES = [
  { code: "Auto-Detect", name: "Auto-Detect (Whisper AI)", native: "✨ Auto" },
  { code: "English", name: "English", native: "English" },
  { code: "Telugu", name: "Telugu", native: "తెలుగు" },
  { code: "Hindi", name: "Hindi", native: "हिन्दी" },
  { code: "Odia", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "Tamil", name: "Tamil", native: "தமிழ்" },
  { code: "Kannada", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "Malayalam", name: "Malayalam", native: "മലയാളം" },
  { code: "Bengali", name: "Bengali", native: "বাংলা" },
  { code: "Marathi", name: "Marathi", native: "मराठी" },
  { code: "Gujarati", name: "Gujarati", native: "ગુજરાતી" },
  { code: "Spanish", name: "Spanish", native: "Español" },
  { code: "French", name: "French", native: "Français" },
  { code: "German", name: "German", native: "Deutsch" },
  { code: "Japanese", name: "Japanese", native: "日本語" },
  { code: "Korean", name: "Korean", native: "한국어" },
  { code: "Chinese", name: "Chinese (Mandarin)", native: "中文" },
  { code: "Arabic", name: "Arabic", native: "العربية" },
  { code: "Russian", name: "Russian", native: "Русский" },
  { code: "Portuguese", name: "Portuguese", native: "Português" },
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
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const generateRandomCode = () => {
    const num = Math.floor(1000 + Math.random() * 9000).toString();
    onSetRoomCode(num);
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join ChatterBuds Voice Room",
          text: `Join my live voice translation session on ChatterBuds! Room code: ${roomCode}`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled share or not supported
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent-emerald flex items-center justify-center shadow-lg shadow-primary/20">
            <Headphones className="w-5 h-5 text-surface" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              ChatterBuds
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                Live
              </span>
            </h1>
            <p className="text-xs text-slate-400">Two-way Bluetooth voice interpreter</p>
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="p-2 rounded-lg bg-surface border border-surface-border text-slate-400 hover:text-white transition-colors"
          title="Server Connection Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Advanced Server Configuration */}
      {showAdvanced && (
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border flex flex-col gap-2 animate-in slide-in-from-top-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-primary" />
            WebSocket Server URL
          </label>
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => onSetWsUrl(e.target.value)}
            placeholder="ws://localhost:8000/ws"
            className="w-full bg-background border border-surface-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-primary transition"
          />
          <p className="text-[11px] text-slate-400">
            Default: <code className="text-primary">ws://localhost:8000/ws</code>. For remote mobile testing, use your HTTPS/WSS tunnel.
          </p>
        </div>
      )}

      {/* Language Selection Card */}
      <div className="p-4 rounded-2xl bg-surface border border-surface-border shadow-sm flex flex-col gap-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-primary" />
          Your Spoken Language
        </label>
        <div className="relative">
          <select
            value={selectedLang}
            onChange={(e) => onSelectLang(e.target.value)}
            className="w-full bg-background border border-surface-border text-white text-sm rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-primary transition shadow-inner font-medium cursor-pointer"
          >
            {AVAILABLE_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-surface text-white">
                {lang.name} ({lang.native})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
            ▼
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Translate incoming voice automatically into your selected language.
        </p>
      </div>

      {/* Room Code & QR Card */}
      <div className="p-5 rounded-2xl bg-surface border border-surface-border shadow-md flex flex-col items-center gap-4 text-center">
        <div className="w-full flex items-center justify-between border-b border-surface-border/60 pb-3">
          <div className="text-left">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Room Code
            </span>
            <div className="text-2xl font-black tracking-widest text-primary font-mono mt-0.5">
              {roomCode}
            </div>
          </div>
          <button
            onClick={generateRandomCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-card border border-surface-border text-slate-300 hover:text-white hover:border-slate-500 transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            New Code
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-3.5 bg-white rounded-2xl shadow-xl flex items-center justify-center">
          {shareUrl ? (
            <QRCodeSVG
              value={shareUrl}
              size={168}
              level="H"
              includeMargin={false}
              fgColor="#080b11"
            />
          ) : (
            <div className="w-40 h-40 bg-slate-200 animate-pulse rounded-lg" />
          )}
        </div>

        <p className="text-xs text-slate-300">
          Have your partner scan this code with their phone camera to pair instantly.
        </p>

        {/* Remote Sharing Actions */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-surface-card border border-surface-border hover:border-primary/50 text-xs font-medium text-slate-200 hover:text-white transition active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-accent-emerald" /> : <Copy className="w-4 h-4 text-primary" />}
            {copied ? "Link Copied!" : "Copy Invite"}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-surface-card border border-surface-border hover:border-accent-emerald/50 text-xs font-medium text-slate-200 hover:text-white transition active:scale-95"
          >
            <Share2 className="w-4 h-4 text-accent-emerald" />
            Share Link
          </button>
        </div>
      </div>

      {/* Earbuds Tip Badge */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-slate-300 text-xs">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-primary block">Earbuds Recommended</span>
          Put in your Bluetooth earbuds for hands-free stereo audio and automatic Echo-Guard acoustic isolation.
        </div>
      </div>

      {/* Enter Room CTA */}
      <button
        onClick={onJoinRoom}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary via-cyan-500 to-accent-emerald hover:brightness-110 font-bold text-base text-surface flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
      >
        <span>Enter Room & Start Translating</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
