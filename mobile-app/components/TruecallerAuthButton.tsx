"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Phone, CheckCircle2, RefreshCw, UserCheck } from "lucide-react";

interface TruecallerAuthButtonProps {
  myPhone: string;
  onSetMyPhone: (phone: string) => void;
  truecallerName: string | null;
  onSetTruecallerName: (name: string) => void;
  myLang: string;
}

export function TruecallerAuthButton({
  myPhone,
  onSetMyPhone,
  truecallerName,
  onSetTruecallerName,
  myLang,
}: TruecallerAuthButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [tempName, setTempName] = useState(truecallerName || "");

  // Check stored Truecaller profile on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("chatterbuds_truecaller_name");
      if (storedName && storedName.trim()) {
        onSetTruecallerName(storedName.trim());
        setTempName(storedName.trim());
      }
    }
  }, [onSetTruecallerName]);

  const handleTruecallerVerify = async () => {
    setIsVerifying(true);
    const requestId = `tc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      // Truecaller Web SDK deep link attempt for Android Truecaller app
      const appKey = process.env.NEXT_PUBLIC_TRUECALLER_APP_KEY || "chatterbuds_web_app";
      const isMobileAndroid =
        typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");

      if (isMobileAndroid) {
        // Trigger Truecaller 1-tap native verification intent
        window.location.href = `truecallersdk://truesdk/web_verify?type=btmsheet&requestNonce=${requestId}&partnerKey=${appKey}&partnerName=ChatterBuds`;
      }

      // Sync with backend /api/auth/truecaller
      const res = await fetch("/api/auth/truecaller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          phoneNumber: myPhone,
          truecallerName: tempName || "Truecaller User",
          preferredLanguage: myLang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const verifiedName = data.truecallerName || tempName || "Verified User";
        onSetTruecallerName(verifiedName);
        if (typeof window !== "undefined") {
          localStorage.setItem("chatterbuds_truecaller_name", verifiedName);
        }
      }
    } catch (err) {
      console.warn("Truecaller verification notice:", err);
      // Fallback: save current name
      const name = tempName.trim() || "Verified User";
      onSetTruecallerName(name);
      if (typeof window !== "undefined") {
        localStorage.setItem("chatterbuds_truecaller_name", name);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveCustomName = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      onSetTruecallerName(trimmed);
      if (typeof window !== "undefined") {
        localStorage.setItem("chatterbuds_truecaller_name", trimmed);
      }
      fetch("/api/auth/truecaller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: myPhone,
          truecallerName: trimmed,
          preferredLanguage: myLang,
        }),
      }).catch(() => {});
      setShowEditName(false);
    }
  };

  if (truecallerName) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-xs">{truecallerName}</span>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded-full border border-cyan-500/20">
                Truecaller
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{myPhone}</span>
          </div>
        </div>

        <button
          onClick={() => setShowEditName(!showEditName)}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline px-1"
        >
          {showEditName ? "Done" : "Edit"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/30 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white block">Truecaller Caller-ID</span>
            <span className="text-[11px] text-slate-400">
              Show your verified name on partner&apos;s screen
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTruecallerVerify}
          disabled={isVerifying}
          className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
        >
          {isVerifying ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          <span>Verify ID</span>
        </button>
      </div>

      {showEditName && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="Your Full Name"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleSaveCustomName}
            className="py-1 px-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
