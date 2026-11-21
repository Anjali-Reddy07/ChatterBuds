"use client";

import React, { useState, useEffect } from "react";
import { PhoneCall, Delete, Globe2, Sparkles, ShieldCheck, Users, Loader2 } from "lucide-react";

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
  onCall: (fullPhoneNumber: string, resolvedName?: string) => void;
  partnerLangName?: string;
  isCalling?: boolean;
}

export function DialPad({ onCall, partnerLangName, isCalling }: DialPadProps) {
  const [selectedCountry, setSelectedCountry] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [resolvedCallerName, setResolvedCallerName] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [hasContactPicker, setHasContactPicker] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "contacts" in navigator && "select" in (navigator as any).contacts) {
      setHasContactPicker(true);
    }
  }, []);

  // Automatic Truecaller / Caller-ID Lookup when 10+ digits are entered
  useEffect(() => {
    const rawDigits = phoneNumber.trim().replace(/\D/g, "");
    if (rawDigits.length >= 10) {
      const full = `${selectedCountry}${rawDigits}`;
      let active = true;
      setIsLookingUp(true);

      fetch(`/api/caller-id/${encodeURIComponent(full)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!active) return;
          if (data && data.found && data.name) {
            setResolvedCallerName(data.name);
          } else {
            setResolvedCallerName(null);
          }
        })
        .catch(() => {
          if (active) setResolvedCallerName(null);
        })
        .finally(() => {
          if (active) setIsLookingUp(false);
        });

      return () => {
        active = false;
      };
    } else {
      setResolvedCallerName(null);
      setIsLookingUp(false);
    }
  }, [phoneNumber, selectedCountry]);

  // Mobile Chrome Contact Picker API integration
  const handlePickContact = async () => {
    if (typeof navigator !== "undefined" && "contacts" in navigator && "select" in (navigator as any).contacts) {
      try {
        const contacts = await (navigator as any).contacts.select(["name", "tel"], { multiple: false });
        if (contacts && contacts[0]) {
          const c = contacts[0];
          const name = c.name ? c.name[0] : "";
          const tel = c.tel ? c.tel[0] : "";
          if (name) setResolvedCallerName(name);
          if (tel) {
            const cleanDigits = tel.replace(/\D/g, "");
            if (cleanDigits.length > 10) {
              setPhoneNumber(cleanDigits.slice(-10));
            } else {
              setPhoneNumber(cleanDigits);
            }
          }
        }
      } catch (err) {
        console.warn("Contact picker cancelled or not supported:", err);
      }
    }
  };

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
    setResolvedCallerName(null);
  };

  const playKeyClickTone = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      onCall(full, resolvedCallerName || undefined);
    }
  };

  const isValidNumber = phoneNumber.trim().replace(/\D/g, "").length >= 4;

  return (
    <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-200">
      {/* Resolved Caller ID Badge */}
      {(resolvedCallerName || isLookingUp) && (
        <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-300 animate-in fade-in slide-in-from-top-1 shadow-lg shadow-cyan-950/30">
          <div className="flex items-center gap-2 truncate">
            {isLookingUp ? (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <div className="flex flex-col truncate">
              <span className="font-bold text-white text-xs truncate">
                {isLookingUp ? "Resolving Caller ID..." : resolvedCallerName}
              </span>
              {!isLookingUp && (
                <span className="text-[10px] text-cyan-300/80 font-medium">
                  Registered Caller ID
                </span>
              )}
            </div>
          </div>
          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 shrink-0">
            Verified
          </span>
        </div>
      )}

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

        {/* Device Contact Picker Button */}
        {hasContactPicker && (
          <button
            type="button"
            onClick={handlePickContact}
            className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1"
            title="Pick from contacts"
          >
            <Users className="w-4 h-4" />
          </button>
        )}

        {/* Backspace */}
        {phoneNumber.length > 0 && (
          <button
            type="button"
            onClick={handleBackspace}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Numeric Keypad Grid */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs pt-1">
        {DIAL_KEYS.map((k) => (
          <button
            key={k.digit}
            type="button"
            onClick={() => handleKeyPress(k.digit)}
            className="h-13 py-2 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 active:bg-cyan-500/20 border border-slate-800 hover:border-slate-700 active:border-cyan-500/50 flex flex-col items-center justify-center transition-all duration-150 active:scale-95 shadow-md shadow-black/40 group"
          >
            <span className="text-xl font-bold font-mono text-slate-100 group-hover:text-cyan-300">
              {k.digit}
            </span>
            {k.sub && (
              <span className="text-[9px] font-semibold text-slate-500 group-hover:text-slate-400 tracking-widest">
                {k.sub}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Call Button */}
      <button
        type="button"
        disabled={!isValidNumber || isCalling}
        onClick={handleCallClick}
        className={`w-full max-w-xs py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-95 shadow-xl ${
          isValidNumber
            ? "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/30 cursor-pointer"
            : "bg-slate-900/60 text-slate-600 border border-slate-800 cursor-not-allowed"
        }`}
      >
        <PhoneCall className={`w-4 h-4 ${isValidNumber ? "text-slate-950 animate-pulse" : ""}`} />
        <span>
          {isCalling
            ? "Connecting..."
            : resolvedCallerName
            ? `Call ${resolvedCallerName} & Translate`
            : "Call & Translate Live"}
        </span>
      </button>
    </div>
  );
}
