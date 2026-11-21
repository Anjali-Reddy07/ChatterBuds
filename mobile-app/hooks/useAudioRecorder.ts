"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type AudioMode = "vad" | "ptt";

interface UseAudioRecorderOptions {
  mode: AudioMode;
  isPlaying: boolean; // Echo-guard: mute capture when partner translation is playing
  onAudioChunk: (base64Audio: string) => void;
}

export function useAudioRecorder({ mode, isPlaying, onAudioChunk }: UseAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechDetectedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsSpeaking(false);
    setAudioLevel(0);
  }, []);

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data:audio/webm;base64, header
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const dispatchCurrentRecording = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return;
    const blob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });
    audioChunksRef.current = [];

    // Only dispatch if chunk contains meaningful audio size (> 2KB)
    if (blob.size > 2000) {
      try {
        const base64 = await convertBlobToBase64(blob);
        onAudioChunk(base64);
      } catch (err) {
        console.error("Audio conversion failed:", err);
      }
    }
  }, [onAudioChunk]);

  // Initialize Microphone & Analyser
  const initMicrophone = useCallback(async () => {
    if (streamRef.current) return streamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;
      setMicPermission("granted");

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      return stream;
    } catch (err) {
      console.error("Microphone access error:", err);
      setMicPermission("denied");
      return null;
    }
  }, []);

  // VAD Loop for Auto-Listen mode
  useEffect(() => {
    if (mode !== "vad") return;

    let active = true;

    const setupVAD = async () => {
      const stream = await initMicrophone();
      if (!stream || !active) return;

      const analyser = analyserRef.current;
      if (!analyser) return;

      setIsRecording(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!active) return;

        // Echo-Guard check: if partner audio is playing, do not register speech
        if (isPlayingRef.current) {
          setIsSpeaking(false);
          setAudioLevel(0);
          animationFrameRef.current = requestAnimationFrame(checkVolume);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setAudioLevel(normalized);

        const SPEECH_THRESHOLD = 18; // Sensible threshold for voice pickup in earbuds/mic

        if (normalized > SPEECH_THRESHOLD) {
          // Voice detected
          setIsSpeaking(true);
          speechDetectedRef.current = true;

          // Clear any pending silence timeout
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          // Start recorder if not active
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
            try {
              audioChunksRef.current = [];
              const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
              mediaRecorderRef.current = mr;

              mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                  audioChunksRef.current.push(e.data);
                }
              };

              mr.onstop = () => {
                dispatchCurrentRecording();
              };

              mr.start(250); // Slice data every 250ms
            } catch (e) {
              console.error("MediaRecorder start failed:", e);
            }
          }
        } else {
          // Silence detected
          if (speechDetectedRef.current && !silenceTimerRef.current) {
            // Wait 0.75s silence before slicing chunk
            silenceTimerRef.current = setTimeout(() => {
              setIsSpeaking(false);
              speechDetectedRef.current = false;
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                try {
                  mediaRecorderRef.current.stop();
                } catch (e) {
                  // ignore
                }
              }
              silenceTimerRef.current = null;
            }, 750);
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animationFrameRef.current = requestAnimationFrame(checkVolume);
    };

    setupVAD();

    return () => {
      active = false;
      cleanupAudio();
    };
  }, [mode, initMicrophone, dispatchCurrentRecording, cleanupAudio]);

  // Manual Hold-to-Talk (PTT) handlers
  const startHoldToTalk = useCallback(async () => {
    if (isPlayingRef.current) return; // Echo guard

    const stream = await initMicrophone();
    if (!stream) return;

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        dispatchCurrentRecording();
      };

      mr.start(200);
      setIsRecording(true);
      setIsSpeaking(true);
    } catch (err) {
      console.error("Failed to start manual recording:", err);
    }
  }, [initMicrophone, dispatchCurrentRecording]);

  const stopHoldToTalk = useCallback(() => {
    setIsSpeaking(false);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  return {
    isRecording,
    isSpeaking,
    audioLevel,
    micPermission,
    startHoldToTalk,
    stopHoldToTalk,
  };
}
