"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Edit2,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { syncUserProfile, registerFcmDeviceToken } from "@/lib/firebaseClient";

interface ProfileRegistrationCardProps {
  myPhone: string;
  onSetMyPhone: (phone: string) => void;
  displayName: string | null;
  onSetDisplayName: (name: string) => void;
  myLang: string;
  isPresenceConnected?: boolean;
  wsUrl?: string;
}

export function ProfileRegistrationCard({
  myPhone,
  onSetMyPhone,
  displayName,
  onSetDisplayName,
  myLang,
  isPresenceConnected,
  wsUrl,
}: ProfileRegistrationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [phoneInput, setPhoneInput] = useState(myPhone || "+91");
  const [nameInput, setNameInput] = useState(displayName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load stored preferences on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("chatterbuds_display_name");
      const storedPhone = localStorage.getItem("chatterbuds_my_phone");

      if (storedName && storedName.trim()) {
        onSetDisplayName(storedName.trim());
        setNameInput(storedName.trim());
      }
      if (storedPhone && storedPhone.trim()) {
        onSetMyPhone(storedPhone.trim());
        setPhoneInput(storedPhone.trim());
      }

      // If user hasn't configured a display name yet, open edit mode automatically
      if (!storedName || !storedName.trim()) {
        setIsEditing(true);
      }
    }
  }, [onSetDisplayName, onSetMyPhone]);

  // Keep local inputs in sync with parent props
  useEffect(() => {
    if (myPhone) setPhoneInput(myPhone);
  }, [myPhone]);

  useEffect(() => {
    if (displayName) setNameInput(displayName);
  }, [displayName]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phoneInput.trim();
    const cleanName = nameInput.trim();

    if (!cleanPhone || cleanPhone.length < 5) return;
    const finalName = cleanName || "User";

    setIsSaving(true);

    try {
      // 1. Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("chatterbuds_my_phone", cleanPhone);
        localStorage.setItem("chatterbuds_display_name", finalName);
      }

      onSetMyPhone(cleanPhone);
      onSetDisplayName(finalName);

      // 2. Request FCM Push Notification permission and register device token in Firestore
      let fcmToken: string | null = null;
      try {
        fcmToken = await registerFcmDeviceToken(cleanPhone, wsUrl || "");
      } catch (fcmErr) {
        console.warn("FCM token generation notice:", fcmErr);
      }

      // 3. Sync profile to Firestore `users/{cleanPhone}` and backend `/api/user/profile`
      await syncUserProfile({
        phoneNumber: cleanPhone,
        displayName: finalName,
        preferredLanguage: myLang,
        fcmToken,
        backendHttpUrl: wsUrl,
      });

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Save profile error:", err);
      // Still update locally
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = Boolean(displayName && displayName.trim() && myPhone && myPhone.trim().length > 6);

  return (
    <div className="p-3.5 rounded-2xl glass-panel border border-white/10 shadow-lg flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <User className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Your Profile &amp; Caller ID
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isPresenceConnected ? (
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">Ready</span>
          )}

          {!isEditing && isConfigured && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Edit Profile"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE: Configured Profile Display */}
      {!isEditing && isConfigured ? (
        <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/25 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-bold text-xs text-emerald-300 uppercase">
                {displayName ? displayName.slice(0, 2) : "ME"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  {displayName}
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                </span>
                <span className="text-[11px] font-mono text-slate-400">{myPhone}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition"
            >
              Edit
            </button>
          </div>

          <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Caller ID Active &bull; Registered in Firestore
            </span>
            <span className="text-cyan-400 font-semibold">{myLang}</span>
          </div>
        </div>
      ) : (
        /* EDIT / REGISTRATION FORM */
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-2.5 pt-0.5">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-400" />
              Mobile Number (Callable ID):
            </label>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+91 98765 43210"
              required
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <User className="w-3 h-3 text-cyan-400" />
              Your Display Name (Caller ID):
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Anjali Reddy"
              required
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <p className="text-[10px] text-slate-400 leading-tight">
            This name will be resolved and displayed on partners&apos; dial pads and incoming call screens.
          </p>

          <div className="flex items-center gap-2 pt-1">
            {isConfigured && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="py-2 px-3 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving || !phoneInput.trim() || !nameInput.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Activating Caller ID...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-950" />
                  <span>Profile Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Save &amp; Activate Caller ID</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
