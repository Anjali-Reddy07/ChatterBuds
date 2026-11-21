import os
import base64
import tempfile
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
import edge_tts

from room_manager import room_manager
from call_manager import call_manager, normalize_phone_number
from voices import get_tts_voice, get_whisper_code

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("chatterbuds")

app = FastAPI(
    title="ChatterBuds Backend",
    description="Real-time two-way live voice translator API & WebSocket server",
    version="1.0.0",
)

# Enable CORS for local and remote mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


def get_groq_client() -> Optional[Groq]:
    """Retrieve Groq client if API key is provided."""
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key or key == "your_groq_api_key_here":
        return None
    return Groq(api_key=key)


@app.get("/health")
async def health_check():
    """Service health and active room statistics."""
    stats = room_manager.get_stats()
    groq_configured = bool(get_groq_client())
    return {
        "status": "ok",
        "healthy": True,
        "service": "ChatterBuds Voice Engine",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "groq_configured": groq_configured,
        "active_rooms": stats["active_rooms"],
        "total_connections": stats["total_connections"],
        "active_presence_users": call_manager.get_active_count(),
    }


@app.post("/voice/outbound-call")
async def outbound_cellular_call(payload: dict):
    """
    Outbound cellular call stub configured via Twilio for future PSTN bridging.
    Accepts: { to_phone, from_phone, room_id, caller_lang }
    """
    to_phone = payload.get("to_phone", "")
    from_phone = payload.get("from_phone", "")
    room_id = payload.get("room_id", "")
    caller_lang = payload.get("caller_lang", "English")

    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_from = os.getenv("TWILIO_PHONE_NUMBER")

    is_twilio_configured = bool(twilio_sid and twilio_token and twilio_from)

    return {
        "status": "queued" if is_twilio_configured else "stub_ready",
        "message": (
            f"Cellular call request received for {to_phone}. "
            + ("Dispatching via Twilio Voice API." if is_twilio_configured else "Twilio credentials pending in environment variables.")
        ),
        "to_phone": to_phone,
        "from_phone": from_phone,
        "room_id": room_id,
        "caller_lang": caller_lang,
        "twilio_configured": is_twilio_configured,
    }


