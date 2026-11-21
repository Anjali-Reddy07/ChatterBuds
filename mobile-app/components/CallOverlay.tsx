"use client";

import React, { useState } from "react";
import {
  PhoneCall,
  PhoneOff,
  Radio,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  PhoneForwarded,
  Share2,
  Copy,
  Check,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { ActiveCallInfo, OfflineNoticeInfo, CallState } from "@/hooks/useCallSignaling";

interface CallOverlayProps {
  callState: CallState;
  callStatusText?: string;
  activeCall: ActiveCallInfo | null;
  offlineNotice: OfflineNoticeInfo | null;
  myLang: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  isSpeakerOn?: boolean;
  onToggleSpeaker?: () => void;
  isCellularTriggered?: boolean;
  onStartCellularCall?: (toPhone: string, roomId: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onClearOfflineNotice: () => void;
}

export function CallOverlay({
  callState,
  callStatusText = "Connecting...",
  activeCall,
  offlineNotice,
  myLang,
  isMuted = false,
  onToggleMute,
  isSpeakerOn = true,
  onToggleSpeaker,
  isCellularTriggered = false,
  onStartCellularCall,
  onAccept,
  onReject,
  onCancel,
  onClearOfflineNotice,
}: CallOverlayProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. INCOMING CALL FULL-SCREEN OVERLAY
  if (callState === "incoming" && activeCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
        <div className="w-full max-w-sm p-6 rounded-3xl glass-panel border border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.3)] flex flex-col items-center gap-5 text-center text-slate-100">
          {/* Animated Pulsing Phone Ring */}
          <div className="relative mt-2">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-pulse">
              <PhoneCall className="w-10 h-10 text-slate-950 animate-bounce" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping-slow pointer-events-none" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Incoming Translation Call
            </span>
            <h2 className="text-2xl font-black font-mono tracking-wider text-white">
              {activeCall.partnerPhone}
            </h2>
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 mx-auto mt-1">
              <span>Caller speaks:</span>
              <strong className="text-cyan-300">{activeCall.partnerLang || "Foreign Language"}</strong>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-300 leading-relaxed">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 inline mr-1" />
            Put in paired Bluetooth earbuds. Accepting auto-joins live two-way translation in room{" "}
            <strong className="text-cyan-300">#{activeCall.roomId}</strong>.
          </div>

          {/* Action Buttons: Accept / Decline */}
          <div className="grid grid-cols-2 gap-3 w-full pt-2">
            <button
              onClick={onReject}
              type="button"
              className="py-4 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
            >
              <PhoneOff className="w-4 h-4 text-rose-400" />
              <span>Decline</span>
            </button>

            <button
              onClick={onAccept}
              type="button"
              className="py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <PhoneCall className="w-4 h-4 text-slate-950" />
              <span>Accept &amp; Talk</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNIFIED OUTGOING CALLING / RINGING / CELLULAR OVERLAY
  if ((callState === "calling" || callState === "ringing") && activeCall) {
    const handleCellularSwitch = () => {
      if (onStartCellularCall && activeCall) {
        onStartCellularCall(activeCall.partnerPhone, activeCall.roomId);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
        <div className="w-full max-w-sm p-6 rounded-3xl glass-panel border border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col items-center gap-5 text-center text-slate-100">
          {/* Signal Pulse Animation */}
          <div className="relative mt-2">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 animate-pulse">
              {isCellularTriggered ? (
                <PhoneForwarded className="w-10 h-10 text-white animate-bounce" />
              ) : (
                <Radio className="w-10 h-10 text-white animate-spin-slow" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-cyan-400 animate-ping-slow pointer-events-none" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-widest uppercase text-cyan-400">
              {callStatusText}
            </span>
            <h2 className="text-2xl font-black font-mono tracking-wider text-white">
              {activeCall.partnerPhone}
            </h2>
            <p className="text-xs text-slate-400">
              Room #{activeCall.roomId} • Live translation ({myLang})
            </p>
          </div>

          {/* Fallback to Cellular Call Button (Twilio PSTN) */}
          {!isCellularTriggered && onStartCellularCall && (
            <button
              onClick={handleCellularSwitch}
              type="button"
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
            >
              <PhoneForwarded className="w-4 h-4 text-amber-400" />
              <span>Switch to Cellular Call (Twilio PSTN)</span>
            </button>
          )}

          {isCellularTriggered && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
              📞 Dialing standard mobile phone network via Twilio. Once answered, both sides will hear translated speech in real time.
            </div>
          )}

          {/* Quick Audio Controls: Mute & Speaker */}
          <div className="flex items-center justify-center gap-3 w-full py-1">
            <button
              onClick={onToggleMute}
              type="button"
              className={`p-3 rounded-2xl border transition active:scale-95 ${
                isMuted
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={onToggleSpeaker}
              type="button"
              className={`p-3 rounded-2xl border transition active:scale-95 ${
                isSpeakerOn
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-900 border-slate-700 text-slate-400"
              }`}
              title={isSpeakerOn ? "Speaker On" : "Earbuds / Earpiece"}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          {/* Red End Call Button */}
          <button
            onClick={onCancel}
            type="button"
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 transition active:scale-95"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="uppercase tracking-wider">End Call</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. OPTIONAL OFFLINE BACKUP (Only if user explicitly wants WhatsApp/SMS link)
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
        <div className="w-full max-w-sm p-5 rounded-3xl glass-panel border border-cyan-500/30 shadow-2xl flex flex-col gap-4 text-slate-100">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Share2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Direct Invite Options</h3>
            </div>
            <button
              onClick={onClearOfflineNotice}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-1 text-xs text-slate-300">
            <p>
              Connect with <strong className="text-white font-mono">{offlineNotice.toPhone}</strong>:
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {onStartCellularCall && (
              <button
                onClick={() => {
                  onStartCellularCall(offlineNotice.toPhone, offlineNotice.roomId);
                  onClearOfflineNotice();
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-[0.98]"
              >
                <PhoneForwarded className="w-4 h-4 text-slate-950" />
                <span>Call Directly via Cellular (Twilio)</span>
              </button>
            )}

            {offlineNotice.whatsappLink && (
              <a
                href={offlineNotice.whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#202C33] hover:bg-[#202C33]/80 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Invite via WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            )}

            <button
              onClick={handleCopy}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl glass-pill text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Room Link"}</span>
            </button>
          </div>

          <button
            onClick={onClearOfflineNotice}
            className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return null;
}
