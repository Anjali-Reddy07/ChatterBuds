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
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Smartphone,
  PhoneCall,
  QrCode,
  Link2,
} from "lucide-react";
import { ConversationMode } from "@/hooks/useAudioRecorder";
import { DialPad, COUNTRY_CODES } from "./DialPad";

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
  conversationMode: ConversationMode;
  onSelectConversationMode: (mode: ConversationMode) => void;
  myPhone: string;
  onSetMyPhone: (phone: string) => void;
  isPresenceConnected?: boolean;
  onCallPhone?: (targetPhone: string) => void;
  isCalling?: boolean;
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
  conversationMode,
  onSelectConversationMode,
  myPhone,
  onSetMyPhone,
  isPresenceConnected,
  onCallPhone,
  isCalling,
  wsUrl,
  onSetWsUrl,
  onJoinRoom,
  onOpenSettings,
}: RoomSetupProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRemoteQr, setShowRemoteQr] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isRotating, setIsRotating] = useState(false);
  const [pairingTab, setPairingTab] = useState<"dialer" | "qr" | "link">("dialer");

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

  return (
    <div className="flex flex-col gap-3.5 py-1 animate-in fade-in duration-300">
      {/* Brand Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-500 p-[1.5px] shadow-lg shadow-cyan-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Headphones className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-ping-slow" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight text-white">ChatterBuds</h1>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                Live Voice
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Real-time two-way Bluetooth voice translator</p>
          </div>
        </div>

        <button
          onClick={() => {
            if (onOpenSettings) onOpenSettings();
            else setShowAdvanced(!showAdvanced);
          }}
          className="p-2 rounded-xl glass-pill text-slate-400 hover:text-white transition-all active:scale-95"
          title="Server Connection Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Advanced Server Configuration Drawer (Collapsible) */}
      {showAdvanced && (
        <div className="p-3.5 rounded-2xl glass-panel border border-cyan-500/30 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Backend WebSocket Endpoint
            </label>
          </div>
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => onSetWsUrl(e.target.value)}
            placeholder="wss://chatterbuds-api.onrender.com/ws"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400 transition"
          />
        </div>
      )}

      {/* CONVERSATION MODE SELECTOR (Above Step 1) */}
      <div className="p-2.5 rounded-2xl glass-panel border border-white/10 shadow-lg flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
          <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
          Select Conversation Mode
        </span>

        <div className="grid grid-cols-2 gap-2">
          {/* Mode 1: In-Person */}
          <button
            onClick={() => onSelectConversationMode("in-person")}
            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
              conversationMode === "in-person"
                ? "bg-gradient-to-br from-cyan-950/70 to-slate-900 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/40"
                : "bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className={`w-3.5 h-3.5 ${conversationMode === "in-person" ? "text-cyan-400" : "text-slate-400"}`} />
                <span className={`text-xs font-bold ${conversationMode === "in-person" ? "text-white" : "text-slate-300"}`}>
                  In-Person
                </span>
              </div>
              {conversationMode === "in-person" && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Sitting together • QR pair &amp; tight noise gate
            </p>
          </button>

          {/* Mode 2: Long-Distance */}
          <button
            onClick={() => onSelectConversationMode("remote")}
            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
              conversationMode === "remote"
                ? "bg-gradient-to-br from-purple-950/70 to-slate-900 border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.25)] ring-1 ring-purple-400/40"
                : "bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Globe2 className={`w-3.5 h-3.5 ${conversationMode === "remote" ? "text-purple-400" : "text-slate-400"}`} />
                <span className={`text-xs font-bold ${conversationMode === "remote" ? "text-white" : "text-slate-300"}`}>
                  Long-Distance
                </span>
              </div>
              {conversationMode === "remote" && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Different places • Share link &amp; continuous flow
            </p>
          </button>
        </div>
      </div>

      {/* IDENTITY: My Callable Mobile Number */}
      <div className="p-3.5 rounded-2xl glass-panel border border-white/10 shadow-lg flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              My Mobile Number (Callable ID)
            </h2>
          </div>
          {isPresenceConnected ? (
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Callable Online
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">
              Enter number to be called
            </span>
          )}
        </div>

        <input
          type="tel"
          value={myPhone}
          onChange={(e) => onSetMyPhone(e.target.value)}
          placeholder="+91 98765 43210"
          className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 transition"
        />
        <p className="text-[10px] text-slate-400 leading-tight">
          Enables your partner to call and translate into your earbuds directly by dialing your phone number.
        </p>
      </div>

      {/* STEP 1: Choose Your Language */}
      <div className="p-3.5 rounded-2xl glass-panel border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold text-[11px] flex items-center justify-center shrink-0">
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
            className="w-full bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 text-white text-xs rounded-xl px-3.5 py-3 appearance-none focus:outline-none focus:border-cyan-400 transition font-semibold cursor-pointer"
          >
            {AVAILABLE_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-900 text-white py-1">
                {lang.flag} {lang.name} ({lang.native})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
            <span className="text-[10px]">▼</span>
          </div>
        </div>
      </div>

      {/* STEP 2: Pair Partner's Phone (Dial by Number, Scan QR, or Share Link) */}
      <div className="p-3.5 rounded-2xl glass-panel border border-white/10 shadow-lg flex flex-col items-center gap-3 text-center">
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-400 font-bold text-[11px] flex items-center justify-center shrink-0">
              2
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Step 2: Connect Partner
            </h2>
          </div>

          <button
            onClick={generateRandomCode}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg glass-pill text-slate-300 hover:text-white transition active:scale-95"
            title="Generate New Room Code"
          >
            <RefreshCw className={`w-3 h-3 ${isRotating ? "animate-spin" : ""}`} />
            New
          </button>
        </div>

        {/* 3-Tab Segmented Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl w-full">
          <button
            type="button"
            onClick={() => setPairingTab("dialer")}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              pairingTab === "dialer"
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <PhoneCall className="w-3 h-3" />
            <span>Dial Pad</span>
          </button>

          <button
            type="button"
            onClick={() => setPairingTab("qr")}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              pairingTab === "qr"
                ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <QrCode className="w-3 h-3" />
            <span>Scan QR</span>
          </button>

          <button
            type="button"
            onClick={() => setPairingTab("link")}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              pairingTab === "link"
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Link2 className="w-3 h-3" />
            <span>Share Link</span>
          </button>
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-base font-black tracking-[0.2em] text-cyan-400 font-mono">
            #{roomCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition active:scale-90"
            title="Copy Code"
          >
            {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {/* TAB 1: DIAL PAD */}
        {pairingTab === "dialer" && (
          <div className="w-full pt-1">
            <DialPad
              onCall={(to) => {
                if (onCallPhone) onCallPhone(to);
              }}
              partnerLangName={selectedLang}
              isCalling={isCalling}
            />
          </div>
        )}

        {/* TAB 2: QR CODE */}
        {pairingTab === "qr" && (
          <div className="flex flex-col items-center gap-2.5 w-full py-1 animate-in fade-in duration-200">
            <div className="p-2.5 bg-white rounded-2xl shadow-xl">
              {shareUrl ? (
                <QRCodeSVG value={shareUrl} size={135} level="H" includeMargin={false} fgColor="#05070e" />
              ) : (
                <div className="w-32 h-32 bg-slate-200 animate-pulse rounded-lg" />
              )}
            </div>
            <span className="text-[11px] font-medium text-slate-300">
              Point partner&apos;s phone camera here to pair
            </span>

            <div className="grid grid-cols-2 gap-2 w-full pt-1">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl glass-pill text-xs font-semibold text-slate-200 hover:text-white transition active:scale-95"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                {copiedLink ? "Copied" : "Copy Link"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl glass-pill text-xs font-semibold text-slate-200 hover:text-white transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-400" />
                Share
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SHARE LINK */}
        {pairingTab === "link" && (
          <div className="flex flex-col items-center gap-2.5 w-full py-1 animate-in fade-in duration-200">
            <button
              onClick={handleShare}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:brightness-110 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>Share Invite Link (WhatsApp / Apps)</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 px-3 rounded-xl glass-pill hover:border-cyan-500/40 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedLink ? "Link Copied to Clipboard!" : "Copy Room Link"}</span>
            </button>
          </div>
        )}
      </div>

      {/* STEP 3: Connect Bluetooth Earbuds & Start */}
      <div className="p-3.5 rounded-2xl glass-panel border border-white/10 shadow-lg flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">
            3
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Step 3: Connect Bluetooth Earbuds
          </h2>
        </div>

        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-300 leading-relaxed">
            <span className="font-semibold text-emerald-400 block">
              {conversationMode === "in-person"
                ? "In-Person Noise Gate Active"
                : "Continuous Voice Flow Active"}
            </span>
            {conversationMode === "in-person"
              ? "Microphone threshold is calibrated to block partner speech across the table."
              : "Microphone pickup is optimized for effortless remote conversation."}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onJoinRoom}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-xs tracking-wide uppercase flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 transition-all active:scale-[0.98] group"
        >
          <span>Start Live Translation</span>
          <ArrowRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
