# main.py

import os
import whisperx
from google.cloud import storage
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
import shutil
import uuid
import torch
import datetime
import mimetypes
import json

app = FastAPI()

# Enable CORS for frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "https://transcript-editor-sigma.vercel.app",
    "https://transcript.7clingo.com",
    "http://localhost:3000"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model set up
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "int8"

# Transcript GCS
def get_gcs_bucket():
    bucket_name = os.environ.get("GCS_BUCKET_NAME")
    if not bucket_name:
        raise HTTPException(status_code=500, detail="Missing GCS_BUCKET_NAME env var")
    storage_client = storage.Client()
    return storage_client.bucket(bucket_name)

def transcript_blob(session_id: str):
    return f"transcripts/{session_id}.json"

@app.get("/api/transcripts")
async def list_transcripts():
    """List all transcript JSON files in GCS, including filename."""
    bucket = get_gcs_bucket()
    blobs = bucket.list_blobs(prefix="transcripts/")
    transcripts = []
    for blob in blobs:
        if blob.name.endswith(".json"):
            session_id = blob.name.split("/")[-1].replace(".json", "")
            # Download transcript to get filename
            content = blob.download_as_text()
            data = json.loads(content)
            transcripts.append({
                "session_id": session_id,
                "name": blob.name,
                "updated": blob.updated.isoformat() if blob.updated else None,
                "filename": data.get("filename", "untitled")
            })
    return {"transcripts": transcripts}

# Endpoint to stream audio file from GCS for a transcript session
@app.get("/api/audio/{session_id}")
async def get_audio(session_id: str):
    bucket = get_gcs_bucket()
    # Fetch transcript to get audio_url
    blob = bucket.blob(transcript_blob(session_id))
    if not blob.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")
    content = blob.download_as_text()
    data = json.loads(content)
    audio_url = data.get("audio_url")
    if not audio_url:
        raise HTTPException(status_code=404, detail="No audio_url in transcript")
    # Extract blob path from public URL
    if audio_url.startswith("http"):
        parts = audio_url.split("/")
        filename = "/".join(parts[4:])
    else:
        filename = audio_url
    audio_blob = bucket.blob(filename)
    if not audio_blob.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    # Download as stream
    def iterfile():
        with audio_blob.open("rb") as f:
            while True:
                chunk = f.read(8192)
                if not chunk:
                    break
                yield chunk
    # Guess content type from file extension
    import mimetypes
    mime_type, _ = mimetypes.guess_type(filename)
    return StreamingResponse(iterfile(), media_type=mime_type or "application/octet-stream")

@app.get("/api/transcript/{session_id}")
async def get_transcript(session_id: str):
    """Fetch transcript JSON from GCS by session_id, including audio_url."""
    bucket = get_gcs_bucket()
    blob = bucket.blob(transcript_blob(session_id))
    if not blob.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")
    content = blob.download_as_text()
    data = json.loads(content)
    # Ensure audio_url is present in response
    audio_url = data.get("audio_url")
    return {"audio_url": audio_url, "segments": data.get("segments", []), "session_id": session_id, "filename": data.get("filename"), "created_at": data.get("created_at")}

@app.post("/api/transcript/{session_id}")
async def create_transcript(session_id: str, body: dict = Body(...)):
    """
    Create a new transcript JSON in GCS.
    Requires `audio_url` from the newly uploaded audio file.
    """
    bucket = get_gcs_bucket()
    blob = bucket.blob(transcript_blob(session_id))

    if "audio_url" not in body:
        raise HTTPException(status_code=400, detail="Missing audio_url in transcript data")

    if "filename" not in body:
        body["filename"] = None

    body["created_at"] = body.get("created_at") or datetime.datetime.utcnow().isoformat()
    body["updated_at"] = datetime.datetime.utcnow().isoformat()

    blob.upload_from_string(json.dumps(body), content_type="application/json")
    return {"status": "created"}

@app.patch("/api/transcript/{session_id}")
async def update_transcript(session_id: str, body: dict = Body(...)):
    """
    Update an existing transcript.
    Preserves the original `audio_url` and `created_at`.
    """
    bucket = get_gcs_bucket()
    blob = bucket.blob(transcript_blob(session_id))

    if not blob.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")

    existing_data = json.loads(blob.download_as_text())

    merged_data = {
        **existing_data,
        **body,
        "audio_url": existing_data.get("audio_url"),
        "created_at": existing_data.get("created_at"),
        "updated_at": datetime.datetime.utcnow().isoformat(),
    }

    blob.upload_from_string(json.dumps(merged_data), content_type="application/json")
    return {"status": "updated"}

@app.delete("/api/transcript/{session_id}")
async def delete_transcript(session_id: str):
    """
    Delete both transcript JSON and its associated audio file from GCS.
    """
    bucket = get_gcs_bucket()
    transcript_path = transcript_blob(session_id)
    transcript_blob_ref = bucket.blob(transcript_path)

    if not transcript_blob_ref.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")

    # Load transcript JSON
    transcript_data = json.loads(transcript_blob_ref.download_as_text())
    audio_url = transcript_data.get("audio_url")

    # Delete the transcript JSON
    transcript_blob_ref.delete()

    deleted_audio = False
    if audio_url:
        try:
            # Normalize audio path from different URL formats
            audio_path = None

            if audio_url.startswith("gs://"):
                # Example: gs://my-bucket/uploads/audio.wav
                audio_path = "/".join(audio_url.split("/")[3:])

            elif "storage.googleapis.com" in audio_url:
                parts = audio_url.split("storage.googleapis.com/")
                if len(parts) > 1:
                    # Handles both bucket.storage.googleapis.com and storage.googleapis.com/bucket
                    audio_path = parts[1].split("/", 1)[-1]

            elif audio_url.startswith("http"):
                # Fallback generic path extraction
                audio_path = "/".join(audio_url.split("/")[4:])

            else:
                # Probably a relative path already (uploads/...)
                audio_path = audio_url

            if audio_path:
                audio_blob_ref = bucket.blob(audio_path)
                if audio_blob_ref.exists():
                    audio_blob_ref.delete()
                    deleted_audio = True

        except Exception as e:
            print(f"Warning: failed to delete audio for {session_id}: {e}")

    return {
        "status": "deleted",
        "session_id": session_id,
        "deleted_audio": deleted_audio,
    }

