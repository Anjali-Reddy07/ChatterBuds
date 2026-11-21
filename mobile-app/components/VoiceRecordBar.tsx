"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Trash2, Send, Radio, Sparkles } from "lucide-react";

interface VoiceRecordBarProps {
  onSendVoiceNote: (audioBase64: string, durationSec: number) => void;
  myLang: string;
  isPartnerConnected: boolean;
}

export function VoiceRecordBar({ onSendVoiceNote, myLang, isPartnerConnected }: VoiceRecordBarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 20, 10, 30, 25, 40]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  // Pick best supported MIME type across iOS Safari and Android Chrome
  const getSupportedMimeType = () => {
    if (typeof window === "undefined" || !window.MediaRecorder) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    return "";
  };

  const cleanupRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
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
    setRecordDuration(0);
  }, []);

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Start Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Live waveform visualizer update
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWave = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sampled = [
          dataArray[2] || 20,
          dataArray[4] || 40,
          dataArray[6] || 60,
          dataArray[8] || 80,
          dataArray[10] || 50,
          dataArray[12] || 30,
        ].map((v) => Math.max(15, Math.min(100, Math.round((v / 255) * 100))));
        setAudioLevels(sampled);
        animFrameRef.current = requestAnimationFrame(updateWave);
      };
      updateWave();
    } catch (err) {
      console.error("Microphone access error:", err);
      cleanupRecording();
    }
  };

  // Finish and dispatch voice note
  const finishAndSend = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      cleanupRecording();
      return;
    }

    const duration = Math.max(1, recordDuration);

    mediaRecorderRef.current.onstop = async () => {
      const mimeType = getSupportedMimeType() || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      if (blob.size > 800) {
        try {
          const base64 = await convertBlobToBase64(blob);
          onSendVoiceNote(base64, duration);
        } catch (e) {
          console.error("Audio serialization error:", e);
        }
      }
      cleanupRecording();
    };

    try {
      mediaRecorderRef.current.stop();
    } catch (e) {
      cleanupRecording();
    }
  };

  const cancelRecording = () => {
    audioChunksRef.current = [];
    cleanupRecording();
  };

  return (
    <div className="p-3 bg-[#202C33] border-t border-[#313D45] flex items-center justify-between gap-3 shadow-2xl safe-bottom">
      {isRecording ? (
        /* ACTIVE RECORDING STATE */
        <div className="flex-1 flex items-center justify-between gap-2 bg-[#111B21] rounded-2xl px-3.5 py-2.5 border border-[#00A884]/40 animate-in fade-in duration-200">
          {/* Pulsing Red Dot & Timer */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping-slow shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              0:{recordDuration < 10 ? "0" : ""}
              {recordDuration}
            </span>
          </div>

          {/* Live Audio Visualizer Bars */}
          <div className="flex items-center gap-1.5 h-6">
            {audioLevels.map((lvl, idx) => (
              <div
                key={idx}
                style={{ height: `${lvl}%` }}
                className="w-1.5 bg-[#00A884] rounded-full transition-all duration-100"
              />
            ))}
          </div>

          {/* Discard & Send Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              type="button"
              className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition active:scale-90"
              title="Cancel Recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={finishAndSend}
              type="button"
              className="w-9 h-9 rounded-full bg-[#00A884] hover:bg-[#02906f] text-[#0B141A] flex items-center justify-center transition active:scale-95 shadow-lg"
              title="Send Translated Voice Note"
            >
              <Send className="w-4 h-4 ml-0.5 fill-current" />
            </button>
          </div>
        </div>
      ) : (
        /* IDLE STATE: Strictly Voice Recording (No Text Field) */
        <div className="flex-1 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#111B21] border border-white/5 text-xs text-[#8696A0]">
            <Radio className="w-4 h-4 text-[#00A884] shrink-0 animate-pulse" />
            <span className="truncate">
              Speak in <strong className="text-white">{myLang}</strong> • Translates automatically
            </span>
          </div>

          {/* Big Emerald Microphone Record Button */}
          <button
            onClick={startRecording}
            type="button"
            className="w-11 h-11 rounded-full bg-[#00A884] hover:bg-[#02906f] active:scale-95 text-[#0B141A] flex items-center justify-center shadow-lg shadow-[#00A884]/30 transition-all duration-150 group"
            title="Record Voice Note (Tap to start)"
          >
            <Mic className="w-5 h-5 text-[#0B141A] transition-transform group-hover:scale-110" />
          </button>
        </div>
      )}
    </div>
  );
}
