from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
try:
    from .emotion_service import analyze_emotion
    from .music_service import get_tracks_for_emotion, search_youtube_tracks
    from .song_mood_service import analyze_youtube_song_mood
except ImportError:
    from emotion_service import analyze_emotion
    from music_service import get_tracks_for_emotion, search_youtube_tracks
    from song_mood_service import analyze_youtube_song_mood

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


class SongMoodPayload(BaseModel):
    youtube_url: str
    title: str | None = None
    channel: str | None = None
    description: str | None = None
    lyrics_text: str | None = None


class SongMoodBatchPayload(BaseModel):
    tracks: list[SongMoodPayload]
    use_cache: bool = True


class YouTubeSearchPayload(BaseModel):
    query: str
    max_results: int = 15

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


@app.post("/analyze-song-mood")
async def analyze_song_mood(payload: SongMoodPayload):
    return analyze_youtube_song_mood(
        youtube_url=payload.youtube_url,
        title=payload.title,
        channel=payload.channel,
        description=payload.description,
        lyrics_text=payload.lyrics_text,
    )


@app.post("/analyze-song-moods")
async def analyze_song_moods(payload: SongMoodBatchPayload):
    results = [
        analyze_youtube_song_mood(
            youtube_url=track.youtube_url,
            title=track.title,
            channel=track.channel,
            description=track.description,
            lyrics_text=track.lyrics_text,
            use_cache=payload.use_cache,
        )
        for track in payload.tracks
    ]
    return {
        "results": results,
    }


@app.post("/youtube-search")
async def youtube_search(payload: YouTubeSearchPayload):
    return search_youtube_tracks(payload.query, payload.max_results)
