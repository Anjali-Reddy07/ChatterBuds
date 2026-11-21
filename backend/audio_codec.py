"""
Pure-Python ITU-T G.711 mu-law (PCMU) codec and linear PCM audio resampler.
Zero external C-dependencies; compatible with Python 3.10 through 3.15+.
Designed for Twilio Programmable Voice 8kHz mu-law Bidirectional Media Streams.
"""

import struct
import io
import wave
from typing import List

# Precomputed ITU-T G.711 mu-law to 16-bit linear PCM lookup table (256 entries)
MULAW_TO_LINEAR: List[int] = []
for i in range(256):
    mu = ~i & 0xFF
    sign = -1 if (mu & 0x80) else 1
    exponent = (mu >> 4) & 0x07
    mantissa = mu & 0x0F
    linear = sign * (((mantissa << 3) + 0x84) << exponent) - (sign * 0x84)
    # Clip to signed 16-bit
    linear = max(-32768, min(32767, linear))
    MULAW_TO_LINEAR.append(linear)


def mulaw_to_pcm16(mulaw_bytes: bytes) -> bytes:
    """
    Decodes an 8-bit mu-law (PCMU) audio byte stream into 16-bit signed linear PCM (little-endian).
    Sample rate remains unchanged (typically 8000 Hz).
    """
    pcm_samples = [MULAW_TO_LINEAR[b] for b in mulaw_bytes]
    return struct.pack(f"<{len(pcm_samples)}h", *pcm_samples)


def pcm16_to_mulaw(pcm_bytes: bytes) -> bytes:
    """
    Encodes a 16-bit signed linear PCM byte stream (little-endian) into 8-bit mu-law (PCMU).
    Sample rate remains unchanged (typically 8000 Hz).
    """
    sample_count = len(pcm_bytes) // 2
    if sample_count == 0:
        return b""

    samples = struct.unpack(f"<{sample_count}h", pcm_bytes)
    mulaw_out = bytearray(sample_count)

    BIAS = 0x84
    CLIP = 32635

    for idx, sample in enumerate(samples):
        sign = 0x80 if sample < 0 else 0
        if sample < 0:
            sample = -sample

        if sample > CLIP:
            sample = CLIP

        sample += BIAS
        exponent = 7
        mask = 0x4000
        while (sample & mask) == 0 and exponent > 0:
            exponent -= 1
            mask >>= 1

        mantissa = (sample >> (exponent + 3)) & 0x0F
        byte_val = ~(sign | (exponent << 4) | mantissa) & 0xFF
        mulaw_out[idx] = byte_val

    return bytes(mulaw_out)


def resample_linear_pcm(pcm_bytes: bytes, in_rate: int, out_rate: int) -> bytes:
    """
    Resamples mono 16-bit linear PCM audio using linear interpolation.
    Commonly used to convert 8000 Hz <-> 16000 Hz.
    """
    if in_rate == out_rate:
        return pcm_bytes

    num_samples = len(pcm_bytes) // 2
    if num_samples < 2:
        return pcm_bytes

    samples = struct.unpack(f"<{num_samples}h", pcm_bytes)
    ratio = in_rate / out_rate
    new_length = int(num_samples / ratio)
    out_samples = []

    for i in range(new_length):
        src_pos = i * ratio
        src_idx = int(src_pos)
        frac = src_pos - src_idx

        if src_idx >= num_samples - 1:
            val = samples[-1]
        else:
            val = samples[src_idx] * (1.0 - frac) + samples[src_idx + 1] * frac

        val = max(-32768, min(32767, int(round(val))))
        out_samples.append(val)

    return struct.pack(f"<{len(out_samples)}h", *out_samples)


def pcm16_to_wav_bytes(pcm_bytes: bytes, sample_rate: int = 16000, num_channels: int = 1) -> bytes:
    """
    Wraps raw 16-bit linear PCM in a standard RIFF/WAV container.
    """
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(num_channels)
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_bytes)
    return buf.getvalue()
