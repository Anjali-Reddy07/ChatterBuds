"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  const [isPlaying, setIsPlaying] = useState(false); // Drives Echo-Guard
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "speaking" | "translating">("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [wakeAttempt, setWakeAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Play audio sequentially from queue
  const processAudioQueue = useCallback(() => {
    if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    const nextAudioB64 = audioQueueRef.current.shift();
    if (!nextAudioB64) return;

    isPlayingQueueRef.current = true;
    setIsPlaying(true);
    setCallStatus("translating");

    try {
      const audioSrc = `data:audio/mp3;base64,${nextAudioB64}`;
      const audio = new Audio(audioSrc);
      currentAudioRef.current = audio;

      const finishCurrent = () => {
        isPlayingQueueRef.current = false;
        currentAudioRef.current = null;
        if (audioQueueRef.current.length > 0) {
          processAudioQueue();
        } else {
          setIsPlaying(false);
          setCallStatus("connected");
        }
      };

      audio.onended = finishCurrent;
      audio.onerror = (e) => {
        console.warn("Audio queue playback error:", e);
        finishCurrent();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay was prevented by browser policy:", err);
          finishCurrent();
        });
      }
    } catch (err) {
      console.warn("Audio initialization exception:", err);
      isPlayingQueueRef.current = false;
      setIsPlaying(false);
      setCallStatus("connected");
    }
  }, []);

  const queueAudioBase64 = useCallback(
    (base64Mp3: string) => {
      audioQueueRef.current.push(base64Mp3);
      processAudioQueue();
    },
    [processAudioQueue]
  );

  const sendAudioChunk = useCallback((audioBase64: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ audio_base64: audioBase64 }));
    }
  }, []);

  const changeLanguage = useCallback((newLang: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: "update_language", language: newLang }));
    }
  }, []);

  const getHealthUrl = useCallback((rawWsUrl: string) => {
    return (
      rawWsUrl
        .replace(/^wss:\/\//i, "https://")
        .replace(/^ws:\/\//i, "http://")
        .replace(/\/ws\/?$/i, "")
        .replace(/\/+$/, "") + "/health"
    );
  }, []);

  const isLocalhostMismatch = useCallback((rawWsUrl: string) => {
    if (typeof window === "undefined") return false;
    const isLocalBackend = rawWsUrl.includes("localhost") || rawWsUrl.includes("127.0.0.1");
    const isRemoteClient =
      !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1");
    return isLocalBackend && isRemoteClient;
  }, []);

  useEffect(() => {
    if (!enabled || !roomId) {
      setIsConnected(false);
      setPartnerConnected(false);
      setCallStatus("connecting");
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let active = true;
    abortControllerRef.current = new AbortController();

    const connect = async () => {
      let effectiveWsUrl = wsUrl;
      if (isLocalhostMismatch(effectiveWsUrl)) {
        effectiveWsUrl = "wss://chatterbuds-api.onrender.com/ws";
      }

      // Render cold-start wake-up
      const isRemoteHost =
        effectiveWsUrl.includes("onrender.com") ||
        (!effectiveWsUrl.includes("localhost") && !effectiveWsUrl.includes("127.0.0.1"));

      if (isRemoteHost && typeof window !== "undefined") {
        setIsWakingServer(true);
        const healthUrl = getHealthUrl(effectiveWsUrl);
        let healthy = false;
        let attempts = 0;

        while (!healthy && attempts < 8 && active) {
          attempts++;
          setWakeAttempt(attempts);
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(healthUrl, {
              signal: controller.signal,
              cache: "no-store",
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              healthy = true;
            }
          } catch {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }

      if (!active) return;
      setIsWakingServer(false);

      // Establish pure voice room WebSocket
      const cleanBaseUrl = effectiveWsUrl.replace(/\/+$/, "");
      const targetUrl = `${cleanBaseUrl}/${roomId}/${encodeURIComponent(myLang)}`;

      try {
        const ws = new WebSocket(targetUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) return;
          setIsConnected(true);
          setConnectionError(null);
          setCallStatus("connected");

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

            if (data.type === "pong") return;

            if (data.event === "error") {
              setConnectionError(data.message || "Room is full or inaccessible");
              return;
            }

            if (data.event === "partner_status") {
              setPartnerConnected(Boolean(data.connected));
              if (data.partner_lang) {
                setPartnerLang(data.partner_lang);
              }
              return;
            }

            if (data.event === "partner_language_updated") {
              if (data.partner_lang) {
                setPartnerLang(data.partner_lang);
              }
              return;
            }

            // Pure Audio-to-Audio stream event: Play directly through earbuds
            if (data.event === "audio_stream" && data.audio_base64) {
              queueAudioBase64(data.audio_base64);
              return;
            }

            // Compatibility fallback for raw audio message
            if (data.event === "message" && data.audio_base64 && data.incoming) {
              queueAudioBase64(data.audio_base64);
              return;
            }
          } catch (e) {
            console.warn("WebSocket parse notice:", e);
          }
        };

        ws.onerror = () => {
          if (active) {
            setConnectionError("Connecting to voice engine...");
          }
        };

        ws.onclose = (e) => {
          if (!active) return;
          setIsConnected(false);
          setPartnerConnected(false);
          setCallStatus("connecting");
          if (e.code === 4003) {
            setConnectionError("Room is full. ChatterBuds supports up to 2 participants.");
          } else {
            setTimeout(() => {
              if (active) connect();
            }, 3000);
          }
        };
      } catch (err) {
        if (active) {
          setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      active = false;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      audioQueueRef.current = [];
      isPlayingQueueRef.current = false;
    };
  }, [enabled, roomId, myLang, wsUrl, getHealthUrl, isLocalhostMismatch, queueAudioBase64]);

  return {
    isConnected,
    partnerConnected,
    partnerLang,
    isPlaying,
    callStatus,
    connectionError,
    isWakingServer,
    wakeAttempt,
    isLocalhostIssue: isLocalhostMismatch(wsUrl),
    sendAudioChunk,
    changeLanguage,
    playAudioBase64: queueAudioBase64,
  };
}
