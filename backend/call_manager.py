"""
Call signaling and presence manager for ChatterBuds.
Maps normalized mobile phone numbers to active presence WebSockets and routes
call_invite, call_accept, call_reject, and call_end signals.
"""

import asyncio
import re
import json
import logging
from typing import Dict, Optional, Set
from fastapi import WebSocket

from fcm_service import fcm_service

logger = logging.getLogger("chatterbuds.calls")


def normalize_phone_number(raw_phone: str) -> str:
    """
    Normalizes phone numbers to standard E.164-style strings.
    Strips spaces, parentheses, hyphens, dots.
    Ensures leading '+' if country code is present.
    Example: ' +91 98765-43210 ' -> '+919876543210'
    """
    if not raw_phone:
        return ""
    cleaned = re.sub(r"[^\d+]", "", raw_phone.strip())
    if cleaned and not cleaned.startswith("+"):
        # If no plus, assume standard international or prepend plus
        cleaned = f"+{cleaned}"
    return cleaned


class CallManager:
    def __init__(self):
        # Maps normalized phone number -> WebSocket connection
        self.presence_directory: Dict[str, WebSocket] = {}
        # Reverse mapping: WebSocket -> normalized phone number
        self.ws_to_phone: Dict[WebSocket, str] = {}
        # Active calls mapping: room_id -> {caller_phone, callee_phone, caller_lang, callee_lang, status}
        self.active_calls: Dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def register_presence(self, phone_number: str, websocket: WebSocket) -> str:
        """Register a user's presence by normalized mobile number."""
        norm_phone = normalize_phone_number(phone_number)
        if not norm_phone:
            return ""

        async with self._lock:
            # If previous connection exists for this number, close or replace it cleanly
            if norm_phone in self.presence_directory:
                old_ws = self.presence_directory[norm_phone]
                if old_ws != websocket:
                    try:
                        self.ws_to_phone.pop(old_ws, None)
                    except Exception:
                        pass

            self.presence_directory[norm_phone] = websocket
            self.ws_to_phone[websocket] = norm_phone
            logger.info(f"User presence registered: {norm_phone} (Total online: {len(self.presence_directory)})")
            return norm_phone

    async def unregister_presence(self, websocket: WebSocket) -> Optional[str]:
        """Unregister user presence on disconnect."""
        async with self._lock:
            phone = self.ws_to_phone.pop(websocket, None)
            if phone and phone in self.presence_directory:
                if self.presence_directory[phone] == websocket:
                    del self.presence_directory[phone]
            if phone:
                logger.info(f"User presence unregistered: {phone} (Remaining online: {len(self.presence_directory)})")
            return phone

    async def is_online(self, phone_number: str) -> bool:
        """Check if target mobile number is currently online."""
        norm_phone = normalize_phone_number(phone_number)
        async with self._lock:
            return norm_phone in self.presence_directory

    async def get_presence_socket(self, phone_number: str) -> Optional[WebSocket]:
        """Get active WebSocket for a phone number."""
        norm_phone = normalize_phone_number(phone_number)
        async with self._lock:
            return self.presence_directory.get(norm_phone)

    async def handle_call_invite(
        self,
        caller_ws: WebSocket,
        from_phone: str,
        to_phone: str,
        room_id: str,
        caller_lang: str,
    ):
        """
        Routes call_invite signal.
        If recipient is online: sends incoming_call to callee and call_ringing to caller.
        If recipient is offline: returns user_offline to caller with instant invite link.
        """
        norm_from = normalize_phone_number(from_phone)
        norm_to = normalize_phone_number(to_phone)

        # Lookup Registered / Caller ID Name for caller and callee
        caller_profile = await fcm_service.get_user_profile(norm_from)
        caller_name = (
            caller_profile.get("displayName") or caller_profile.get("truecallerName")
            if caller_profile
            else None
        )

        callee_profile = await fcm_service.get_user_profile(norm_to)
        callee_name = (
            callee_profile.get("displayName") or callee_profile.get("truecallerName")
            if callee_profile
            else None
        )

        logger.info(f"Call invite: {norm_from} ({caller_name}) -> {norm_to} ({callee_name}) [Room #{room_id}] (Lang: {caller_lang})")

        callee_ws = await self.get_presence_socket(norm_to)

        if callee_ws:
            # Tier 1 (Online): Recipient is connected via WebSocket! Ring directly
            try:
                await callee_ws.send_json({
                    "event": "incoming_call",
                    "from_phone": norm_from,
                    "caller_name": caller_name,
                    "to_phone": norm_to,
                    "room_id": room_id,
                    "caller_lang": caller_lang,
                })

                await caller_ws.send_json({
                    "event": "call_ringing",
                    "to_phone": norm_to,
                    "callee_name": callee_name,
                    "room_id": room_id,
                    "method": "websocket",
                    "message": "Ringing partner's phone in app...",
                })

                async with self._lock:
                    self.active_calls[room_id] = {
                        "caller_phone": norm_from,
                        "caller_name": caller_name,
                        "callee_phone": norm_to,
                        "callee_name": callee_name,
                        "caller_lang": caller_lang,
                        "status": "ringing",
                        "method": "websocket",
                    }
                return
            except Exception as e:
                logger.warning(f"Failed to ring {norm_to} via WebSocket: {e}")

        # Tier 1 (Offline / Background): Check for FCM device token to wake background device
        fcm_sent = await fcm_service.send_incoming_call_push(
            to_phone=norm_to,
            from_phone=norm_from,
            room_id=room_id,
            caller_lang=caller_lang,
            caller_name=caller_name,
        )

        if fcm_sent:
            await caller_ws.send_json({
                "event": "call_ringing",
                "to_phone": norm_to,
                "callee_name": callee_name,
                "room_id": room_id,
                "method": "fcm",
                "message": "Ringing partner's phone via background push...",
                "pstn_available": True,
            })

            async with self._lock:
                self.active_calls[room_id] = {
                    "caller_phone": norm_from,
                    "caller_name": caller_name,
                    "callee_phone": norm_to,
                    "callee_name": callee_name,
                    "caller_lang": caller_lang,
                    "status": "ringing",
                    "method": "fcm",
                }
            return

        # Tier 2 (Not registered / No FCM Token): Cellular PSTN fallback is immediately ready
        await caller_ws.send_json({
            "event": "pstn_fallback_available",
            "to_phone": norm_to,
            "room_id": room_id,
            "message": f"{norm_to} is not on the app. Ready to dial via cellular (Twilio PSTN).",
            "sms_invite": (
                f"Hey! I'm calling you on ChatterBuds for real-time two-way voice translation. "
                f"Join my live voice room here: https://mobile-app-mu-snowy.vercel.app/?room={room_id}"
            ),
            "whatsapp_link": f"https://wa.me/{norm_to.replace('+', '')}?text=Join%20my%20live%20voice%20translation%20room%20on%20ChatterBuds!%20https://mobile-app-mu-snowy.vercel.app/?room={room_id}",
        })

    async def handle_call_accept(
        self,
        callee_ws: WebSocket,
        room_id: str,
        from_phone: str,
        to_phone: str,
        callee_lang: str,
    ):
        """Callee accepted the call: notifies the caller so both enter the live translation room."""
        norm_caller = normalize_phone_number(from_phone)
        norm_callee = normalize_phone_number(to_phone)

        logger.info(f"Call accepted: {norm_callee} accepted call from {norm_caller} [Room #{room_id}]")

        caller_ws = await self.get_presence_socket(norm_caller)
        if caller_ws:
            try:
                await caller_ws.send_json({
                    "event": "call_accepted",
                    "room_id": room_id,
                    "from_phone": norm_caller,
                    "to_phone": norm_callee,
                    "callee_lang": callee_lang,
                })
            except Exception as e:
                logger.warning(f"Could not notify caller of acceptance: {e}")

        # Also confirm to callee
        try:
            await callee_ws.send_json({
                "event": "call_accepted_confirmed",
                "room_id": room_id,
                "partner_phone": norm_caller,
            })
        except Exception:
            pass

        async with self._lock:
            if room_id in self.active_calls:
                self.active_calls[room_id]["status"] = "connected"
                self.active_calls[room_id]["callee_lang"] = callee_lang

    async def handle_call_reject(
        self,
        callee_ws: WebSocket,
        room_id: str,
        from_phone: str,
        to_phone: str,
        reason: str = "declined",
    ):
        """Callee rejected or busy: notify caller."""
        norm_caller = normalize_phone_number(from_phone)
        norm_callee = normalize_phone_number(to_phone)

        logger.info(f"Call rejected by {norm_callee} for {norm_caller} (Reason: {reason})")

        caller_ws = await self.get_presence_socket(norm_caller)
        if caller_ws:
            try:
                await caller_ws.send_json({
                    "event": "call_rejected",
                    "room_id": room_id,
                    "from_phone": norm_callee,
                    "reason": reason,
                })
            except Exception:
                pass

        async with self._lock:
            self.active_calls.pop(room_id, None)

    async def handle_call_end(
        self,
        sender_ws: WebSocket,
        room_id: str,
        from_phone: str,
        to_phone: str,
    ):
        """End active or ringing call."""
        norm_from = normalize_phone_number(from_phone)
        norm_to = normalize_phone_number(to_phone)

        logger.info(f"Call ended by {norm_from} in room #{room_id}")

        target_ws = await self.get_presence_socket(norm_to)
        if target_ws and target_ws != sender_ws:
            try:
                await target_ws.send_json({
                    "event": "call_ended",
                    "room_id": room_id,
                    "from_phone": norm_from,
                })
            except Exception:
                pass

        async with self._lock:
            self.active_calls.pop(room_id, None)

    def get_active_count(self) -> int:
        return len(self.presence_directory)


call_manager = CallManager()
