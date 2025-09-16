# main.py
import os
import whisperx
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import uuid

app = FastAPI()

# Enable CORS for your frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # replace "*" with your frontend domain in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Save uploaded file
        session_id = str(uuid.uuid4())
        upload_path = f"uploads/{session_id}_{file.filename}"
        os.makedirs("uploads", exist_ok=True)

        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Transcription logic
        device = "cpu"
        compute_type = "int8"
        model = whisperx.load_model("large-v2", device, compute_type=compute_type)
        audio = whisperx.load_audio(upload_path)
        result = model.transcribe(audio, batch_size=4)

        model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
        result = whisperx.align(result["segments"], model_a, metadata, audio, device)

        diarize_model = whisperx.diarize.DiarizationPipeline(use_auth_token=os.getenv("hf_token"), device=device)
        diarize_segments = diarize_model(audio)
        result = whisperx.assign_word_speakers(diarize_segments, result)

        # Format output
        def format_timestamp(seconds):
            millis = int((seconds - int(seconds)) * 1000)
            h = int(seconds // 3600)
            m = int((seconds % 3600) // 60)
            s = int(seconds % 60)
            return f"{h:02}:{m:02}:{s:02}.{millis:03}"

        formatted_segments = [
            {
                "speaker": seg.get("speaker", "UNKNOWN"),
                "start": format_timestamp(seg["start"]),
                "end": format_timestamp(seg["end"]),
                "text": seg["text"].strip()
            }
            for seg in result["segments"]
        ]

        return {"segments": formatted_segments, "session_id": session_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
