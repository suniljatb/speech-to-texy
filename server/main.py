from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import uvicorn
import tempfile
import os

# Lazy import for faster cold start when just importing app
asr_model = None

app = FastAPI(title="Speech-to-Text API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_model(model_name: str = "tiny"):
    global asr_model
    if asr_model is None:
        try:
            from faster_whisper import WhisperModel
        except ImportError as e:
            raise RuntimeError(
                "faster-whisper is not installed. Run: pip install -r requirements.txt"
            ) from e
        asr_model = WhisperModel(model_name, device="cpu", compute_type="int8")
    return asr_model


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = None,
):
    if audio.content_type and not audio.content_type.startswith("audio"):
        raise HTTPException(status_code=400, detail="Invalid content type. Expect audio/*")

    model = load_model()

    # Save to temp file to allow ffmpeg decode via faster-whisper
    suffix = os.path.splitext(audio.filename or "audio")[1] or ".wav"
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            if not content:
                raise HTTPException(status_code=400, detail="Empty audio file")
            tmp.write(content)
            tmp_path = tmp.name

        segments, info = model.transcribe(
            tmp_path,
            language=(language.split("-")[0] if language else None),
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
            beam_size=5,
            best_of=5,
        )

        text_parts = []
        seg_list = []
        for seg in segments:
            text_parts.append(seg.text)
            seg_list.append({
                "start": float(seg.start),
                "end": float(seg.end),
                "text": seg.text,
                # faster-whisper doesn't give per-word confidence; segment avg prob used
                "avg_logprob": float(seg.avg_logprob) if seg.avg_logprob is not None else None,
                "no_speech_prob": float(seg.no_speech_prob) if seg.no_speech_prob is not None else None,
            })

        return JSONResponse({
            "text": " ".join(text_parts).strip(),
            "segments": seg_list,
            "language": info.language,
            "duration": float(info.duration) if info.duration else None,
        })
    finally:
        try:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


