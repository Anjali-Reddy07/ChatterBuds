"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { registerFcmDeviceToken, listenToForegroundPush } from "@/lib/firebaseClient";

export type CallState = "idle" | "calling" | "ringing" | "incoming" | "connected";

export interface ActiveCallInfo {
  roomId: string;
  partnerPhone: string;
  partnerName?: string;
  partnerLang?: string;
  isOutgoing: boolean;
  isCellular?: boolean;
}

export interface OfflineNoticeInfo {
  toPhone: string;
  roomId: string;
  message: string;
  smsInvite: string;
  whatsappLink: string;
}

interface UseCallSignalingOptions {
  wsUrl: string;
  myPhone: string;
  myLang: string;
  onCallAccepted: (roomId: string) => void;
}

export function useCallSignaling({
  wsUrl,
  myPhone,
  myLang,
  onCallAccepted,
}: UseCallSignalingOptions) {
  const [isPresenceConnected, setIsPresenceConnected] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callStatusText, setCallStatusText] = useState<string>("Connecting...");
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<OfflineNoticeInfo | null>(null);

  // Audio controls on active call overlay
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCellularTriggered, setIsCellularTriggered] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringOscillatorRef = useRef<OscillatorNode | null>(null);
  const ringGainRef = useRef<GainNode | null>(null);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cellularTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stop any active Web Audio synthesized ringtones
  const stopRingtone = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (cellularTimeoutRef.current) {
      clearTimeout(cellularTimeoutRef.current);
      cellularTimeoutRef.current = null;
    }
    if (ringOscillatorRef.current) {
      try {
        ringOscillatorRef.current.stop();
        ringOscillatorRef.current.disconnect();
      } catch (e) {
        // ignore
      }
      ringOscillatorRef.current = null;
    }
    if (ringGainRef.current) {
      try {
        ringGainRef.current.disconnect();
      } catch (e) {
        // ignore
      }
      ringGainRef.current = null;
    }
  }, []);

  // Web Audio API Outgoing Ringback Tone (Dual Tone 440Hz + 480Hz periodic pulse)
  const playOutgoingRingback = useCallback(() => {
    stopRingtone();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playPulse = () => {
        if (!ctx || ctx.state === "closed") return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);
      };

      playPulse();
      ringIntervalRef.current = setInterval(playPulse, 3000);
    } catch (e) {
      console.warn("Could not play ringback tone:", e);
    }
  }, [stopRingtone]);

  // Web Audio API Incoming Ringtone (Melodic chime sequence: 523Hz -> 659Hz -> 784Hz)
  const playIncomingRingtone = useCallback(() => {
    stopRingtone();
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([400, 200, 400, 200, 800]);
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playMelody = () => {
        if (!ctx || ctx.state === "closed") return;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + idx * 0.18;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
      };

      playMelody();
      ringIntervalRef.current = setInterval(playMelody, 2400);
    } catch (e) {
      console.warn("Could not play incoming ringtone:", e);
    }
  }, [stopRingtone]);

  // FCM Device Token Registration on user phone change
  useEffect(() => {
    const cleanPhone = myPhone.trim().replace(/[^\d+]/g, "");
    if (cleanPhone && cleanPhone.length >= 5) {
      registerFcmDeviceToken(cleanPhone, wsUrl).catch((err) =>
        console.warn("FCM auto-register notice:", err)
      );
    }
  }, [myPhone, wsUrl]);

  // Foreground FCM Push Notification listener
  useEffect(() => {
    const unsubscribe = listenToForegroundPush((callData) => {
      setCallState("incoming");
      setActiveCall({
        roomId: callData.roomId,
        partnerPhone: callData.fromPhone,
        partnerLang: callData.callerLang,
        isOutgoing: false,
      });
      playIncomingRingtone();
    });

    return () => {
      unsubscribe();
    };
  }, [playIncomingRingtone]);

  // Establish Presence WebSocket connection
  useEffect(() => {
    const cleanPhone = myPhone.trim().replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.length < 5) {
      setIsPresenceConnected(false);
      return;
    }

    let active = true;

    // Convert wsUrl to presence endpoint: wss://<host>/ws/presence/<phone>
    const cleanBase = wsUrl.replace(/\/+$/, "").replace(/\/ws\/?$/i, "");
    const presenceTarget = `${cleanBase}/ws/presence/${encodeURIComponent(cleanPhone)}`;

    const connectPresence = () => {
      try {
        const ws = new WebSocket(presenceTarget);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) return;
          setIsPresenceConnected(true);

          // 20s Keep-alive ping
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          if (!active) return;
          try {
            const data = JSON.parse(event.data);

            if (data.type === "pong") return;

            // 1. Incoming Call Event
            if (data.event === "incoming_call") {
              setCallState("incoming");
              setActiveCall({
                roomId: data.room_id,
                partnerPhone: data.from_phone,
                partnerName: data.caller_name || undefined,
                partnerLang: data.caller_lang,
                isOutgoing: false,
              });
              playIncomingRingtone();
              return;
            }

            // 2. Outgoing Call Ringing (Target user is online or ringing via FCM push)
            if (data.event === "call_ringing") {
              setCallState("ringing");
              if (data.method === "fcm") {
                setCallStatusText("Ringing via Push Notification...");
              } else {
                setCallStatusText("Ringing Partner's Phone...");
              }
              return;
            }

            // 3. Call Accepted by Callee -> Drop into live translation room
            if (data.event === "call_accepted" || data.event === "call_accepted_confirmed") {
              stopRingtone();
              setCallState("connected");
              onCallAccepted(data.room_id);
              return;
            }

            // 4. PSTN Fallback Available (User not in app or FCM timed out)
            if (data.event === "pstn_fallback_available" || data.event === "user_offline") {
              // Instead of stopping the call with a scary error, keep ringing and offer direct Cellular PSTN
              setCallStatusText("Partner offline on app. Ringing via Cellular...");
              setOfflineNotice({
                toPhone: data.to_phone,
                roomId: data.room_id,
                message: data.message || "Switching to direct cellular call...",
                smsInvite: data.sms_invite || "",
                whatsappLink: data.whatsapp_link || "",
              });
              return;
            }

            // 5. Call Rejected
            if (data.event === "call_rejected") {
              stopRingtone();
              setCallState("idle");
              setActiveCall(null);
              return;
            }

            // 6. Call Ended
            if (data.event === "call_ended") {
              stopRingtone();
              setCallState("idle");
              setActiveCall(null);
              return;
            }
          } catch (e) {
            console.error("Presence message error:", e);
          }
        };

        ws.onerror = () => {
          setIsPresenceConnected(false);
        };

        ws.onclose = () => {
          setIsPresenceConnected(false);
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          if (active) {
            setTimeout(connectPresence, 4000);
          }
        };
      } catch (err) {
        setIsPresenceConnected(false);
        if (active) {
          setTimeout(connectPresence, 4000);
        }
      }
    };

    connectPresence();

    return () => {
      active = false;
      stopRingtone();
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [wsUrl, myPhone, onCallAccepted, playIncomingRingtone, stopRingtone]);

  // Initiate Cellular Fallback via Twilio PSTN
  const startCellularCall = useCallback(
    async (targetPhone: string, currentRoomId: string) => {
      const cleanTo = targetPhone.trim().replace(/[^\d+]/g, "");
      if (!cleanTo) return;

      setIsCellularTriggered(true);
      setCallStatusText("Ringing via Cellular (Twilio PSTN)...");

      try {
        const cleanHttpBase = wsUrl
          .replace(/^ws:\/\//i, "http://")
          .replace(/^wss:\/\//i, "https://")
          .replace(/\/+$/, "")
          .replace(/\/ws\/?$/i, "");

        const res = await fetch(`${cleanHttpBase}/api/call/pstn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to_phone: cleanTo,
            from_phone: myPhone,
            room_id: currentRoomId,
            caller_lang: myLang,
            callee_lang: "Hindi", // Default target or match partner
          }),
        });
        const data = await res.json();
        console.log("Twilio PSTN call dispatched:", data);
      } catch (err) {
        console.warn("Could not dispatch cellular call:", err);
      }
    },
    [wsUrl, myPhone, myLang]
  );

  // Initiate an Outgoing Call (Tier 1 App/FCM with 20s auto-cellular fallback)
  const startCall = useCallback(
    (toPhone: string, currentRoomCode: string, resolvedName?: string) => {
      const cleanTo = toPhone.trim().replace(/[^\d+]/g, "");
      if (!cleanTo || cleanTo.length < 5) return;

      const callRoomId = currentRoomCode || Math.floor(1000 + Math.random() * 9000).toString();

      setCallState("calling");
      setCallStatusText("Connecting Voice Engine...");
      setOfflineNotice(null);
      setIsCellularTriggered(false);

      setActiveCall({
        roomId: callRoomId,
        partnerPhone: cleanTo,
        partnerName: resolvedName,
        isOutgoing: true,
      });

      playOutgoingRingback();

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: "call_invite",
            from_phone: myPhone,
            to_phone: cleanTo,
            room_id: callRoomId,
            caller_lang: myLang,
          })
        );

        // 20-second timer to auto-offer or initiate Tier 2 cellular call if no answer
        cellularTimeoutRef.current = setTimeout(() => {
          setCallStatusText("No answer on app. Ready to switch to Cellular Call.");
        }, 20000);
      } else {
        // WebSocket not ready, offer direct cellular
        setCallStatusText("Ringing via Cellular...");
        startCellularCall(cleanTo, callRoomId);
      }
    },
    [myPhone, myLang, playOutgoingRingback, startCellularCall]
  );

  // Accept an Incoming Call
  const acceptCall = useCallback(() => {
    stopRingtone();
    if (!activeCall) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: "call_accept",
          room_id: activeCall.roomId,
          from_phone: activeCall.partnerPhone,
          to_phone: myPhone,
          callee_lang: myLang,
        })
      );
    }

    setCallState("connected");
    onCallAccepted(activeCall.roomId);
  }, [activeCall, myPhone, myLang, onCallAccepted, stopRingtone]);

  // Reject an Incoming Call
  const rejectCall = useCallback(
    (reason: string = "declined") => {
      stopRingtone();
      if (activeCall && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: "call_reject",
            room_id: activeCall.roomId,
            from_phone: activeCall.partnerPhone,
            to_phone: myPhone,
            reason,
          })
        );
      }
      setCallState("idle");
      setActiveCall(null);
    },
    [activeCall, myPhone, stopRingtone]
  );

  // Cancel an Outgoing Call
  const cancelCall = useCallback(() => {
    stopRingtone();
    if (activeCall && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: "call_end",
          room_id: activeCall.roomId,
          from_phone: myPhone,
          to_phone: activeCall.partnerPhone,
        })
      );
    }
    setCallState("idle");
    setActiveCall(null);
    setIsCellularTriggered(false);
  }, [activeCall, myPhone, stopRingtone]);

  const clearOfflineNotice = useCallback(() => {
    setOfflineNotice(null);
  }, []);

  return {
    isPresenceConnected,
    callState,
    callStatusText,
    activeCall,
    offlineNotice,
    isMuted,
    toggleMute: () => setIsMuted((prev) => !prev),
    isSpeakerOn,
    toggleSpeaker: () => setIsSpeakerOn((prev) => !prev),
    isCellularTriggered,
    startCellularCall,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    clearOfflineNotice,
  };
}
