"use client";

import React, { useState, useMemo } from "react";
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
  Users,
  Search,
  MessageSquare,
  Phone,
  RefreshCw,
  Check,
  CheckCheck,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";
import { AVAILABLE_LANGUAGES } from "./RoomSetup";
import { DialPad } from "./DialPad";
import { QRCodeSVG } from "qrcode.react";
import { SyncedContact } from "@/lib/firebase";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { User } from "firebase/auth";

export interface RecentChatItem {
  roomId: string;
  partnerPhone?: string;
  partnerName?: string;
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
  contacts: SyncedContact[];
  onContactsSynced: (contacts: SyncedContact[]) => void;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  onOpenChat: (roomId: string, partnerPhone?: string, partnerName?: string) => void;
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
  contacts,
  onContactsSynced,
  currentUser,
  onUserChange,
  onOpenChat,
  onStartCall,
  onOpenSettings,
  currentRoomCode,
}: WhatsAppChatListProps) {
  // Navigation tabs: "chats" | "contacts" | "calls"
  const [activeTab, setActiveTab] = useState<"chats" | "contacts" | "calls">("chats");

  // Modals
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isQuickRoomModalOpen, setIsQuickRoomModalOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState<"dial" | "qr" | "link">("dial");
  const [copiedLink, setCopiedLink] = useState(false);

  // Search in contacts tab
  const [searchQuery, setSearchQuery] = useState("");

  // Edit phone number state
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhoneInput, setTempPhoneInput] = useState(myPhone);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/?room=${currentRoomCode}` : "";

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

  const handleSavePhone = () => {
    const trimmed = tempPhoneInput.trim();
    if (trimmed) {
      onSetMyPhone(trimmed);
      setIsEditingPhone(false);
    }
  };

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.replace(/[^\d]/g, "").includes(q)
    );
  }, [contacts, searchQuery]);

  return (
    <div className="flex-1 flex flex-col bg-[#0B141A] text-[#E9EDEF] select-none h-full relative">
      {/* WhatsApp Main Top Header */}
      <header className="px-3.5 py-3 bg-[#202C33] border-b border-[#313D45] flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-1.5">
          {/* Quick Room (QR / Link) Button - Zero Regressions */}
          <button
            onClick={() => setIsQuickRoomModalOpen(true)}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-full bg-[#111B21] hover:bg-[#202C33] border border-[#313D45] text-xs font-semibold text-[#00A884] transition active:scale-95"
            title="Quick Room (Pair via QR Code or Link without Login)"
          >
            <QrCode className="w-3.5 h-3.5 text-[#00A884]" />
            <span className="text-[11px] text-white">Quick Room</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <select
              value={myLang}
              onChange={(e) => onSelectLang(e.target.value)}
              className="appearance-none bg-[#111B21] border border-[#313D45] rounded-xl px-2 py-1.5 pr-5 text-xs font-semibold text-white focus:outline-none focus:border-[#00A884] cursor-pointer"
            >
              {AVAILABLE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#111B21] text-white">
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-[#8696A0]">
              <span className="text-[8px]">▼</span>
            </div>
          </div>

          {/* Google Account Profile / Sign In Button */}
          <GoogleAuthButton
            currentUser={currentUser}
            onUserChange={onUserChange}
            onContactsSynced={onContactsSynced}
            contactCount={contacts.length}
          />

          {/* Settings Icon */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl hover:bg-[#111B21] text-[#8696A0] hover:text-white transition active:scale-95"
            title="Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* WhatsApp Navigation Tabs Bar (Chats, Contacts, Calls) */}
      <div className="flex items-center bg-[#202C33] border-b border-[#313D45] text-xs font-bold uppercase tracking-wider text-[#8696A0]">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 py-3 text-center flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "chats"
              ? "border-[#00A884] text-[#00A884]"
              : "border-transparent hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chats</span>
          {recentChats.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#00A884] text-[#0B141A] font-bold text-[9px] flex items-center justify-center">
              {recentChats.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex-1 py-3 text-center flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "contacts"
              ? "border-[#00A884] text-[#00A884]"
              : "border-transparent hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Contacts</span>
          {contacts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#313D45] text-[#E9EDEF] font-bold text-[9px]">
              {contacts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("calls")}
          className={`flex-1 py-3 text-center flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "calls"
              ? "border-[#00A884] text-[#00A884]"
              : "border-transparent hover:text-white"
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Calls</span>
        </button>
      </div>

      {/* User Callable Mobile Identity Banner */}
      <div className="px-3.5 py-2 bg-[#111B21] border-b border-[#313D45] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#00A884]" />
          <div className="flex flex-col">
            <span className="text-[9px] text-[#8696A0] uppercase font-semibold tracking-wider">
              My Callable Mobile Number
            </span>
            {isEditingPhone ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="tel"
                  value={tempPhoneInput}
                  onChange={(e) => setTempPhoneInput(e.target.value)}
                  placeholder="+919876543210"
                  className="bg-[#202C33] border border-[#00A884] rounded px-2 py-0.5 text-xs font-mono font-bold text-white focus:outline-none w-36"
                  autoFocus
                />
                <button
                  onClick={handleSavePhone}
                  className="p-1 rounded bg-[#00A884] text-[#0B141A] font-bold text-[10px]"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span
                onClick={() => {
                  setTempPhoneInput(myPhone);
                  setIsEditingPhone(true);
                }}
                className="text-xs font-mono font-bold text-white cursor-pointer hover:text-[#00A884] transition flex items-center gap-1"
                title="Click to edit your mobile number"
              >
                {myPhone && myPhone !== "+91" ? myPhone : "Tap to set your phone number"}
              </span>
            )}
          </div>
        </div>

        <div>
          {isPresenceConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00A884]/15 border border-[#00A884]/30 text-[10px] font-semibold text-[#00A884]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse" />
              Online
            </span>
          ) : (
            <span className="text-[10px] text-[#8696A0]">Connecting...</span>
          )}
        </div>
      </div>

      {/* ================= TAB 1: CHATS (Recent Voice Threads) ================= */}
      {activeTab === "chats" && (
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
          {recentChats.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 text-[#8696A0]">
              <div className="w-16 h-16 rounded-full bg-[#202C33] border border-white/5 flex items-center justify-center text-[#00A884] shadow-lg">
                <Volume2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Start a Translated Voice Chat</h3>
                <p className="text-xs text-[#8696A0] mt-1 max-w-xs leading-relaxed">
                  Record voice notes that automatically translate and speak in your partner&apos;s language.
                  Pick a contact or dial any phone number.
                </p>
              </div>
              <div className="flex flex-col gap-2 mt-2 w-full max-w-xs">
                <button
                  onClick={() => setActiveTab("contacts")}
                  className="w-full px-5 py-2.5 rounded-2xl bg-[#00A884] hover:bg-[#02906f] text-[#0B141A] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#00A884]/25 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Choose from Contacts ({contacts.length})</span>
                </button>
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="w-full px-5 py-2.5 rounded-2xl bg-[#202C33] hover:bg-[#202C33]/80 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dial Number or Scan QR</span>
                </button>
              </div>
            </div>
          ) : (
            recentChats.map((chat) => (
              <div
                key={chat.roomId}
                onClick={() => onOpenChat(chat.roomId, chat.partnerPhone, chat.partnerName)}
                className="p-3 rounded-2xl bg-[#111B21] hover:bg-[#202C33] active:bg-[#202C33]/80 border border-white/5 cursor-pointer transition flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#202C33] border border-[#00A884]/30 flex items-center justify-center text-[#00A884] font-bold text-sm shrink-0">
                    {chat.partnerName
                      ? chat.partnerName[0].toUpperCase()
                      : chat.partnerPhone
                      ? chat.partnerPhone.slice(-2)
                      : `#${chat.roomId.slice(-2)}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white truncate font-mono">
                        {chat.partnerName || chat.partnerPhone || `Room #${chat.roomId}`}
                      </h3>
                      <span className="text-[10px] text-[#8696A0] font-mono">
                        {chat.lastMessageTime}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8696A0] truncate mt-0.5 flex items-center gap-1.5">
                      {chat.status === "played" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                      ) : chat.status === "delivered" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#8696A0] shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-[#8696A0] shrink-0" />
                      )}
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
      )}

      {/* ================= TAB 2: CONTACTS (Google Email Synced Numbers) ================= */}
      {activeTab === "contacts" && (
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#8696A0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name or phone..."
              className="w-full bg-[#111B21] border border-[#313D45] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-[#8696A0] focus:outline-none focus:border-[#00A884] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-[#8696A0] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sync Header Info */}
          <div className="px-1.5 py-1 flex items-center justify-between text-[11px] text-[#8696A0]">
            <span>
              Google Contacts: <strong className="text-white">{filteredContacts.length}</strong>
            </span>
            <button
              onClick={() => {
                // If user not signed in, trigger Google Auth
                const authBtn = document.querySelector<HTMLButtonElement>("[title*='Sign in with Google']");
                if (authBtn) authBtn.click();
              }}
              className="text-[#00A884] hover:underline flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Contacts List */}
          {filteredContacts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2 text-[#8696A0]">
              <Users className="w-12 h-12 text-[#313D45]" />
              <h4 className="text-xs font-bold text-white">No Contacts Found</h4>
              <p className="text-[11px] max-w-xs">
                Sign in with Google above to automatically import all saved phone numbers from your email ID.
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3 rounded-2xl bg-[#111B21] hover:bg-[#202C33] border border-white/5 transition flex items-center justify-between gap-2 shadow-sm"
              >
                <div
                  onClick={() => onOpenChat(currentRoomCode, contact.phone, contact.name)}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  {contact.photoUrl ? (
                    <img
                      src={contact.photoUrl}
                      alt={contact.name}
                      className="w-11 h-11 rounded-full border border-[#00A884]/40 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#202C33] border border-[#00A884]/30 flex items-center justify-center text-[#00A884] font-bold text-sm shrink-0">
                      {contact.name ? contact.name[0].toUpperCase() : "#"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-white truncate">{contact.name}</h3>
                    <p className="text-[11px] font-mono text-[#8696A0] truncate mt-0.5">
                      {contact.phone}
                    </p>
                    {contact.label && (
                      <span className="text-[9px] text-[#00A884] font-semibold">{contact.label}</span>
                    )}
                  </div>
                </div>

                {/* Two 1-Tap Action Buttons: Voice Chat & Live Call */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onOpenChat(currentRoomCode, contact.phone, contact.name)}
                    className="p-2 rounded-xl bg-[#202C33] hover:bg-[#00A884] hover:text-[#0B141A] text-[#00A884] transition active:scale-95"
                    title={`Send Translated Voice Note to ${contact.name}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onStartCall(contact.phone, currentRoomCode)}
                    className="p-2 rounded-xl bg-[#00A884] hover:bg-[#02906f] text-[#0B141A] font-bold transition active:scale-95 shadow-md shadow-[#00A884]/20"
                    title={`Start Live Earbud Call with ${contact.name}`}
                  >
                    <PhoneCall className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= TAB 3: CALLS (History & Dial Pad) ================= */}
      {activeTab === "calls" && (
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          <div className="p-4 rounded-3xl bg-[#111B21] border border-[#313D45] shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <PhoneCall className="w-4 h-4 text-[#00A884]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Direct Mobile Call &amp; Translate
              </h3>
            </div>
            <DialPad
              onCall={(targetPhone) => {
                onStartCall(targetPhone, currentRoomCode);
              }}
              partnerLangName={myLang}
            />
          </div>

          <div className="px-1 flex flex-col gap-1">
            <span className="text-[10px] text-[#8696A0] uppercase font-bold tracking-wider">
              Recent Call Sessions
            </span>
            {recentChats.slice(0, 3).map((chat) => (
              <div
                key={`call-${chat.roomId}`}
                className="p-2.5 rounded-xl bg-[#111B21] border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <PhoneOutgoing className="w-3.5 h-3.5 text-[#00A884]" />
                  <div>
                    <h4 className="font-bold text-white font-mono">
                      {chat.partnerName || chat.partnerPhone || `Room #${chat.roomId}`}
                    </h4>
                    <span className="text-[10px] text-[#8696A0]">{chat.lastMessageTime}</span>
                  </div>
                </div>
                <button
                  onClick={() => onStartCall(chat.partnerPhone || "", chat.roomId)}
                  className="p-1.5 rounded-lg bg-[#00A884] text-[#0B141A] font-bold"
                  title="Call Again"
                >
                  <PhoneCall className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsNewChatModalOpen(true)}
        className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-[#00A884] hover:bg-[#02906f] active:scale-95 text-[#0B141A] flex items-center justify-center shadow-2xl shadow-[#00A884]/40 transition-transform"
        title="Start New Voice Chat or Call"
      >
        <Plus className="w-7 h-7 text-[#0B141A]" />
      </button>

      {/* Quick Room (QR / Link) Modal - Zero Regressions */}
      {isQuickRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-5 rounded-3xl bg-[#111B21] border border-[#313D45] shadow-2xl flex flex-col gap-4 text-[#E9EDEF]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00A884]/20 border border-[#00A884]/40 flex items-center justify-center text-[#00A884]">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Quick Room Pairing</h3>
                  <span className="text-[10px] text-[#00A884]">Instant Pair without Login</span>
                </div>
              </div>
              <button
                onClick={() => setIsQuickRoomModalOpen(false)}
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
                Point partner&apos;s phone camera to pair instantly into Room{" "}
                <strong className="text-white">#{currentRoomCode}</strong>
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

              <button
                onClick={() => {
                  setIsQuickRoomModalOpen(false);
                  onOpenChat(currentRoomCode);
                }}
                className="w-full py-2.5 rounded-xl bg-[#202C33] text-xs font-bold text-white hover:bg-white/10 transition mt-1"
              >
                Enter Chat Room #{currentRoomCode}
              </button>
            </div>
          </div>
        </div>
      )}

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
