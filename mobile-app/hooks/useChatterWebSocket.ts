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
  originalAudioBase64?: string;
  translatedAudioBase64?: string;
  durationSec?: number;
  status?: "sent" | "delivered" | "played";
  isVoiceNote?: boolean;
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
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [wakeAttempt, setWakeAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stop currently playing audio
  const pauseAudio = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
      } catch (e) {
        // ignore
      }
      currentAudioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentlyPlayingId(null);
  }, []);

  // Play audio and handle Echo-Guard
  const playAudioBase64 = useCallback((base64Mp3: string, msgId?: string, speed: number = 1.0) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const audioSrc = `data:audio/mp3;base64,${base64Mp3}`;
      const audio = new Audio(audioSrc);
      audio.playbackRate = speed;
      currentAudioRef.current = audio;

      // Echo-Guard: Mute mic capture immediately
      setIsPlaying(true);
      if (msgId) setCurrentlyPlayingId(msgId);

      const handleAudioEnd = () => {
        setIsPlaying(false);
        setCurrentlyPlayingId(null);
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
      setCurrentlyPlayingId(null);
    }
  }, []);

  const sendAudioChunk = useCallback((audioBase64: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ audio_base64: audioBase64 }));
    }
  }, []);

  // Send a recorded voice note
  const sendVoiceNote = useCallback((audioBase64: string, durationSec: number, senderPhone?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const noteId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      wsRef.current.send(
        JSON.stringify({
          event: "voice_note",
          note_id: noteId,
          audio_base64: audioBase64,
          duration_sec: durationSec,
          sender_phone: senderPhone || "",
          sender_lang: myLang,
        })
      );
    }
  }, [myLang]);

  // Mark a voice note as played by recipient (triggers blue double ticks ✓✓)
  const markNotePlayed = useCallback((noteId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: "note_played",
          note_id: noteId,
        })
      );
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

    // Auto-correct any localhost URLs when running on remote devices
    let effectiveWsUrl = wsUrl;
    if (isLocalhostMismatch(effectiveWsUrl) || !effectiveWsUrl || effectiveWsUrl.includes("localhost")) {
      if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        effectiveWsUrl = "wss://chatterbuds-api.onrender.com/ws";
      }
    }

    let active = true;
    const healthUrl = getHealthUrl(effectiveWsUrl);

    // Step 1: Health check / Render cold-start ping before WebSocket connection
    const wakeServerAndConnect = async () => {
      let serverReady = false;
      let attempts = 0;

      // Only show waking banner if not localhost
      const isRemote = !effectiveWsUrl.includes("localhost") && !effectiveWsUrl.includes("127.0.0.1");
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
      const cleanBaseUrl = effectiveWsUrl.replace(/\/+$/, "");
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

            // Room History Replay
            if (data.event === "room_history" && Array.isArray(data.messages)) {
              const loadedMessages: ChatMessage[] = data.messages.map((m: any) => ({
                id: m.note_id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                isSelf: Boolean(m.self),
                originalText: m.original_text || "",
                translatedText: m.translated_text || "",
                sourceLang: m.source_lang || myLang,
                targetLang: m.target_lang || "Translation",
                timestamp: m.timestamp
                  ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                audioBase64: m.incoming ? m.translated_audio_base64 : m.original_audio_base64,
                originalAudioBase64: m.original_audio_base64,
                translatedAudioBase64: m.translated_audio_base64,
                durationSec: m.duration_sec || 0,
                status: m.status || "delivered",
                isVoiceNote: true,
              }));
              setMessages(loadedMessages);
              return;
            }

            // Voice Note Delivered
            if (data.event === "voice_note_delivered") {
              const isIncoming = Boolean(data.incoming);
              const noteId = data.note_id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
              const newNote: ChatMessage = {
                id: noteId,
                isSelf: Boolean(data.self) || !isIncoming,
                originalText: data.original_text || "",
                translatedText: data.translated_text || "",
                sourceLang: data.source_lang || myLang,
                targetLang: data.target_lang || "Translation",
                timestamp: data.timestamp
                  ? new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                audioBase64: isIncoming ? data.translated_audio_base64 : data.original_audio_base64,
                originalAudioBase64: data.original_audio_base64,
                translatedAudioBase64: data.translated_audio_base64,
                durationSec: data.duration_sec || 0,
                status: data.status || "delivered",
                isVoiceNote: true,
              };

              setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m.id === noteId)) {
                  return prev.map((m) => (m.id === noteId ? newNote : m));
                }
                return [...prev, newNote];
              });
              return;
            }

            // Voice Note Played Receipt (Turns double ticks to blue ✓✓)
            if (data.event === "note_played") {
              const noteId = data.note_id;
              if (noteId) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === noteId ? { ...m, status: "played" } : m))
                );
              }
              return;
            }

            // Translation Message (Live Call Stream)
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
                status: "played",
                isVoiceNote: false,
              };

              setMessages((prev) => [...prev, newMsg]);

              // If incoming live call chunk contains audio, auto-play into earbuds with Echo-Guard
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
          console.warn("WebSocket transport notice (retrying automatically):", e);
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
            return;
          }
          // Automatic retry every 3s
          setTimeout(() => {
            if (active && enabled) {
              wakeServerAndConnect();
            }
          }, 3000);
        };
      } catch (err) {
        if (!active) return;
        console.warn("WebSocket construction notice, auto-retrying in 3s:", err);
        setTimeout(() => {
          if (active && enabled) {
            wakeServerAndConnect();
          }
        }, 3000);
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
    currentlyPlayingId,
    connectionError,
    isWakingServer,
    wakeAttempt,
    isLocalhostIssue: isLocalhostMismatch(wsUrl),
    sendAudioChunk,
    sendVoiceNote,
    markNotePlayed,
    playAudioBase64,
    pauseAudio,
  };
}
