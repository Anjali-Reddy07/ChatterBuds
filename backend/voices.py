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

# Direct code & alias lookup map
VOICE_ALIASES: Dict[str, str] = {
    # Telugu
    "te": "te-IN-ShrutiNeural",
    "telugu": "te-IN-ShrutiNeural",
    # Hindi
    "hi": "hi-IN-MadhurNeural",
    "hindi": "hi-IN-MadhurNeural",
    # English
    "en": "en-US-JennyNeural",
    "english": "en-US-JennyNeural",
    # Odia
    "or": "bn-IN-TanishaaNeural",
    "odia": "bn-IN-TanishaaNeural",
    # Tamil
    "ta": "ta-IN-PallaviNeural",
    "tamil": "ta-IN-PallaviNeural",
    # Kannada
    "kn": "kn-IN-SapnaNeural",
    "kannada": "kn-IN-SapnaNeural",
    # Malayalam
    "ml": "ml-IN-SobhanaNeural",
    "malayalam": "ml-IN-SobhanaNeural",
    # Bengali
    "bn": "bn-IN-BashkarNeural",
    "bengali": "bn-IN-BashkarNeural",
    # Marathi
    "mr": "mr-IN-AarohiNeural",
    "marathi": "mr-IN-AarohiNeural",
    # Gujarati
    "gu": "gu-IN-DhwaniNeural",
    "gujarati": "gu-IN-DhwaniNeural",
    # Chinese
    "zh": "zh-CN-YunxiNeural",
    "zh-cn": "zh-CN-YunxiNeural",
    "chinese": "zh-CN-YunxiNeural",
    "mandarin": "zh-CN-YunxiNeural",
    # Spanish
    "es": "es-ES-AlvaroNeural",
    "spanish": "es-ES-AlvaroNeural",
    # French
    "fr": "fr-FR-HenriNeural",
    "french": "fr-FR-HenriNeural",
    # German
    "de": "de-DE-ConradNeural",
    "german": "de-DE-ConradNeural",
    # Japanese
    "ja": "ja-JP-KeitaNeural",
    "japanese": "ja-JP-KeitaNeural",
    # Korean
    "ko": "ko-KR-InJoonNeural",
    "korean": "ko-KR-InJoonNeural",
    # Arabic
    "ar": "ar-SA-HamedNeural",
    "arabic": "ar-SA-HamedNeural",
    # Russian
    "ru": "ru-RU-DmitryNeural",
    "russian": "ru-RU-DmitryNeural",
    # Portuguese
    "pt": "pt-BR-AntonioNeural",
    "portuguese": "pt-BR-AntonioNeural",
}

def get_tts_voice(language: str) -> str:
    """Return the Edge-TTS voice identifier for a given language name or code."""
    if not language:
        return "en-US-JennyNeural"

    # 1. Direct configuration match
    cfg = LANGUAGE_CONFIG.get(language)
    if cfg and cfg.get("tts_voice"):
        return cfg["tts_voice"]

    # 2. Lowercase alias/code match
    clean = language.strip().lower()
    if clean in VOICE_ALIASES:
        return VOICE_ALIASES[clean]

    # 3. Case-insensitive lookup in LANGUAGE_CONFIG
    for lang_name, conf in LANGUAGE_CONFIG.items():
        if lang_name.lower() == clean and conf.get("tts_voice"):
            return conf["tts_voice"]

    return "en-US-JennyNeural"

def get_whisper_code(language: str) -> Optional[str]:
    """Return the ISO language code for Groq Whisper transcription."""
    if not language:
        return None
    clean = language.strip().lower()
    if clean in ["auto", "auto-detect", "whisper", "none"]:
        return None

    cfg = LANGUAGE_CONFIG.get(language)
    if cfg and cfg.get("whisper_code"):
        return cfg.get("whisper_code")

    for lang_name, conf in LANGUAGE_CONFIG.items():
        if lang_name.lower() == clean:
            return conf.get("whisper_code")

    # If it's already a 2-letter ISO code
    if len(clean) == 2:
        return clean

    return None
