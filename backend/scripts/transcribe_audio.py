#!/usr/bin/env python3
"""
ACCESSPREP-X Real-Time Whisper Audio Transcription Runner
Executes genuine OpenAI Whisper speech recognition on uploaded candidate audio files.
Never returns fabricated fallback transcripts.
"""

import sys
import os
import glob
import json
import warnings
warnings.filterwarnings("ignore")

# Auto-discover and prepend Gyan.FFmpeg to PATH if present
possible_ffmpeg_paths = glob.glob(
    os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials*\*\bin")
)
for p in possible_ffmpeg_paths:
    if os.path.exists(os.path.join(p, "ffmpeg.exe")):
        if p not in os.environ.get("PATH", ""):
            os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")
        break

def transcribe(audio_path: str, model_size: str = "tiny"):
    if not os.path.exists(audio_path):
        return {
            "success": False,
            "error": f"Audio file not found: {audio_path}",
            "statusCode": 404
        }

    file_size = os.path.getsize(audio_path)
    if file_size == 0:
        return {
            "success": False,
            "error": "Uploaded audio file is empty (0 bytes).",
            "statusCode": 400
        }

    try:
        import whisper
    except ImportError as e:
        return {
            "success": False,
            "error": "openai-whisper package is not installed or available in Python runtime.",
            "details": str(e),
            "statusCode": 503
        }

    try:
        # Load local model (tiny is recommended for fast CPU inference in container)
        model = whisper.load_model(model_size)
        result = model.transcribe(audio_path, fp16=False)
        transcript = result.get("text", "").strip()
        language = result.get("language", "en")

        return {
            "success": True,
            "transcript": transcript,
            "language": language,
            "engine": f"OpenAI Whisper (Local CPU {model_size.capitalize()})",
            "model": f"whisper-{model_size}",
            "segmentsCount": len(result.get("segments", [])),
            "audioBytes": file_size
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Whisper inference error: {str(e)}",
            "statusCode": 500
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python3 transcribe_audio.py <audio_path> [model_size]"
        }))
        sys.exit(1)

    audio_file = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "tiny"

    output = transcribe(audio_file, model_name)
    print(json.dumps(output))

    if not output.get("success"):
        sys.exit(1)
    sys.exit(0)