def format_timestamp(seconds: float) -> str:
    millis = int((seconds - int(seconds)) * 1000)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02}:{m:02}:{s:02}.{millis:03}"


@app.post("/api/gcs-upload-url")
async def get_gcs_upload_url(request: Request):
    """Generate a signed URL so frontend can upload directly to GCS."""
    data = await request.json()
    filename = data.get("filename")
    content_type = data.get("contentType", "application/octet-stream")
    bucket_name = os.environ.get("GCS_BUCKET_NAME")

    if not filename or not bucket_name:
        raise HTTPException(status_code=400, detail="Missing filename or GCS_BUCKET_NAME")

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(filename)

    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=15),
        method="PUT",
        content_type=content_type,
    )

    public_url = f"https://storage.googleapis.com/{bucket_name}/{filename}"

    return {"url": url, "publicUrl": public_url}


@app.post("/api/process-gcs-audio")
async def process_gcs_audio(request: Request):
    """Download audio from GCS (already uploaded) and transcribe it."""
    data = await request.json()
    gcs_url = data.get("gcsUrl")
    if not gcs_url:
        raise HTTPException(status_code=400, detail="Missing gcsUrl")

    bucket_name = os.environ.get("GCS_BUCKET_NAME") 
    if not bucket_name:
        raise HTTPException(status_code=500, detail="Missing GCS_BUCKET_NAME env var")

    # Normalize filename from public URL or direct blob path
    if gcs_url.startswith("http"):
        parts = gcs_url.split("/")
        filename = "/".join(parts[4:])  # e.g. https://storage.googleapis.com/<bucket>/<blob>
    else:
        filename = gcs_url

    print(f"Fetching from bucket={bucket_name}, blob={filename}")

    # Local temp path
    session_id = str(uuid.uuid4())
    safe_filename = filename.split("/")[-1]
    local_path = f"uploads/{session_id}_{safe_filename}"
    os.makedirs("uploads", exist_ok=True)

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(filename)

    try:
        blob.download_to_filename(local_path)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download audio from GCS: {str(e)}"
        )

    try:
        print(">>> Loading WhisperX medium model...")
        whisper_model = whisperx.load_model("medium", device, compute_type=compute_type)
        # Transcription
        audio = whisperx.load_audio(local_path)
        result = whisper_model.transcribe(audio, batch_size=16 if device == "cuda" else 4)

        model_a, metadata = whisperx.load_align_model(
            language_code=result["language"], device=device
        )
        result = whisperx.align(result["segments"], model_a, metadata, audio, device)

        diarize_model = whisperx.diarize.DiarizationPipeline(
            use_auth_token=os.getenv("HF_TOKEN"), device=device
        )
        diarize_segments = diarize_model(audio)
        result = whisperx.assign_word_speakers(diarize_segments, result)

        formatted_segments = [
            {
                "speaker": seg.get("speaker", "UNKNOWN"),
                "start": format_timestamp(seg["start"]),
                "end": format_timestamp(seg["end"]),
                "text": seg["text"].strip(),
            }
            for seg in result["segments"]
        ]

        return {"segments": formatted_segments, "session_id": session_id}

    finally:
        if os.path.exists(local_path):
            os.remove(local_path)

@app.get("/api/download-audio/{session_id}")
async def download_audio(session_id: str):
    """
    Download the audio file for a given transcript session as an attachment.
    """
    bucket = get_gcs_bucket()

    # Fetch transcript metadata
    blob = bucket.blob(transcript_blob(session_id))
    if not blob.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")

    content = blob.download_as_text()
    data = json.loads(content)
    audio_url = data.get("audio_url")

    if not audio_url:
        raise HTTPException(status_code=404, detail="No audio_url found in transcript")

    # Derive blob path from URL or direct pathw
    if audio_url.startswith("http"):
        parts = audio_url.split("/")
        filename = "/".join(parts[4:])
    else:
        filename = audio_url

    audio_blob = bucket.blob(filename)
    if not audio_blob.exists():
        raise HTTPException(status_code=404, detail="Audio file not found in GCS")

    # Stream audio file as attachment
    def iterfile():
        with audio_blob.open("rb") as f:
            while chunk := f.read(8192):
                yield chunk

    mime_type, _ = mimetypes.guess_type(filename)
    download_name = filename.split("/")[-1]

    headers = {
        "Content-Disposition": f'attachment; filename="{download_name}"'
    }

    return StreamingResponse(iterfile(), media_type=mime_type or "application/octet-stream", headers=headers)

@app.get("/debug/gpu")
async def check_gpu():
    return {
        "cuda_available": torch.cuda.is_available(),
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }