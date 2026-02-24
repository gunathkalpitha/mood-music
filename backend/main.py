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

@app.post("/detect-mood")
async def detect_mood(payload: ImagePayload):
    emotion_data = analyze_emotion(payload.image)
    tracks = get_tracks_for_emotion(emotion_data['dominant_emotion'])
    return {
        "emotion": emotion_data['dominant_emotion'],
        "scores": emotion_data['scores'],
        "tracks": tracks
    }