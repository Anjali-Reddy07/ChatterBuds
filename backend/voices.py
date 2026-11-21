"""
Language mapping configuration for Whisper STT and Microsoft Edge-TTS voices.
"""

from typing import Optional, Dict

# Mapping of display language names to Edge-TTS neural voices and Whisper ISO language codes
LANGUAGE_CONFIG: Dict[str, Dict[str, Optional[str]]] = {
    "Auto-Detect": {
        "whisper_code": None,  # Let Whisper auto-detect spoken language
        "tts_voice": "en-US-JennyNeural",
        "direction": "ltr",
        "native_name": "Auto Detect",
    },
    "English": {
        "whisper_code": "en",
        "tts_voice": "en-US-JennyNeural",
        "direction": "ltr",
        "native_name": "English",
    },
    "Telugu": {
        "whisper_code": "te",
        "tts_voice": "te-IN-ShrutiNeural",
        "direction": "ltr",
        "native_name": "తెలుగు",
    },
    "Hindi": {
        "whisper_code": "hi",
        "tts_voice": "hi-IN-MadhurNeural",
        "direction": "ltr",
        "native_name": "हिन्दी",
    },
    "Odia": {
        "whisper_code": None,  # Whisper handles Odia, Edge-TTS fallback to Bengali/Hindi neural voice
        "tts_voice": "bn-IN-TanishaaNeural",
        "direction": "ltr",
        "native_name": "ଓଡ଼ିଆ",
    },
    "Tamil": {
        "whisper_code": "ta",
        "tts_voice": "ta-IN-PallaviNeural",
        "direction": "ltr",
        "native_name": "தமிழ்",
    },
    "Kannada": {
        "whisper_code": "kn",
        "tts_voice": "kn-IN-SapnaNeural",
        "direction": "ltr",
        "native_name": "ಕನ್ನಡ",
    },
    "Malayalam": {
        "whisper_code": "ml",
        "tts_voice": "ml-IN-SobhanaNeural",
        "direction": "ltr",
        "native_name": "മലയാളം",
    },
    "Bengali": {
        "whisper_code": "bn",
        "tts_voice": "bn-IN-BashkarNeural",
        "direction": "ltr",
        "native_name": "বাংলা",
    },
    "Marathi": {
        "whisper_code": "mr",
        "tts_voice": "mr-IN-AarohiNeural",
        "direction": "ltr",
        "native_name": "मराठी",
    },
    "Gujarati": {
        "whisper_code": "gu",
        "tts_voice": "gu-IN-DhwaniNeural",
        "direction": "ltr",
        "native_name": "ગુજરાતી",
    },
    "Spanish": {
        "whisper_code": "es",
        "tts_voice": "es-ES-AlvaroNeural",
        "direction": "ltr",
        "native_name": "Español",
    },
    "French": {
        "whisper_code": "fr",
        "tts_voice": "fr-FR-HenriNeural",
        "direction": "ltr",
        "native_name": "Français",
    },
    "German": {
        "whisper_code": "de",
        "tts_voice": "de-DE-ConradNeural",
        "direction": "ltr",
        "native_name": "Deutsch",
    },
    "Japanese": {
        "whisper_code": "ja",
        "tts_voice": "ja-JP-KeitaNeural",
        "direction": "ltr",
        "native_name": "日本語",
    },
    "Korean": {
        "whisper_code": "ko",
        "tts_voice": "ko-KR-InJoonNeural",
        "direction": "ltr",
        "native_name": "한국어",
    },
    "Chinese": {
        "whisper_code": "zh",
        "tts_voice": "zh-CN-YunxiNeural",
        "direction": "ltr",
        "native_name": "中文",
    },
    "Arabic": {
        "whisper_code": "ar",
        "tts_voice": "ar-SA-HamedNeural",
        "direction": "rtl",
        "native_name": "العربية",
    },
    "Russian": {
        "whisper_code": "ru",
        "tts_voice": "ru-RU-DmitryNeural",
        "direction": "ltr",
        "native_name": "Русский",
    },
    "Portuguese": {
        "whisper_code": "pt",
        "tts_voice": "pt-BR-AntonioNeural",
        "direction": "ltr",
        "native_name": "Português",
    },
}

def get_tts_voice(language: str) -> str:
    """Return the Edge-TTS voice identifier for a given language name."""
    cfg = LANGUAGE_CONFIG.get(language)
    if cfg and cfg.get("tts_voice"):
        return cfg["tts_voice"]
    return "en-US-JennyNeural"

def get_whisper_code(language: str) -> Optional[str]:
    """Return the ISO language code for Groq Whisper transcription."""
    cfg = LANGUAGE_CONFIG.get(language)
    if cfg:
        return cfg.get("whisper_code")
    return None
