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
        "status": "healthy",
        "service": "ChatterBuds Voice Engine",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "groq_configured": groq_configured,
        "active_rooms": stats["active_rooms"],
        "total_connections": stats["total_connections"],
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

        while True:
            raw_data = await websocket.receive_text()
            try:
                message = json.loads(raw_data)
            except json.JSONDecodeError:
                continue

            msg_type = message.get("type")
            event = message.get("event")

            # Keep-alive heartbeat ping/pong
            if msg_type == "ping" or event == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).timestamp()})
                continue

            # Process voice chunk
            audio_base64 = message.get("audio_base64")
            if audio_base64:
                try:
                    audio_bytes = base64.b64decode(audio_base64)
                except Exception as e:
                    logger.error(f"Base64 audio decode error: {e}")
                    continue

                if len(audio_bytes) < 100:
                    # Audio chunk too short/empty
                    continue

                # Step 1: Transcribe using Groq Whisper Large v3 Turbo
                original_text = await transcribe_audio(audio_bytes, my_lang)
                if not original_text or original_text.strip() == "":
                    # Pure silence or unintelligible noise
                    continue

                logger.info(f"[{room_id}] [{my_lang}] Transcribed: {original_text}")

                partner = await room_manager.get_partner(room_id, websocket)
                if partner:
                    target_lang = partner.language
                    # Step 2: Translate into partner's language
                    translated_text = await translate_text(original_text, my_lang, target_lang)
                    logger.info(f"[{room_id}] -> [{target_lang}] Translated: {translated_text}")

                    # Step 3: Edge-TTS synthesis into base64 MP3
                    tts_audio_b64 = await synthesize_speech(translated_text, target_lang)

                    # Step 4: Dispatch to partner (incoming message with audio for earbud auto-play)
                    await partner.websocket.send_json({
                        "event": "message",
                        "incoming": True,
                        "original_text": original_text,
                        "translated_text": translated_text,
                        "audio_base64": tts_audio_b64,
                        "source_lang": my_lang,
                        "target_lang": target_lang,
                    })

                    # Step 5: Dispatch confirmation to sender (self transcript)
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
                    # Partner not connected yet; echo transcript to sender
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
