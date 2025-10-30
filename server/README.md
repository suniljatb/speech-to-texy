Server (FastAPI)
================

Setup
-----

1. Create venv and install dependencies:

```bash
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell
pip install -r requirements.txt
```

2. Run the API (port 8000):

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- First transcription will download a Whisper model (tiny). Subsequent runs are faster.
- CORS is enabled for http://localhost:5173 by default.

Endpoint
--------

- POST /api/v1/transcribe
  - form-data: `audio` (file), optional `language` (e.g., `en`, `hi`)
  - returns: `{ text, segments[], language, duration }`


