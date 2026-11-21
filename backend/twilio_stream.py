"""
Twilio Programmable Voice + Bidirectional Media Stream Bridge for ChatterBuds.
Bridges 8kHz mu-law cellular phone audio with Groq Whisper, Llama 3.3, and Edge-TTS
so normal telephone callers can converse with live speech translation.
"""

import os
import json
import base64
import logging
import asyncio
from typing import Dict, Optional
from datetime import datetime, timezone

from fastapi import WebSocket
from audio_codec import (
    mulaw_to_pcm16,
    pcm16_to_mulaw,
    resample_linear_pcm,
    pcm16_to_wav_bytes,
)

logger = logging.getLogger("chatterbuds.twilio")

# Active Twilio stream sessions mapping: room_id -> TwilioSession
active_twilio_sessions: Dict[str, "TwilioSession"] = {}


class TwilioSession:
    def __init__(
        self,
        room_id: str,
        websocket: WebSocket,
        stream_sid: str = "",
        caller_lang: str = "English",
        callee_lang: str = "Hindi",
    ):
        self.room_id = room_id
        self.websocket = websocket
        self.stream_sid = stream_sid
        self.caller_lang = caller_lang
        self.callee_lang = callee_lang
        self.audio_buffer = bytearray()
        self.last_speech_time = datetime.now(timezone.utc).timestamp()
        self.is_speaking = False
        self.closed = False

    async def send_audio_to_phone(self, mp3_bytes: bytes):
        """
        Takes synthesized MP3 audio from Edge-TTS, decodes to 8kHz 16-bit PCM via miniaudio,
        converts to 8-bit mu-law, and streams 160-byte (20ms) chunks to Twilio.
        """
        if self.closed or not self.stream_sid:
            return

        try:
            import miniaudio

            decoded = miniaudio.decode(mp3_bytes, nchannels=1, sample_rate=8000)
            pcm16_bytes = decoded.samples.tobytes()
            mulaw_bytes = pcm16_to_mulaw(pcm16_bytes)

            chunk_size = 160  # 20ms at 8000 Hz 8-bit
            for i in range(0, len(mulaw_bytes), chunk_size):
                if self.closed:
                    break
                chunk = mulaw_bytes[i : i + chunk_size]
                payload_b64 = base64.b64encode(chunk).decode("utf-8")
                msg = {
                    "event": "media",
                    "streamSid": self.stream_sid,
                    "media": {"payload": payload_b64},
                }
                await self.websocket.send_text(json.dumps(msg))
                await asyncio.sleep(0.018)  # Smooth real-time pacing
        except Exception as e:
            logger.error(f"Error streaming audio to Twilio: {e}")


def initiate_pstn_call(
    to_phone: str,
    from_phone: str,
    room_id: str,
    caller_lang: str,
    callee_lang: str,
    host: str,
) -> dict:
    """
    Initiates an outbound Twilio cellular call attaching a bidirectional Media Stream.
    """
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    twilio_number = os.getenv("TWILIO_PHONE_NUMBER", "").strip()

    if not (account_sid and auth_token and twilio_number):
        logger.warning("Twilio credentials not configured. Returning stub status.")
        return {
            "status": "unconfigured",
            "message": "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER not configured.",
            "to_phone": to_phone,
            "room_id": room_id,
        }

    from twilio.rest import Client

    client = Client(account_sid, auth_token)

    # Clean backend host for wss protocol
    clean_host = host.replace("http://", "").replace("https://", "").replace("ws://", "").replace("wss://", "")
    stream_url = f"wss://{clean_host}/ws/twilio-media/{room_id}"

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi">Connecting to ChatterBuds live speech translator.</Say>
    <Connect>
        <Stream url="{stream_url}">
            <Parameter name="caller_lang" value="{caller_lang}" />
            <Parameter name="callee_lang" value="{callee_lang}" />
        </Stream>
    </Connect>
</Response>"""

    try:
        call = client.calls.create(
            to=to_phone,
            from_=twilio_number,
            twiml=twiml,
        )
        logger.info(f"Twilio PSTN call initiated: {call.sid} to {to_phone} for room #{room_id}")
        return {
            "status": "queued",
            "call_sid": call.sid,
            "to_phone": to_phone,
            "room_id": room_id,
            "stream_url": stream_url,
        }
    except Exception as e:
        logger.error(f"Failed to initiate Twilio call to {to_phone}: {e}")
        return {
            "status": "error",
            "message": str(e),
            "to_phone": to_phone,
            "room_id": room_id,
        }


async def broadcast_to_twilio_cellular(room_id: str, mp3_bytes: bytes):
    """
    If a Twilio cellular phone participant is active in this room,
    stream the translated audio directly to their telephone receiver.
    """
    session = active_twilio_sessions.get(room_id)
    if session and not session.closed:
        await session.send_audio_to_phone(mp3_bytes)
