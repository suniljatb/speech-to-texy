Speech-to-Text Converter (Local Full-Stack)
===========================================

Monorepo layout:
- `server/` FastAPI with `/api/v1/transcribe` using faster-whisper
- `client/` React (Vite) + Tailwind. Records via MediaRecorder and uploads to backend

Prerequisites
-------------
- Python 3.10+
- Node.js 18+
- FFmpeg available on PATH is recommended for broad codec support

Run backend (port 8000)
-----------------------
```bash
cd server
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Run frontend (port 5173)
------------------------
```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

CORS is pre-configured to allow the frontend origin.

Notes
-----
- First request downloads the Whisper "tiny" model. Subsequent runs are faster.
- No Google APIs used; inference runs via open-source Whisper (faster-whisper) locally.


