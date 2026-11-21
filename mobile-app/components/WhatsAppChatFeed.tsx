"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Volume2,
  Check,
  CheckCheck,
  Languages,
} from "lucide-react";
import { ChatMessage } from "@/hooks/useChatterWebSocket";

interface WhatsAppChatFeedProps {
  messages: ChatMessage[];
  myLang: string;
  partnerLang: string | null;
  currentlyPlayingId: string | null;
  onPlayAudio: (id: string, audioBase64: string, speed: number) => void;
  onPauseAudio: () => void;
  onMarkPlayed: (id: string) => void;
}

export function WhatsAppChatFeed({
  messages,
  myLang,
  partnerLang,
  currentlyPlayingId,
  onPlayAudio,
  onPauseAudio,
  onMarkPlayed,
}: WhatsAppChatFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});
  const [playbackSpeeds, setPlaybackSpeeds] = useState<Record<string, number>>({});

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleTranscript = (id: string) => {
    setExpandedTranscripts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const cycleSpeed = (id: string) => {
    const current = playbackSpeeds[id] || 1.0;
    const next = current === 1.0 ? 1.5 : current === 1.5 ? 2.0 : 1.0;
    setPlaybackSpeeds((prev) => ({ ...prev, [id]: next }));
    // If currently playing, update
    const msg = messages.find((m) => m.id === id);
    if (msg && msg.audioBase64 && currentlyPlayingId === id) {
      onPlayAudio(id, msg.audioBase64, next);
    }
  };

  const handleTogglePlay = (msg: ChatMessage) => {
    if (!msg.audioBase64) return;

    if (currentlyPlayingId === msg.id) {
      onPauseAudio();
    } else {
      const speed = playbackSpeeds[msg.id] || 1.0;
      onPlayAudio(msg.id, msg.audioBase64, speed);
      if (!msg.isSelf) {
        onMarkPlayed(msg.id);
      }
    }
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3 bg-[#0B141A] bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]"
    >
      {/* Date Header Pill */}
      <div className="flex justify-center my-1">
        <span className="px-3 py-1 rounded-lg bg-[#182229] border border-white/5 text-[11px] font-medium text-[#8696A0] shadow-sm">
          Today • Voice-Only Translated Chat
        </span>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 text-[#8696A0]">
          <div className="w-14 h-14 rounded-full bg-[#182229] border border-[#00A884]/30 flex items-center justify-center text-[#00A884] shadow-lg">
            <Volume2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No voice notes yet</h3>
            <p className="text-xs text-[#8696A0] mt-1 max-w-xs leading-relaxed">
              Tap or hold the microphone button below to record. Your voice note will translate automatically and play in your partner&apos;s language.
            </p>
          </div>
        </div>
      ) : (
        messages.map((msg) => {
          const isPlayingThis = currentlyPlayingId === msg.id;
          const isExpanded = Boolean(expandedTranscripts[msg.id]);
          const currentSpeed = playbackSpeeds[msg.id] || 1.0;

          // Outgoing: #005C4B (WhatsApp dark green)
          // Incoming: #202C33 (WhatsApp dark slate)
          const bubbleBg = msg.isSelf ? "bg-[#005C4B]" : "bg-[#202C33]";
          const alignment = msg.isSelf ? "self-end items-end" : "self-start items-start";

          return (
            <div key={msg.id} className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${alignment} animate-in fade-in duration-200`}>
              <div
                className={`p-3 rounded-2xl ${bubbleBg} shadow-md border border-white/5 flex flex-col gap-2 w-full text-white ${
                  msg.isSelf ? "rounded-tr-none" : "rounded-tl-none"
                }`}
              >
                {/* Voice Note Player Header */}
                <div className="flex items-center gap-2.5">
                  {/* Play / Pause Circular Button */}
                  <button
                    onClick={() => handleTogglePlay(msg)}
                    disabled={!msg.audioBase64}
                    type="button"
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
                      msg.isSelf
                        ? "bg-[#00A884] text-[#0B141A] hover:bg-[#02906f]"
                        : "bg-[#00A884] text-[#0B141A] hover:bg-[#02906f]"
                    }`}
                  >
                    {isPlayingThis ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Waveform Bars Visualizer */}
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-[3px] h-6 px-1">
                      {[40, 75, 55, 90, 65, 30, 85, 100, 45, 70, 80, 50, 95, 60, 40, 80].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h}%` }}
                          className={`w-[3px] rounded-full transition-colors duration-150 ${
                            isPlayingThis
                              ? "bg-[#00A884] animate-pulse"
                              : msg.isSelf
                              ? "bg-[#8696A0]"
                              : "bg-[#8696A0]"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Duration & Language Tag */}
                    <div className="flex items-center justify-between text-[10px] text-[#8696A0] px-1 font-mono">
                      <span>{msg.durationSec ? `0:${msg.durationSec < 10 ? "0" : ""}${msg.durationSec}` : "Voice Note"}</span>
                      <span className="text-[#00A884] font-sans font-semibold">
                        {msg.isSelf ? `${msg.sourceLang} → ${msg.targetLang}` : `${msg.targetLang}`}
                      </span>
                    </div>
                  </div>

                  {/* Playback Speed Pill */}
                  <button
                    onClick={() => cycleSpeed(msg.id)}
                    type="button"
                    className="px-2 py-0.5 rounded-full bg-black/25 text-[10px] font-bold text-white hover:bg-black/40 transition active:scale-90"
                    title="Playback speed"
                  >
                    {currentSpeed}x
                  </button>
                </div>

                {/* Collapsible Transcript Drawer */}
                <div className="pt-1 border-t border-white/5">
                  <button
                    onClick={() => toggleTranscript(msg.id)}
                    type="button"
                    className="w-full flex items-center justify-between text-[11px] font-semibold text-[#8696A0] hover:text-white transition py-0.5"
                  >
                    <span className="flex items-center gap-1 text-[#E9EDEF]">
                      <Languages className="w-3 h-3 text-[#00A884]" />
                      <span>{msg.isSelf ? "Translation sent:" : "Translated voice:"}</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {/* Always show translated text preview; expand for original */}
                  <p className="text-xs text-[#E9EDEF] font-medium leading-relaxed mt-0.5">
                    &ldquo;{msg.translatedText}&rdquo;
                  </p>

                  {isExpanded && (
                    <div className="mt-1.5 p-2 rounded-xl bg-black/20 text-[11px] text-[#8696A0] border border-white/5 flex flex-col gap-0.5 animate-in fade-in duration-150">
                      <span className="text-[10px] font-bold uppercase text-[#00A884]">
                        Original ({msg.sourceLang}):
                      </span>
                      <span className="italic text-[#E9EDEF]">&ldquo;{msg.originalText}&rdquo;</span>
                    </div>
                  )}
                </div>

                {/* Bubble Footer: Timestamp & Double Checkmarks */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696A0] mt-0.5">
                  <span>{msg.timestamp}</span>
                  {msg.isSelf && (
                    <span>
                      {msg.status === "played" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" /> // Blue played ticks
                      ) : msg.status === "delivered" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#8696A0]" /> // Grey delivered ticks
                      ) : (
                        <Check className="w-3.5 h-3.5 text-[#8696A0]" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
