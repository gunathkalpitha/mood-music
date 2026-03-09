from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
try:
    from .emotion_service import analyze_emotion
    from .music_service import get_tracks_for_emotion
except ImportError:
    from emotion_service import analyze_emotion
    from music_service import get_tracks_for_emotion

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImagePayload(BaseModel):
    image: str  # base64 encoded
    debug: bool = False

@app.post("/detect-mood")
async def detect_mood(payload: ImagePayload):
    emotion_data = analyze_emotion(payload.image, include_debug_image=payload.debug)
    tracks = get_tracks_for_emotion(emotion_data['dominant_emotion'])
    return {
        "emotion": emotion_data['dominant_emotion'],
        "scores": emotion_data['scores'],
        "tracks": tracks,
        "meta": emotion_data.get("meta", {}),
        "debug_face_image": emotion_data.get("debug_face_image"),
        "debug_source_image": emotion_data.get("debug_source_image")
    }