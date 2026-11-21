"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RoomSetup } from "@/components/RoomSetup";
import { LiveConversation } from "@/components/LiveConversation";
import { useChatterWebSocket } from "@/hooks/useChatterWebSocket";
import { useAudioRecorder, AudioMode, ConversationMode } from "@/hooks/useAudioRecorder";
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
} from "lucide-react";

function ChatterBudsApp() {
  const searchParams = useSearchParams();

  // Screen state: "setup" or "live"
  const [screen, setScreen] = useState<"setup" | "live">("setup");

  // Room & Language state
  const [roomCode, setRoomCode] = useState("1234");
  const [selectedLang, setSelectedLang] = useState("Telugu");
  const [conversationMode, setConversationMode] = useState<ConversationMode>("in-person");
  const [mode, setMode] = useState<AudioMode>("vad");

  // In-App Browser (Instagram / WhatsApp WebView) Guard
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [dismissInAppBanner, setDismissInAppBanner] = useState(false);

  // Server Settings Modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // WebSocket Server URL
  const defaultWsUrl =
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
  const [wsUrl, setWsUrl] = useState(defaultWsUrl);
  const [tempWsUrl, setTempWsUrl] = useState(defaultWsUrl);

  // Check user agent and stored preferences on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isWebView = /Instagram|FBAN|FBAV|WhatsApp|Line|MicroMessenger/i.test(ua);
      setIsInAppBrowser(isWebView);

      // Check URL query param ?room=XXXX on load
      const queryRoom = searchParams.get("room");
      if (queryRoom && queryRoom.trim().length > 0) {
        setRoomCode(queryRoom.trim());
      } else {
        const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
        setRoomCode(randomCode);
      }

      // Check stored conversation mode
      const savedConvMode = localStorage.getItem("chatterbuds_conv_mode");
      if (savedConvMode === "in-person" || savedConvMode === "remote") {
        setConversationMode(savedConvMode);
      }

      // Check stored custom WS URL
      const savedWsUrl = localStorage.getItem("chatterbuds_ws_url");
      if (savedWsUrl && savedWsUrl.trim().length > 0) {
        setWsUrl(savedWsUrl.trim());
        setTempWsUrl(savedWsUrl.trim());
      }
    }
  }, [searchParams]);

  // WebSocket connection hook
  const {
    isConnected,
    partnerConnected,
    partnerLang,
    messages,
    isPlaying,
    connectionError,
    isWakingServer,
    wakeAttempt,
    isLocalhostIssue,
    sendAudioChunk,
    playAudioBase64,
  } = useChatterWebSocket({
    wsUrl,
    roomId: roomCode,
    myLang: selectedLang,
    enabled: screen === "live",
  });

  // Audio Recorder & VAD hook (with Echo-Guard protection and ConversationMode sensitivity calibration)
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
    setScreen("live");
  };

  const handleLeaveRoom = () => {
    setScreen("setup");
  };

  const handleSelectConversationMode = (newMode: ConversationMode) => {
    setConversationMode(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("chatterbuds_conv_mode", newMode);
    }
  };

  const handleSaveSettings = () => {
    const cleanUrl = tempWsUrl.trim();
    setWsUrl(cleanUrl);
    if (typeof window !== "undefined") {
      localStorage.setItem("chatterbuds_ws_url", cleanUrl);
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

        {/* Screen Routing */}
        {screen === "setup" ? (
          <div className="px-4 py-1 flex-1 flex flex-col justify-between">
            <RoomSetup
              roomCode={roomCode}
              onSetRoomCode={setRoomCode}
              selectedLang={selectedLang}
              onSelectLang={setSelectedLang}
              conversationMode={conversationMode}
              onSelectConversationMode={handleSelectConversationMode}
              wsUrl={wsUrl}
              onSetWsUrl={setWsUrl}
              onJoinRoom={handleJoinRoom}
              onOpenSettings={() => {
                setTempWsUrl(wsUrl);
                setIsSettingsModalOpen(true);
              }}
              isServerWaking={isWakingServer}
            />
          </div>
        ) : (
          <LiveConversation
            roomCode={roomCode}
            myLang={selectedLang}
            partnerConnected={partnerConnected}
            partnerLang={partnerLang}
            mode={mode}
            conversationMode={conversationMode}
            onSetMode={setMode}
            onLeaveRoom={handleLeaveRoom}
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

        {/* Server Connection Settings Modal */}
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-sm p-5 rounded-3xl glass-panel border border-cyan-500/30 shadow-2xl flex flex-col gap-4 text-slate-100">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Backend Server URL</h3>
                </div>
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  WebSocket (WSS) Endpoint
                </label>
                <input
                  type="text"
                  value={tempWsUrl}
                  onChange={(e) => setTempWsUrl(e.target.value)}
                  placeholder="wss://chatterbuds-backend.onrender.com/ws"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 leading-relaxed flex flex-col gap-1.5">
                <div className="flex items-center gap-1 text-slate-300 font-semibold">
                  <HelpCircle className="w-3 h-3 text-cyan-400" />
                  <span>Where do I get this URL?</span>
                </div>
                <p>
                  • <strong>Render Cloud:</strong> <code className="text-cyan-300">wss://your-app.onrender.com/ws</code>
                  <br />
                  • <strong>Local Tunnel:</strong> <code className="text-cyan-300">wss://&lt;tunnel-host&gt;/ws</code>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="py-2.5 rounded-xl glass-pill text-xs font-semibold text-slate-300 hover:text-white transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95 flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 text-slate-950" />
                  Save &amp; Connect
                </button>
              </div>
            </div>
          </div>
        )}
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
