"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WhatsAppChatList, RecentChatItem } from "@/components/WhatsAppChatList";
import { WhatsAppChatScreen } from "@/components/WhatsAppChatScreen";
import { LiveConversation } from "@/components/LiveConversation";
import { CallOverlay } from "@/components/CallOverlay";
import { useChatterWebSocket } from "@/hooks/useChatterWebSocket";
import { useAudioRecorder, AudioMode, ConversationMode } from "@/hooks/useAudioRecorder";
import { useCallSignaling } from "@/hooks/useCallSignaling";
import {
  Headphones,
  ExternalLink,
  X,
  Settings2,
  Radio,
  Check,
  Server,
  AlertCircle,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

const DEFAULT_PROD_WS_URL = "wss://chatterbuds-api.onrender.com/ws";

/**
 * Strict WebSocket URL sanitizer and validator:
 * - Strips whitespace and accidentally pasted quotes
 * - Normalizes https:// -> wss:// and http:// -> ws://
 * - Appends /ws if missing
 * - Validates format with new URL()
 * - Discards localhost on production/remote domains
 */
function sanitizeAndValidateWsUrl(candidate?: string | null): string | null {
  if (!candidate || typeof candidate !== "string") return null;

  let cleaned = candidate.trim();
  // Strip outer quotes if accidentally pasted with quotes
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, "").trim();
  if (!cleaned) return null;

  // Convert http(s) to ws(s)
  if (cleaned.startsWith("https://")) {
    cleaned = "wss://" + cleaned.slice(8);
  } else if (cleaned.startsWith("http://")) {
    cleaned = "ws://" + cleaned.slice(7);
  } else if (!cleaned.startsWith("ws://") && !cleaned.startsWith("wss://")) {
    cleaned = cleaned.includes("localhost") || cleaned.includes("127.0.0.1")
      ? "ws://" + cleaned
      : "wss://" + cleaned;
  }

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, "");

  // Ensure path ends with /ws
  if (!cleaned.endsWith("/ws")) {
    cleaned = `${cleaned}/ws`;
  }

  // Validate with new URL()
  try {
    const testHttp = cleaned.replace(/^ws:\/\//i, "http://").replace(/^wss:\/\//i, "https://");
    const parsed = new URL(testHttp);

    // If candidate points to localhost/127.0.0.1 on a non-localhost device, reject it
    if (typeof window !== "undefined") {
      const isCandidateLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      const isBrowserRemote =
        window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
      if (isCandidateLocal && isBrowserRemote) {
        return null;
      }
    }

    return cleaned;
  } catch {
    return null;
  }
}

/**
 * Resolves the active WebSocket URL:
 * 1. Checks localStorage (auto-clears if invalid)
 * 2. Checks process.env.NEXT_PUBLIC_WS_URL
 * 3. Falls back directly to DEFAULT_PROD_WS_URL
 */
function resolveValidWsUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("chatterbuds_ws_url");
      if (stored) {
        const validStored = sanitizeAndValidateWsUrl(stored);
        if (validStored) {
          return validStored;
        } else {
          localStorage.removeItem("chatterbuds_ws_url");
        }
      }
    } catch {
      // ignore localStorage exception
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) {
    const validEnv = sanitizeAndValidateWsUrl(envUrl);
    if (validEnv) {
      return validEnv;
    }
  }

  return DEFAULT_PROD_WS_URL;
}

