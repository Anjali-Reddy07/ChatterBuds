"use client";

import React, { useState } from "react";
import { PhoneCall, Delete, Globe2, Sparkles } from "lucide-react";

export const COUNTRY_CODES = [
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+1", label: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", label: "UK", flag: "🇬🇧" },
  { code: "+971", label: "UAE", flag: "🇦🇪" },
  { code: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "+65", label: "Singapore", flag: "🇸🇬" },
  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+81", label: "Japan", flag: "🇯🇵" },
  { code: "+82", label: "South Korea", flag: "🇰🇷" },
  { code: "+86", label: "China", flag: "🇨🇳" },
  { code: "+55", label: "Brazil", flag: "🇧🇷" },
  { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
];

const DIAL_KEYS = [
  { digit: "1", sub: "" },
  { digit: "2", sub: "ABC" },
  { digit: "3", sub: "DEF" },
  { digit: "4", sub: "GHI" },
  { digit: "5", sub: "JKL" },
  { digit: "6", sub: "MNO" },
  { digit: "7", sub: "PQRS" },
  { digit: "8", sub: "TUV" },
  { digit: "9", sub: "WXYZ" },
  { digit: "*", sub: "" },
  { digit: "0", sub: "+" },
  { digit: "#", sub: "" },
];

interface DialPadProps {
  onCall: (fullPhoneNumber: string) => void;
  partnerLangName?: string;
  isCalling?: boolean;
}

export function DialPad({ onCall, partnerLangName, isCalling }: DialPadProps) {
  const [selectedCountry, setSelectedCountry] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleKeyPress = (digit: string) => {
    if (phoneNumber.length < 15) {
      setPhoneNumber((prev) => prev + digit);
      playKeyClickTone();
    }
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneNumber("");
  };

  const playKeyClickTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // ignore
    }
  };

  const handleCallClick = () => {
    const rawDigits = phoneNumber.trim().replace(/\D/g, "");
    if (rawDigits.length >= 4) {
      const full = `${selectedCountry}${rawDigits}`;
      onCall(full);
    }
  };

  const isValidNumber = phoneNumber.trim().replace(/\D/g, "").length >= 4;

  return (
    <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-200">
      {/* Phone Number Display Input */}
      <div className="w-full flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
        {/* Country Code Selector */}
        <div className="relative">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="appearance-none bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2.5 pr-7 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code} className="bg-slate-950 text-white font-sans">
                {c.flag} {c.code} ({c.label})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <span className="text-[9px]">▼</span>
          </div>
        </div>

        {/* Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Enter mobile number"
          className="flex-1 bg-transparent border-0 px-2 py-1.5 text-base font-mono font-semibold text-white tracking-widest placeholder:text-slate-600 focus:outline-none"
        />

        {phoneNumber && (
          <button
            onClick={handleBackspace}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition active:scale-90"
            title="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Numeric Keypad Grid */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {DIAL_KEYS.map((k) => (
          <button
            key={k.digit}
            onClick={() => handleKeyPress(k.digit)}
            type="button"
            className="h-12 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 active:bg-cyan-500/20 border border-slate-800/80 hover:border-slate-700 flex flex-col items-center justify-center transition-all duration-100 active:scale-95 shadow-sm group"
          >
            <span className="text-base font-bold text-white group-hover:text-cyan-300 leading-none">
              {k.digit}
            </span>
            {k.sub && (
              <span className="text-[9px] font-semibold tracking-wider text-slate-500 group-hover:text-slate-400 mt-0.5">
                {k.sub}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Big Emerald Green Call & Translate Button */}
      <button
        onClick={handleCallClick}
        disabled={!isValidNumber || isCalling}
        className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all duration-200 active:scale-[0.98] ${
          isValidNumber
            ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25"
            : "bg-slate-800/60 text-slate-500 border border-slate-700/50 cursor-not-allowed"
        }`}
      >
        <PhoneCall className={`w-4 h-4 ${isValidNumber ? "text-slate-950 animate-bounce" : "text-slate-500"}`} />
        <span>{isCalling ? "Calling..." : "Call & Translate"}</span>
      </button>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
        <span>Rings partner&apos;s phone with live incoming translation call</span>
      </div>
    </div>
  );
}
