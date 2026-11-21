"use client";

import React, { useState } from "react";
import {
  Smartphone,
  PhoneCall,
  QrCode,
  Share2,
  Settings2,
  Plus,
  Volume2,
  ChevronRight,
  Headphones,
  Sparkles,
  X,
  Languages,
} from "lucide-react";
import { AVAILABLE_LANGUAGES } from "./RoomSetup";
import { DialPad } from "./DialPad";
import { QRCodeSVG } from "qrcode.react";

export interface RecentChatItem {
  roomId: string;
  partnerPhone?: string;
  partnerLang?: string;
  lastMessageSnippet: string;
  lastMessageTime: string;
  status?: "sent" | "delivered" | "played";
}

interface WhatsAppChatListProps {
  myPhone: string;
  onSetMyPhone: (phone: string) => void;
  myLang: string;
  onSelectLang: (lang: string) => void;
  isPresenceConnected: boolean;
  recentChats: RecentChatItem[];
  onOpenChat: (roomId: string, partnerPhone?: string) => void;
  onStartCall: (targetPhone: string, roomId?: string) => void;
  onOpenSettings: () => void;
  currentRoomCode: string;
}

export function WhatsAppChatList({
  myPhone,
  onSetMyPhone,
  myLang,
  onSelectLang,
  isPresenceConnected,
  recentChats,
  onOpenChat,
  onStartCall,
  onOpenSettings,
  currentRoomCode,
}: WhatsAppChatListProps) {
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState<"dial" | "qr" | "link">("dial");
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/?room=${currentRoomCode}` : "";

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
    <div className="flex-1 flex flex-col bg-[#0B141A] text-[#E9EDEF] select-none h-full relative">
      {/* WhatsApp Header */}
      <header className="px-4 py-3 bg-[#202C33] border-b border-[#313D45] flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00A884] to-[#25D366] flex items-center justify-center text-[#0B141A] font-bold shadow-md">
            <Headphones className="w-4 h-4 text-[#0B141A]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-white">ChatterBuds</h1>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/30">
                Voice
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <select
              value={myLang}
              onChange={(e) => onSelectLang(e.target.value)}
              className="appearance-none bg-[#111B21] border border-[#313D45] rounded-xl px-2.5 py-1.5 pr-6 text-xs font-semibold text-white focus:outline-none focus:border-[#00A884] cursor-pointer"
            >
              {AVAILABLE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#111B21] text-white">
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-[#8696A0]">
              <span className="text-[9px]">▼</span>
            </div>
          </div>

          {/* Settings Icon */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-[#111B21] text-[#8696A0] hover:text-white transition active:scale-95"
            title="Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* User Callable Mobile Identity Banner */}
      <div className="px-3.5 py-2.5 bg-[#111B21] border-b border-[#313D45] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#00A884]" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8696A0] uppercase font-semibold tracking-wider">
              My Callable Mobile Number
            </span>
            <input
              type="tel"
              value={myPhone}
              onChange={(e) => onSetMyPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="bg-transparent border-0 p-0 text-xs font-mono font-bold text-white focus:outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          {isPresenceConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00A884]/15 border border-[#00A884]/30 text-[10px] font-semibold text-[#00A884]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse" />
              Online
            </span>
          ) : (
            <span className="text-[10px] text-[#8696A0]">Offline</span>
          )}
        </div>
      </div>

      {/* Recent Chats Feed */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
        {recentChats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 text-[#8696A0]">
            <div className="w-16 h-16 rounded-full bg-[#202C33] border border-white/5 flex items-center justify-center text-[#00A884] shadow-lg">
              <Volume2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Start a Translated Voice Chat</h3>
              <p className="text-xs text-[#8696A0] mt-1 max-w-xs leading-relaxed">
                Connect with any friend by phone number, QR code, or link. Every voice note translates automatically into their language.
              </p>
            </div>
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-2xl bg-[#00A884] hover:bg-[#02906f] text-[#0B141A] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#00A884]/25 transition active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Voice Chat</span>
            </button>
          </div>
        ) : (
          recentChats.map((chat) => (
            <div
              key={chat.roomId}
              onClick={() => onOpenChat(chat.roomId, chat.partnerPhone)}
              className="p-3 rounded-2xl bg-[#111B21] hover:bg-[#202C33] active:bg-[#202C33]/80 border border-white/5 cursor-pointer transition flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[#202C33] border border-[#00A884]/30 flex items-center justify-center text-[#00A884] font-bold text-sm shrink-0">
                  {chat.partnerPhone ? chat.partnerPhone.slice(-2) : `#${chat.roomId.slice(-2)}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white truncate font-mono">
                      {chat.partnerPhone || `Room #${chat.roomId}`}
                    </h3>
                    <span className="text-[10px] text-[#8696A0] font-mono">{chat.lastMessageTime}</span>
                  </div>
                  <p className="text-[11px] text-[#8696A0] truncate mt-0.5 flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-[#00A884] shrink-0" />
                    <span>{chat.lastMessageSnippet}</span>
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8696A0] shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button (FAB) - New Chat / Call */}
      <button
        onClick={() => setIsNewChatModalOpen(true)}
        className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-[#00A884] hover:bg-[#02906f] active:scale-95 text-[#0B141A] flex items-center justify-center shadow-2xl shadow-[#00A884]/40 transition-transform"
        title="Start New Voice Chat or Call"
      >
        <Plus className="w-7 h-7 text-[#0B141A]" />
      </button>

      {/* New Chat & Dial Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-5 rounded-3xl bg-[#111B21] border border-[#313D45] shadow-2xl flex flex-col gap-4 text-[#E9EDEF]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00A884]/20 border border-[#00A884]/40 flex items-center justify-center text-[#00A884]">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Start Voice Chat or Call</h3>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3-Way Mode Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#202C33] border border-[#313D45] rounded-xl w-full">
              <button
                type="button"
                onClick={() => setNewChatTab("dial")}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                  newChatTab === "dial"
                    ? "bg-[#00A884] text-[#0B141A] shadow-md"
                    : "text-[#8696A0] hover:text-white"
                }`}
              >
                <PhoneCall className="w-3 h-3" />
                <span>Dial</span>
              </button>
              <button
                type="button"
                onClick={() => setNewChatTab("qr")}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                  newChatTab === "qr"
                    ? "bg-[#00A884] text-[#0B141A] shadow-md"
                    : "text-[#8696A0] hover:text-white"
                }`}
              >
                <QrCode className="w-3 h-3" />
                <span>QR</span>
              </button>
              <button
                type="button"
                onClick={() => setNewChatTab("link")}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition ${
                  newChatTab === "link"
                    ? "bg-[#00A884] text-[#0B141A] shadow-md"
                    : "text-[#8696A0] hover:text-white"
                }`}
              >
                <Share2 className="w-3 h-3" />
                <span>Link</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            {newChatTab === "dial" && (
              <DialPad
                onCall={(targetPhone) => {
                  setIsNewChatModalOpen(false);
                  onStartCall(targetPhone, currentRoomCode);
                }}
                partnerLangName={myLang}
              />
            )}

            {newChatTab === "qr" && (
              <div className="flex flex-col items-center gap-2.5 py-2">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  {shareUrl ? (
                    <QRCodeSVG value={shareUrl} size={135} level="H" fgColor="#0B141A" />
                  ) : null}
                </div>
                <span className="text-[11px] text-[#8696A0]">
                  Point partner&apos;s camera here to connect
                </span>
                <button
                  onClick={() => {
                    setIsNewChatModalOpen(false);
                    onOpenChat(currentRoomCode);
                  }}
                  className="w-full mt-1 py-2.5 rounded-xl bg-[#202C33] hover:bg-[#202C33]/80 text-xs font-semibold text-white border border-white/5 transition"
                >
                  Enter Room #{currentRoomCode}
                </button>
              </div>
            )}

            {newChatTab === "link" && (
              <div className="flex flex-col gap-2.5 py-1">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-98"
                >
                  <Share2 className="w-4 h-4 text-white" />
                  <span>Share via WhatsApp</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#202C33] hover:bg-[#202C33]/80 border border-white/5 text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
                >
                  <span>{copiedLink ? "Link Copied!" : "Copy Room Link"}</span>
                </button>

                <button
                  onClick={() => {
                    setIsNewChatModalOpen(false);
                    onOpenChat(currentRoomCode);
                  }}
                  className="w-full py-2 rounded-xl text-xs text-[#00A884] hover:underline transition text-center"
                >
                  Open Chat Room #{currentRoomCode} directly
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
