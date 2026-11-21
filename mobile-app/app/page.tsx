"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RoomSetup } from "@/components/RoomSetup";
import { LiveConversation } from "@/components/LiveConversation";
import { useChatterWebSocket } from "@/hooks/useChatterWebSocket";
import { useAudioRecorder, AudioMode } from "@/hooks/useAudioRecorder";
import { Headphones } from "lucide-react";

function ChatterBudsApp() {
  const searchParams = useSearchParams();

  // Screen state: "setup" or "live"
  const [screen, setScreen] = useState<"setup" | "live">("setup");

  // Room & Language state
  const [roomCode, setRoomCode] = useState("1234");
  const [selectedLang, setSelectedLang] = useState("Telugu");
  const [mode, setMode] = useState<AudioMode>("vad");

  // WebSocket Server URL
  const defaultWsUrl =
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
  const [wsUrl, setWsUrl] = useState(defaultWsUrl);

  // Check URL query param ?room=XXXX on load
  useEffect(() => {
    const queryRoom = searchParams.get("room");
    if (queryRoom && queryRoom.trim().length > 0) {
      setRoomCode(queryRoom.trim());
    } else {
      // Auto-generate random 4-digit code if none in URL
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomCode(randomCode);
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
    sendAudioChunk,
    playAudioBase64,
  } = useChatterWebSocket({
    wsUrl,
    roomId: roomCode,
    myLang: selectedLang,
    enabled: screen === "live",
  });

  // Audio Recorder & VAD hook (with Echo-Guard protection)
  const {
    isRecording,
    isSpeaking,
    audioLevel,
    micPermission,
    startHoldToTalk,
    stopHoldToTalk,
  } = useAudioRecorder({
    mode,
    isPlaying,
    onAudioChunk: sendAudioChunk,
  });

  const handleJoinRoom = () => {
    setScreen("live");
  };

  const handleLeaveRoom = () => {
    setScreen("setup");
  };

  return (
    <main className="w-full min-h-screen bg-transparent text-slate-100 flex flex-col justify-start items-center">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col min-h-screen safe-top safe-bottom">
        {screen === "setup" ? (
          <div className="px-4 py-2 flex-1 flex flex-col justify-between">
            <RoomSetup
              roomCode={roomCode}
              onSetRoomCode={setRoomCode}
              selectedLang={selectedLang}
              onSelectLang={setSelectedLang}
              wsUrl={wsUrl}
              onSetWsUrl={setWsUrl}
              onJoinRoom={handleJoinRoom}
            />
          </div>
        ) : (
          <LiveConversation
            roomCode={roomCode}
            myLang={selectedLang}
            partnerConnected={partnerConnected}
            partnerLang={partnerLang}
            mode={mode}
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
            messages={messages}
            isPlaying={isPlaying}
            onReplayAudio={playAudioBase64}
          />
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
