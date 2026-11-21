"use client";

import React from "react";
import { ArrowLeft, PhoneCall, Headphones, Sparkles, Volume2 } from "lucide-react";
import { WhatsAppChatFeed } from "./WhatsAppChatFeed";
import { VoiceRecordBar } from "./VoiceRecordBar";
import { ChatMessage } from "@/hooks/useChatterWebSocket";

interface WhatsAppChatScreenProps {
  roomCode: string;
  partnerPhone?: string;
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
            {partnerPhone ? partnerPhone.slice(-2) : `#${roomCode.slice(-2)}`}
          </div>

          {/* Partner & Language Info */}
          <div className="flex flex-col min-w-0">
            <h2 className="text-xs font-bold text-white truncate font-mono">
              {partnerPhone || `Room #${roomCode}`}
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

        {/* Live Earbud Call Button */}
        <div className="flex items-center gap-2">
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
    </div>
  );
}