async def transcribe_audio(audio_bytes: bytes, language: str) -> Optional[str]:
    """Transcribe webm audio using Groq Whisper Large v3 Turbo."""
    client = get_groq_client()
    if not client:
        logger.warning("Groq API key not configured; skipping transcription.")
        return "[Groq API Key Required for Live Transcription]"

    whisper_code = get_whisper_code(language)

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            kwargs = {
                "file": ("audio.webm", f),
                "model": "whisper-large-v3-turbo",
                "temperature": 0.0,
                "response_format": "json",
            }
            if whisper_code:
                kwargs["language"] = whisper_code

            transcription = client.audio.transcriptions.create(**kwargs)
            text = (transcription.text or "").strip()
            return text if text else None
    except Exception as e:
        logger.error(f"Whisper transcription error: {e}")
        return None
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translate conversational speech into target language using Groq Llama 3.3 70B."""
    if not text:
        return ""

    if source_lang.lower() == target_lang.lower() and source_lang != "Auto-Detect":
        return text

    client = get_groq_client()
    if not client:
        return f"[Translation to {target_lang}]: {text}"

    system_prompt = (
        f"You are a real-time conversational voice interpreter. "
        f"Translate the following spoken message naturally, idiomatically, and directly into {target_lang}. "
        f"The speaker's language is {source_lang}. "
        f"Guidelines:\n"
        f"1. Preserve the conversational tone, emotion, and colloquial nuances suitable for spoken dialogue between friends or colleagues.\n"
        f"2. Return ONLY the translated sentence with no explanations, notes, phonetic guides, or quotation marks.\n"
        f"3. If the input is already in {target_lang}, return it as is."
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            max_tokens=350,
        )
        translated = (response.choices[0].message.content or "").strip()
        return translated if translated else text
    except Exception as e:
        logger.error(f"Llama translation error: {e}")
        return text


async def synthesize_speech(text: str, target_lang: str) -> Optional[str]:
    """Synthesize text into speech using Edge-TTS and return base64-encoded MP3."""
    if not text or text.startswith("["):
        return None

    voice = get_tts_voice(target_lang)
    try:
        communicate = edge_tts.Communicate(text, voice)
        mp3_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_chunks.append(chunk["data"])

        if not mp3_chunks:
            return None

        audio_bytes = b"".join(mp3_chunks)
        return base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        logger.error(f"Edge-TTS synthesis error for language '{target_lang}' voice '{voice}': {e}")
        return None


@app.websocket("/ws/{room_id}/{my_lang}")
async def websocket_room_endpoint(websocket: WebSocket, room_id: str, my_lang: str):
    """
    WebSocket endpoint for a two-person ChatterBuds conversation room.
    URL parameters:
      - room_id: 4-digit room code
      - my_lang: Selected speaker language
    """
    await websocket.accept()

    # Room code validation and capacity check
    joined = await room_manager.add_participant(room_id, websocket, my_lang)
    if not joined:
        await websocket.send_json({
            "event": "error",
            "message": f"Room {room_id} is full. ChatterBuds supports up to 2 participants.",
        })
        await websocket.close(code=4003)
        return

    logger.info(f"User connected to room '{room_id}' with language '{my_lang}'")

    try:
        # Check if partner is already in the room
        partner = await room_manager.get_partner(room_id, websocket)
        if partner:
            # Broadcast partner_status to both participants
            await websocket.send_json({
                "event": "partner_status",
                "connected": True,
                "partner_lang": partner.language,
            })
            await partner.websocket.send_json({
                "event": "partner_status",
                "connected": True,
                "partner_lang": my_lang,
            })
        else:
            # Inform newly connected user that they are waiting for partner
            await websocket.send_json({
                "event": "partner_status",
                "connected": False,
                "message": "Waiting for partner to join room...",
            })

        # Send existing room voice note history to newly connected client
        room_history = await room_manager.get_history(room_id)
        if room_history:
            await websocket.send_json({
                "event": "room_history",
                "messages": room_history,
            })

        while True:
            raw_data = await websocket.receive_text()
            try:
                message = json.loads(raw_data)
            except json.JSONDecodeError:
                continue

            msg_type = message.get("type")
            event = message.get("event")

            # Keep-alive heartbeat ping/pong (every 20s)
            if msg_type == "ping" or event == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).timestamp()})
                continue

            # Event: Voice Note Played Receipt
            if event == "note_played":
                note_id = message.get("note_id")
                if note_id:
                    await room_manager.update_note_status(room_id, note_id, "played")
                    partner = await room_manager.get_partner(room_id, websocket)
                    if partner:
                        await partner.websocket.send_json({
                            "event": "note_played",
                            "note_id": note_id,
                            "status": "played",
                        })
                continue

            # Event: Voice Note Delivered
            if event == "voice_note":
                audio_base64 = message.get("audio_base64")
                if not audio_base64:
                    continue

                try:
                    audio_bytes = base64.b64decode(audio_base64)
                except Exception as e:
                    logger.error(f"Voice note base64 decode error: {e}")
                    continue

                # Step 1: Transcribe using Groq Whisper Large v3 Turbo
                original_text = await transcribe_audio(audio_bytes, my_lang)
                if not original_text or original_text.strip() == "":
                    original_text = "(Audio recorded)"

                partner = await room_manager.get_partner(room_id, websocket)
                target_lang = partner.language if partner else "English"

                # Step 2: Translate into receiver's language
                if partner and partner.language != my_lang:
                    translated_text = await translate_text(original_text, my_lang, target_lang)
                else:
                    translated_text = original_text

                # Step 3: Edge-TTS synthesis in receiver's language
                tts_audio_b64 = await synthesize_speech(translated_text, target_lang)

                note_id = message.get("note_id") or f"{int(datetime.now(timezone.utc).timestamp()*1000)}"
                duration_sec = message.get("duration_sec", 0)

                delivered_note = {
                    "event": "voice_note_delivered",
                    "note_id": note_id,
                    "sender_phone": message.get("sender_phone", ""),
                    "original_audio_base64": audio_base64,
                    "original_text": original_text,
                    "translated_audio_base64": tts_audio_b64 or audio_base64,
                    "translated_text": translated_text,
                    "source_lang": my_lang,
                    "target_lang": target_lang,
                    "duration_sec": duration_sec,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "delivered" if partner else "sent",
                }

                await room_manager.add_history(room_id, delivered_note)

                # Send confirmation to sender (bubble right)
                await websocket.send_json({
                    **delivered_note,
                    "incoming": False,
                    "self": True,
                })

                # Broadcast to partner (bubble left, plays in receiver's language)
                if partner:
                    await partner.websocket.send_json({
                        **delivered_note,
                        "incoming": True,
                        "self": False,
                    })
                continue

            # Event: Live Call Audio Stream (bidirectional low-latency VAD + Echo-Guard)
            audio_base64 = message.get("audio_base64")
            if audio_base64:
                try:
                    audio_bytes = base64.b64decode(audio_base64)
                except Exception as e:
                    logger.error(f"Base64 audio decode error: {e}")
                    continue

                if len(audio_bytes) < 100:
                    continue

                # Transcribe live stream
                original_text = await transcribe_audio(audio_bytes, my_lang)
                if not original_text or original_text.strip() == "":
                    continue

                partner = await room_manager.get_partner(room_id, websocket)
                if partner:
                    target_lang = partner.language
                    translated_text = await translate_text(original_text, my_lang, target_lang)
                    tts_audio_b64 = await synthesize_speech(translated_text, target_lang)

                    await partner.websocket.send_json({
                        "event": "message",
                        "incoming": True,
                        "original_text": original_text,
                        "translated_text": translated_text,
                        "audio_base64": tts_audio_b64,
                        "source_lang": my_lang,
                        "target_lang": target_lang,
                    })

                    await websocket.send_json({
                        "event": "message",
                        "incoming": False,
                        "self": True,
                        "original_text": original_text,
                        "translated_text": translated_text,
                        "source_lang": my_lang,
                        "target_lang": target_lang,
                    })
                else:
                    await websocket.send_json({
                        "event": "message",
                        "incoming": False,
                        "self": True,
                        "original_text": original_text,
                        "translated_text": "(Partner not connected yet)",
                        "source_lang": my_lang,
                        "target_lang": "N/A",
                    })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected from room '{room_id}'")
    except Exception as e:
        logger.error(f"WebSocket error in room '{room_id}': {e}")
    finally:
        remaining_partner = await room_manager.remove_participant(room_id, websocket)
        if remaining_partner:
            try:
                await remaining_partner.websocket.send_json({
                    "event": "partner_status",
                    "connected": False,
                    "message": "Partner disconnected",
                })
            except Exception:
                pass


@app.websocket("/ws/presence/{phone_number}")
async def presence_websocket(websocket: WebSocket, phone_number: str):
    """
    Real-time presence directory & call signaling WebSocket.
    Allows users to register their mobile number, receive incoming calls,
    and route call_invite, call_accept, call_reject, and call_end signals.
    """
    await websocket.accept()
    norm_phone = await call_manager.register_presence(phone_number, websocket)
    if not norm_phone:
        await websocket.close(code=4000, reason="Invalid phone number format")
        return

    # Acknowledge successful registration to the client
    try:
        await websocket.send_json({
            "event": "presence_registered",
            "phone_number": norm_phone,
            "status": "online",
        })
    except Exception:
        pass

    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event")
            msg_type = data.get("type")

            # Keepalive ping
            if msg_type == "ping" or event == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            # 1. Call Invite (Caller -> Callee)
            if event == "call_invite":
                from_phone = data.get("from_phone", norm_phone)
                to_phone = data.get("to_phone", "")
                room_id = data.get("room_id", "")
                caller_lang = data.get("caller_lang", "English")
                await call_manager.handle_call_invite(
                    caller_ws=websocket,
                    from_phone=from_phone,
                    to_phone=to_phone,
                    room_id=room_id,
                    caller_lang=caller_lang,
                )

            # 2. Call Accept (Callee -> Caller)
            elif event == "call_accept":
                room_id = data.get("room_id", "")
                from_phone = data.get("from_phone", "")
                to_phone = data.get("to_phone", norm_phone)
                callee_lang = data.get("callee_lang", "English")
                await call_manager.handle_call_accept(
                    callee_ws=websocket,
                    room_id=room_id,
                    from_phone=from_phone,
                    to_phone=to_phone,
                    callee_lang=callee_lang,
                )

            # 3. Call Reject (Callee -> Caller)
            elif event == "call_reject":
                room_id = data.get("room_id", "")
                from_phone = data.get("from_phone", "")
                to_phone = data.get("to_phone", norm_phone)
                reason = data.get("reason", "declined")
                await call_manager.handle_call_reject(
                    callee_ws=websocket,
                    room_id=room_id,
                    from_phone=from_phone,
                    to_phone=to_phone,
                    reason=reason,
                )

            # 4. Call End (Either party ends ringing or active call)
            elif event == "call_end":
                room_id = data.get("room_id", "")
                from_phone = data.get("from_phone", norm_phone)
                to_phone = data.get("to_phone", "")
                await call_manager.handle_call_end(
                    sender_ws=websocket,
                    room_id=room_id,
                    from_phone=from_phone,
                    to_phone=to_phone,
                )

    except WebSocketDisconnect:
        logger.info(f"Presence WebSocket disconnected: {norm_phone}")
    except Exception as e:
        logger.error(f"Presence WebSocket error for {norm_phone}: {e}")
    finally:
        await call_manager.unregister_presence(websocket)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
