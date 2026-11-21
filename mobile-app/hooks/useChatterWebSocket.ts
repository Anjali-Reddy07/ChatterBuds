"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  isSelf: boolean;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: string;
  audioBase64?: string;
}

interface UseChatterWebSocketOptions {
  wsUrl: string;
  roomId: string;
  myLang: string;
  enabled: boolean;
}

export function useChatterWebSocket({ wsUrl, roomId, myLang, enabled }: UseChatterWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [partnerLang, setPartnerLang] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false); // Drives Echo-Guard
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play audio and handle Echo-Guard
  const playAudioBase64 = useCallback((base64Mp3: string) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const audioSrc = `data:audio/mp3;base64,${base64Mp3}`;
      const audio = new Audio(audioSrc);
      currentAudioRef.current = audio;

      // Echo-Guard: Mute mic capture immediately
      setIsPlaying(true);

      const handleAudioEnd = () => {
        setIsPlaying(false);
        currentAudioRef.current = null;
      };

      audio.onended = handleAudioEnd;
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        handleAudioEnd();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay was prevented by browser policy:", err);
          handleAudioEnd();
        });
      }
    } catch (err) {
      console.error("Audio initialization exception:", err);
      setIsPlaying(false);
    }
  }, []);

  const sendAudioChunk = useCallback((audioBase64: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ audio_base64: audioBase64 }));
    }
  }, []);

  useEffect(() => {
    if (!enabled || !roomId || !myLang) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setPartnerConnected(false);
      return;
    }

    setConnectionError(null);

    // Build WebSocket endpoint URL
    // Ensure clean path: e.g. ws://localhost:8000/ws/1234/Telugu
    const cleanBaseUrl = wsUrl.replace(/\/+$/, "");
    const targetUrl = `${cleanBaseUrl}/${roomId}/${encodeURIComponent(myLang)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(targetUrl);
      wsRef.current = ws;
    } catch (err) {
      console.error("WebSocket constructor error:", err);
      setConnectionError("Invalid WebSocket server URL");
      return;
    }

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionError(null);

      // Setup 15-second keep-alive ping
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Ping/Pong
        if (data.type === "pong") {
          return;
        }

        // Room error / capacity full
        if (data.event === "error") {
          setConnectionError(data.message || "Room is full or inaccessible");
          return;
        }

        // Partner connection status
        if (data.event === "partner_status") {
          setPartnerConnected(Boolean(data.connected));
          if (data.partner_lang) {
            setPartnerLang(data.partner_lang);
          }
          return;
        }

        // Translation Message
        if (data.event === "message") {
          const isIncoming = Boolean(data.incoming);
          const newMsg: ChatMessage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            isSelf: Boolean(data.self) || !isIncoming,
            originalText: data.original_text || "",
            translatedText: data.translated_text || "",
            sourceLang: data.source_lang || myLang,
            targetLang: data.target_lang || "Translation",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            audioBase64: data.audio_base64 || undefined,
          };

          setMessages((prev) => [...prev, newMsg]);

          // If incoming message contains synthesized audio, auto-play into earbuds with Echo-Guard
          if (isIncoming && data.audio_base64) {
            playAudioBase64(data.audio_base64);
          }
        }
      } catch (e) {
        console.error("WebSocket message parsing error:", e);
      }
    };

    ws.onerror = (e) => {
      console.error("WebSocket transport error:", e);
      setConnectionError("Failed to connect to ChatterBuds voice engine");
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setPartnerConnected(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (event.code === 4003) {
        setConnectionError("Room is already at full capacity (2/2 participants).");
      }
    };

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [enabled, roomId, myLang, wsUrl, playAudioBase64]);

  return {
    isConnected,
    partnerConnected,
    partnerLang,
    messages,
    isPlaying,
    connectionError,
    sendAudioChunk,
    playAudioBase64,
  };
}
