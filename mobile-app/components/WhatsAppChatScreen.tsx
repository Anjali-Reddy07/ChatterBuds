"use client";

import React, { useState } from "react";
import { ArrowLeft, PhoneCall, QrCode, Share2, Headphones, Sparkles, Volume2, X } from "lucide-react";
import { WhatsAppChatFeed } from "./WhatsAppChatFeed";
import { VoiceRecordBar } from "./VoiceRecordBar";
import { ChatMessage } from "@/hooks/useChatterWebSocket";
import { QRCodeSVG } from "qrcode.react";

interface WhatsAppChatScreenProps {
  roomCode: string;
  partnerPhone?: string;
  partnerName?: string;
  partnerConnected: boolean;
  partnerLang: string | null;
  myLang: string;
  messages: ChatMessage[];
  currentlyPlayingId: string | null;
  onBackToChats: () => void;
  onStartLiveCall: () => void;
  onSendVoiceNote: (audioBase64: string, durationSec: number) => void;
  onPlayAudio: (id: string, audioBase64: string, speed: number) => void;
  onPauseAudio: () => void;
  onMarkPlayed: (id: string) => void;
}

export function WhatsAppChatScreen({
  roomCode,
  partnerPhone,
  partnerName,
  partnerConnected,
  partnerLang,
  myLang,
  messages,
  currentlyPlayingId,
  onBackToChats,
  onStartLiveCall,
  onSendVoiceNote,
  onPlayAudio,
  onPauseAudio,
  onMarkPlayed,
}: WhatsAppChatScreenProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/?room=${roomCode}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Join my live two-way voice translation room on ChatterBuds! ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B141A] select-none relative overflow-hidden">
      {/* Top App Bar (WhatsApp Dark Style) */}
      <header className="px-3 py-2.5 bg-[#202C33] border-b border-[#313D45] flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBackToChats}
            className="p-1.5 rounded-xl hover:bg-[#111B21] text-[#E9EDEF] transition active:scale-95"
            title="Back to Chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-[#111B21] border border-[#00A884]/40 flex items-center justify-center text-[#00A884] font-bold text-xs shrink-0">
            {partnerName
              ? partnerName[0].toUpperCase()
              : partnerPhone
              ? partnerPhone.slice(-2)
              : `#${roomCode.slice(-2)}`}
          </div>

          {/* Partner & Language Info */}
          <div className="flex flex-col min-w-0">
            <h2 className="text-xs font-bold text-white truncate font-mono">
              {partnerName || partnerPhone || `Room #${roomCode}`}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-[#8696A0]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  partnerConnected ? "bg-[#00A884] animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="truncate">
                {myLang} ↔ {partnerLang || "Partner"}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Quick QR & Link Modal Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 rounded-xl hover:bg-[#111B21] text-[#8696A0] hover:text-white transition active:scale-95"
            title="Show Room QR Code or Share Link"
          >
            <QrCode className="w-4 h-4 text-[#00A884]" />
          </button>

          {/* Live Earbud Call Button */}
          <button
            onClick={onStartLiveCall}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-[#00A884] hover:bg-[#02906f] active:scale-95 text-[#0B141A] font-bold text-xs shadow-md transition"
            title="Switch to Live Earbud Call (Real-Time Bidirectional Speech)"
          >
            <PhoneCall className="w-3.5 h-3.5 fill-current" />
            <span className="text-[11px] uppercase tracking-wider font-black">Live Call</span>
          </button>
        </div>
      </header>

      {/* Voice-Only Chat Messages Feed */}
      <WhatsAppChatFeed
        messages={messages}
        myLang={myLang}
        partnerLang={partnerLang}
        currentlyPlayingId={currentlyPlayingId}
        onPlayAudio={onPlayAudio}
        onPauseAudio={onPauseAudio}
        onMarkPlayed={onMarkPlayed}
      />

      {/* Voice-Only Bottom Recording Bar (Strictly No Text Field) */}
      <VoiceRecordBar
        onSendVoiceNote={onSendVoiceNote}
        myLang={myLang}
        isPartnerConnected={partnerConnected}
      />

      {/* Room Share & QR Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-5 rounded-3xl bg-[#111B21] border border-[#313D45] shadow-2xl flex flex-col gap-4 text-[#E9EDEF]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00A884]/20 border border-[#00A884]/40 flex items-center justify-center text-[#00A884]">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Share Room #{roomCode}</h3>
                  <span className="text-[10px] text-[#00A884]">Connect partner to this voice chat</span>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 py-2">
              <div className="p-3 bg-white rounded-2xl shadow-xl">
                {shareUrl ? (
                  <QRCodeSVG value={shareUrl} size={150} level="H" fgColor="#0B141A" />
                ) : null}
              </div>
              <span className="text-xs text-[#8696A0] text-center">
                Point partner&apos;s phone camera here to join your voice chat
              </span>

              <div className="w-full grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-[#00A884] hover:bg-[#02906f] text-[#0B141A] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 rounded-xl bg-[#202C33] hover:bg-[#202C33]/80 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
