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
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [wakeAttempt, setWakeAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Helper to extract HTTP / HTTPS health check URL from WebSocket URL
  const getHealthUrl = useCallback((rawWsUrl: string) => {
    return rawWsUrl
      .replace(/^wss:\/\//i, "https://")
      .replace(/^ws:\/\//i, "http://")
      .replace(/\/ws\/?$/i, "")
      .replace(/\/+$/, "") + "/health";
  }, []);

  // Check if WebSocket URL is pointing to localhost while running on a mobile/remote device
  const isLocalhostMismatch = useCallback((rawWsUrl: string) => {
    if (typeof window === "undefined") return false;
    const isLocalBackend = rawWsUrl.includes("localhost") || rawWsUrl.includes("127.0.0.1");
    const isRemoteClient = !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1");
    return isLocalBackend && isRemoteClient;
  }, []);

  useEffect(() => {
    if (!enabled || !roomId || !myLang) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setPartnerConnected(false);
      setIsWakingServer(false);
      return;
    }

    setConnectionError(null);

    // Guard: Mobile device opening localhost URL
    if (isLocalhostMismatch(wsUrl)) {
      setConnectionError(
        "Backend URL is currently set to 'localhost'. Please update your Server URL to your public Render or Tunnel URL."
      );
      return;
    }

    let active = true;
    const healthUrl = getHealthUrl(wsUrl);

    // Step 1: Health check / Render cold-start ping before WebSocket connection
    const wakeServerAndConnect = async () => {
      let serverReady = false;
      let attempts = 0;

      // Only show waking banner if not localhost
      const isRemote = !wsUrl.includes("localhost") && !wsUrl.includes("127.0.0.1");
      if (isRemote) {
        setIsWakingServer(true);
      }

      while (active && !serverReady && attempts < 15) {
        attempts++;
        setWakeAttempt(attempts);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const res = await fetch(healthUrl, {
            method: "GET",
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            serverReady = true;
            break;
          }
        } catch (e) {
          // Server still spinning up (Render cold-start)
          if (!active) return;
          // Wait 3 seconds before next retry
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      if (!active) return;
      setIsWakingServer(false);

      // Step 2: Establish WebSocket
      const cleanBaseUrl = wsUrl.replace(/\/+$/, "");
      const targetUrl = `${cleanBaseUrl}/${roomId}/${encodeURIComponent(myLang)}`;

      try {
        const ws = new WebSocket(targetUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) return;
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
          if (!active) return;
          try {
            const data = JSON.parse(event.data);

            // Ping/Pong
            if (data.type === "pong") return;

            // Room full error
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
          if (!active) return;
          console.error("WebSocket transport error:", e);
          setConnectionError("Unable to reach ChatterBuds server. Check server URL or wake-up status.");
        };

        ws.onclose = (event) => {
          if (!active) return;
          setIsConnected(false);
          setPartnerConnected(false);
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          if (event.code === 4003) {
            setConnectionError("Room is already full (2/2 participants).");
          }
        };
      } catch (err) {
        if (!active) return;
        setConnectionError("Invalid WebSocket server URL");
      }
    };

    wakeServerAndConnect();

    return () => {
      active = false;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, roomId, myLang, wsUrl, playAudioBase64, getHealthUrl, isLocalhostMismatch]);

  return {
    isConnected,
    partnerConnected,
    partnerLang,
    messages,
    isPlaying,
    connectionError,
    isWakingServer,
    wakeAttempt,
    isLocalhostIssue: isLocalhostMismatch(wsUrl),
    sendAudioChunk,
    playAudioBase64,
  };
}