function ChatterBudsApp() {
  const searchParams = useSearchParams();

  // Screen state: "chats" (WhatsApp chats hub), "chat" (Voice-only chat), or "live_call" (Live earbud translation call)
  const [screen, setScreen] = useState<"chats" | "chat" | "live_call">("chats");

  // Room & Language state
  const [roomCode, setRoomCode] = useState("1234");
  const [partnerPhone, setPartnerPhone] = useState<string | undefined>(undefined);
  const [selectedLang, setSelectedLang] = useState("Telugu");
  const [conversationMode, setConversationMode] = useState<ConversationMode>("in-person");
  const [mode, setMode] = useState<AudioMode>("vad");

  // Mobile Number Identity for Call Signaling
  const [myPhone, setMyPhone] = useState("+91");

  // Recent Voice Conversations List
  const [recentChats, setRecentChats] = useState<RecentChatItem[]>([]);

  // In-App Browser (Instagram / WhatsApp WebView) Guard
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [dismissInAppBanner, setDismissInAppBanner] = useState(false);

  // Server Settings Modal & Advanced Dev Drawer
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showDevServerOverride, setShowDevServerOverride] = useState(false);

  // WebSocket Server URL initialized directly from robust resolver
  const [wsUrl, setWsUrl] = useState(DEFAULT_PROD_WS_URL);
  const [tempWsUrl, setTempWsUrl] = useState(DEFAULT_PROD_WS_URL);

  // Check user agent and stored preferences on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isWebView = /Instagram|FBAN|FBAV|WhatsApp|Line|MicroMessenger/i.test(ua);
      setIsInAppBrowser(isWebView);

      // Check stored phone number
      const savedPhone = localStorage.getItem("chatterbuds_my_phone");
      if (savedPhone && savedPhone.trim().length > 0) {
        setMyPhone(savedPhone.trim());
      }

      // Check stored recent chats
      try {
        const savedChats = localStorage.getItem("chatterbuds_recent_chats");
        if (savedChats) {
          const parsed = JSON.parse(savedChats);
          if (Array.isArray(parsed)) setRecentChats(parsed);
        }
      } catch (e) {
        // ignore
      }

      // Check URL query param ?room=XXXX on load
      const queryRoom = searchParams.get("room");
      if (queryRoom && queryRoom.trim().length > 0) {
        setRoomCode(queryRoom.trim());
        setScreen("chat");
      } else {
        const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
        setRoomCode(randomCode);
      }

      // Check stored conversation mode
      const savedConvMode = localStorage.getItem("chatterbuds_conv_mode");
      if (savedConvMode === "in-person" || savedConvMode === "remote") {
        setConversationMode(savedConvMode);
      }

      // Resolve valid, auto-sanitized WebSocket URL
      const resolvedWs = resolveValidWsUrl();
      setWsUrl(resolvedWs);
      setTempWsUrl(resolvedWs);
    }
  }, [searchParams]);

  const handleSetMyPhone = (phone: string) => {
    setMyPhone(phone);
    if (typeof window !== "undefined") {
      localStorage.setItem("chatterbuds_my_phone", phone);
    }
  };

  // Call Signaling & Presence hook (incoming/outgoing calls with Web Audio ringtones)
  const {
    isPresenceConnected,
    callState,
    activeCall,
    offlineNotice,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    clearOfflineNotice,
  } = useCallSignaling({
    wsUrl,
    myPhone,
    myLang: selectedLang,
    onCallAccepted: (acceptedRoomId) => {
      setRoomCode(acceptedRoomId);
      setScreen("live_call");
    },
  });

  // WebSocket connection hook (enabled in chat or live call)
  const {
    isConnected,
    partnerConnected,
    partnerLang,
    messages,
    isPlaying,
    currentlyPlayingId,
    connectionError,
    isWakingServer,
    wakeAttempt,
    isLocalhostIssue,
    sendAudioChunk,
    sendVoiceNote,
    markNotePlayed,
    playAudioBase64,
    pauseAudio,
  } = useChatterWebSocket({
    wsUrl,
    roomId: roomCode,
    myLang: selectedLang,
    enabled: screen === "chat" || screen === "live_call",
  });

  // Update recent conversations list when messages change
  useEffect(() => {
    if (typeof window !== "undefined" && roomCode) {
      setRecentChats((prev) => {
        const lastMsg = messages[messages.length - 1];
        const snippet = lastMsg
          ? `🎤 Voice Note (${lastMsg.durationSec || 5}s) • ${lastMsg.translatedText.slice(0, 24)}...`
          : "Voice conversation room";
        const time = lastMsg ? lastMsg.timestamp : "Just now";

        const existingIdx = prev.findIndex((c) => c.roomId === roomCode);
        let updated: RecentChatItem[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            lastMessageSnippet: snippet,
            lastMessageTime: time,
            partnerPhone: partnerPhone || updated[existingIdx].partnerPhone,
            partnerLang: partnerLang || updated[existingIdx].partnerLang,
          };
        } else {
          updated = [
            {
              roomId: roomCode,
              partnerPhone,
              partnerLang: partnerLang || undefined,
              lastMessageSnippet: snippet,
              lastMessageTime: time,
            },
            ...prev,
          ];
        }
        try {
          localStorage.setItem("chatterbuds_recent_chats", JSON.stringify(updated.slice(0, 10)));
        } catch (e) {
          // ignore
        }
        return updated;
      });
    }
  }, [messages, roomCode, partnerPhone, partnerLang]);

  // Audio Recorder & VAD hook (active in live_call mode)
  const {
    isRecording,
    isSpeaking,
    audioLevel,
    micPermission,
    startHoldToTalk,
    stopHoldToTalk,
  } = useAudioRecorder({
    mode,
    conversationMode,
    isPlaying,
    onAudioChunk: sendAudioChunk,
  });

  const handleJoinRoom = () => {
    setScreen("live_call");
  };

  const handleLeaveRoom = () => {
    setScreen("chats");
  };

  const handleSelectConversationMode = (newMode: ConversationMode) => {
    setConversationMode(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("chatterbuds_conv_mode", newMode);
    }
  };

  const handleSaveSettings = () => {
    const valid = sanitizeAndValidateWsUrl(tempWsUrl);
    const finalUrl = valid || DEFAULT_PROD_WS_URL;
    setWsUrl(finalUrl);
    setTempWsUrl(finalUrl);
    if (typeof window !== "undefined") {
      if (finalUrl === DEFAULT_PROD_WS_URL) {
        localStorage.removeItem("chatterbuds_ws_url");
      } else {
        localStorage.setItem("chatterbuds_ws_url", finalUrl);
      }
    }
    setIsSettingsModalOpen(false);
  };

  return (
    <main className="w-full min-h-screen bg-transparent text-slate-100 flex flex-col justify-start items-center">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col min-h-screen safe-top safe-bottom">
        {/* In-App Browser Detection Banner */}
        {isInAppBrowser && !dismissInAppBanner && (
          <div className="mx-3.5 mb-2 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/40 text-amber-100 shadow-xl backdrop-blur-xl animate-in slide-in-from-top-3 duration-300 relative">
            <div className="flex items-start gap-2.5">
              <ExternalLink className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 pr-4">
                <span className="font-bold text-xs text-amber-300 block">
                  Open in Chrome or Safari
                </span>
                <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                  Instagram &amp; WhatsApp in-app browsers block Bluetooth audio &amp; microphone permissions. Tap the <strong>⋮ or ⋯ menu</strong> at the top right and tap <strong>&ldquo;Open in Chrome / Safari&rdquo;</strong> for full live speech translation.
                </p>
              </div>
              <button
                onClick={() => setDismissInAppBanner(true)}
                className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-300 transition"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Screen Routing: WhatsApp Chats List -> Voice-Only Chat -> Live Earbud Call */}
        {screen === "chats" ? (
          <WhatsAppChatList
            myPhone={myPhone}
            onSetMyPhone={handleSetMyPhone}
            myLang={selectedLang}
            onSelectLang={setSelectedLang}
            isPresenceConnected={isPresenceConnected}
            recentChats={recentChats}
            onOpenChat={(roomId, phone) => {
              setRoomCode(roomId);
              if (phone) setPartnerPhone(phone);
              setScreen("chat");
            }}
            onStartCall={(targetPhone, roomId) => {
              const rId = roomId || roomCode;
              setRoomCode(rId);
              setPartnerPhone(targetPhone);
              startCall(targetPhone, rId);
            }}
            onOpenSettings={() => {
              setTempWsUrl(wsUrl);
              setIsSettingsModalOpen(true);
            }}
            currentRoomCode={roomCode}
          />
        ) : screen === "chat" ? (
          <WhatsAppChatScreen
            roomCode={roomCode}
            partnerPhone={partnerPhone}
            partnerConnected={partnerConnected}
            partnerLang={partnerLang}
            myLang={selectedLang}
            messages={messages}
            currentlyPlayingId={currentlyPlayingId}
            onBackToChats={() => setScreen("chats")}
            onStartLiveCall={() => setScreen("live_call")}
            onSendVoiceNote={(base64, duration) => sendVoiceNote(base64, duration, myPhone)}
            onPlayAudio={(id, b64, speed) => playAudioBase64(b64, id, speed)}
            onPauseAudio={pauseAudio}
            onMarkPlayed={(id) => markNotePlayed(id)}
          />
        ) : (
          <LiveConversation
            roomCode={roomCode}
            myLang={selectedLang}
            partnerConnected={partnerConnected}
            partnerLang={partnerLang}
            mode={mode}
            conversationMode={conversationMode}
            onSetMode={setMode}
            onLeaveRoom={() => setScreen("chat")}
            isRecording={isRecording}
            isSpeaking={isSpeaking}
            audioLevel={audioLevel}
            micPermission={micPermission}
            startHoldToTalk={startHoldToTalk}
            stopHoldToTalk={stopHoldToTalk}
            isConnected={isConnected}
            connectionError={connectionError}
            isWakingServer={isWakingServer}
            wakeAttempt={wakeAttempt}
            isLocalhostIssue={isLocalhostIssue}
            messages={messages}
            isPlaying={isPlaying}
            onReplayAudio={playAudioBase64}
            onOpenSettings={() => {
              setTempWsUrl(wsUrl);
              setIsSettingsModalOpen(true);
            }}
          />
        )}

        {/* Server Connection Settings Modal (Clean Production-First with Developer Collapsible) */}
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-sm p-5 rounded-3xl glass-panel border border-cyan-500/30 shadow-2xl flex flex-col gap-4 text-slate-100">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Voice Engine Connection</h3>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Auto-Configured Cloud Engine
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Cloud Endpoint Info Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-300">Live Backend Endpoint:</span>
                <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-cyan-300 font-mono text-[11px] break-all select-all">
                  <span>{wsUrl}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Connected 24/7 to Render cloud voice engine. No manual configuration needed.
                </span>
              </div>

              {/* Advanced Developer Override Collapsible */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setShowDevServerOverride(!showDevServerOverride)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition text-xs font-semibold text-slate-300"
                >
                  <span className="flex items-center gap-2 text-slate-400">
                    <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                    Advanced Server Override (Developers)
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showDevServerOverride ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {showDevServerOverride && (
                  <div className="p-3 border-t border-white/10 flex flex-col gap-2.5 animate-in fade-in duration-150">
                    <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-cyan-400" />
                      Custom WebSocket (WSS) URL:
                    </label>
                    <input
                      type="text"
                      value={tempWsUrl}
                      onChange={(e) => setTempWsUrl(e.target.value)}
                      placeholder={DEFAULT_PROD_WS_URL}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 transition"
                    />
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <button
                        type="button"
                        onClick={() => setTempWsUrl(DEFAULT_PROD_WS_URL)}
                        className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                      >
                        Reset to Cloud Default
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="py-2.5 rounded-xl glass-pill text-xs font-semibold text-slate-300 hover:text-white transition active:scale-95"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 text-slate-950" />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Incoming & Outgoing Call Signaling Overlay */}
        <CallOverlay
          callState={callState}
          activeCall={activeCall}
          offlineNotice={offlineNotice}
          myLang={selectedLang}
          onAccept={acceptCall}
          onReject={() => rejectCall("declined")}
          onCancel={cancelCall}
          onClearOfflineNotice={clearOfflineNotice}
        />
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-[#05070e] flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center animate-pulse">
            <Headphones className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="font-medium tracking-wide">Starting ChatterBuds...</span>
        </div>
      }
    >
      <ChatterBudsApp />
    </Suspense>
  );
}
