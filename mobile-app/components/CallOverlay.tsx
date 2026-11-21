"use client";

import React, { useState } from "react";
import {
  PhoneCall,
  PhoneOff,
  Radio,
  Share2,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  Volume2,
  X,
  ExternalLink,
} from "lucide-react";
import { ActiveCallInfo, OfflineNoticeInfo, CallState } from "@/hooks/useCallSignaling";

interface CallOverlayProps {
  callState: CallState;
  activeCall: ActiveCallInfo | null;
  offlineNotice: OfflineNoticeInfo | null;
  myLang: string;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onClearOfflineNotice: () => void;
}

export function CallOverlay({
  callState,
  activeCall,
  offlineNotice,
  myLang,
  onAccept,
  onReject,
  onCancel,
  onClearOfflineNotice,
}: CallOverlayProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. INCOMING CALL MODAL OVERLAY
  if (callState === "incoming" && activeCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
        <div className="w-full max-w-sm p-6 rounded-3xl glass-panel border border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col items-center gap-5 text-center text-slate-100">
          {/* Pulsing Phone Icon */}
          <div className="relative mt-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
              <PhoneCall className="w-9 h-9 text-slate-950 animate-bounce" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping-slow pointer-events-none" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Incoming Translation Call
            </span>
            <h2 className="text-xl font-black font-mono tracking-wider text-white">
              {activeCall.partnerPhone}
            </h2>
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 mx-auto mt-1">
              <span>Caller speaks:</span>
              <strong className="text-cyan-300">{activeCall.partnerLang || "Foreign Language"}</strong>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-300 leading-relaxed">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 inline mr-1" />
            Put in paired Bluetooth earbuds. Accepting joins live two-way translation in room{" "}
            <strong className="text-cyan-300">#{activeCall.roomId}</strong>.
          </div>

          {/* Action Buttons: Accept / Decline */}
          <div className="grid grid-cols-2 gap-3 w-full pt-2">
            <button
              onClick={onReject}
              type="button"
              className="py-3.5 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
            >
              <PhoneOff className="w-4 h-4 text-rose-400" />
              <span>Decline</span>
            </button>

            <button
              onClick={onAccept}
              type="button"
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <PhoneCall className="w-4 h-4 text-slate-950" />
              <span>Accept &amp; Talk</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. OUTGOING CALL OVERLAY (Calling or Ringing)
  if ((callState === "calling" || callState === "ringing") && activeCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
        <div className="w-full max-w-sm p-6 rounded-3xl glass-panel border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col items-center gap-5 text-center text-slate-100">
          {/* Calling Animation */}
          <div className="relative mt-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-pulse">
              <Radio className="w-9 h-9 text-white animate-spin-slow" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping-slow pointer-events-none" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-widest uppercase text-cyan-400">
              {callState === "ringing" ? "Ringing Partner's Phone..." : "Connecting Voice Engine..."}
            </span>
            <h2 className="text-xl font-black font-mono tracking-wider text-white">
              {activeCall.partnerPhone}
            </h2>
            <p className="text-xs text-slate-400">
              Room #{activeCall.roomId} • Live translation ({myLang})
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-300 leading-relaxed">
            Your Bluetooth microphone will automatically begin translating once your partner accepts.
          </div>

          <button
            onClick={onCancel}
            type="button"
            className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
          >
            <PhoneOff className="w-4 h-4 text-rose-400" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. OFFLINE NOTICE / INSTANT INVITE OVERLAY
  if (offlineNotice) {
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(offlineNotice.smsInvite);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (e) {
        // ignore
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
        <div className="w-full max-w-sm p-5 rounded-3xl glass-panel border border-amber-500/40 shadow-2xl flex flex-col gap-4 text-slate-100">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <PhoneOff className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Partner is Offline</h3>
            </div>
            <button
              onClick={onClearOfflineNotice}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 text-xs text-slate-300 leading-relaxed">
            <p>
              <strong className="text-white font-mono">{offlineNotice.toPhone}</strong> is not currently online in ChatterBuds.
            </p>
            <p className="text-[11px] text-slate-400">
              Send them an instant invite link so they can open the app and connect to your live voice call:
            </p>
          </div>

          {/* Action Buttons: WhatsApp & SMS */}
          <div className="flex flex-col gap-2 pt-1">
            {offlineNotice.whatsappLink && (
              <a
                href={offlineNotice.whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-[0.98]"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                <span>Invite via WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
              </a>
            )}

            <button
              onClick={() => {
                const cleanPhone = offlineNotice.toPhone.replace(/[^\d+]/g, "");
                window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(offlineNotice.smsInvite)}`;
              }}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl glass-pill hover:border-cyan-500/40 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Send SMS Invite</span>
            </button>

            <button
              onClick={handleCopy}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl glass-pill hover:border-purple-500/40 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
              <span>{copiedLink ? "Invite Copied to Clipboard!" : "Copy Invite Link"}</span>
            </button>
          </div>

          <button
            onClick={onClearOfflineNotice}
            className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
}
