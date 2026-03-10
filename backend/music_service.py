import requests
import os
from dotenv import load_dotenv

load_dotenv()

EMOTION_QUERY_MAP = {
    "happy":    "Centigradz",
    "sad":      "Centigradz",
    "angry":    "Centigradz",
    "neutral":  "GalanaGalanaDolaPare ",
    "fear":     "calm relaxing ambient music",
    "surprise": "upbeat energetic music",
    "disgust":  "dark blues music",
}


def _map_youtube_items(items: list) -> list:
    tracks = []
    for item in items:
        video_id = item.get("id", {}).get("videoId")
        snippet = item.get("snippet", {})
        if not video_id:
            continue
        tracks.append(
            {
                "title": snippet.get("title", ""),
                "channel": snippet.get("channelTitle", ""),
                "description": snippet.get("description", ""),
                "videoId": video_id,
                "video_id": video_id,
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
                "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
            }
        )
    return tracks


def _search_youtube_raw(query: str, max_results: int) -> tuple[list, dict | None]:
    youtube_api_key = os.getenv("YOUTUBE_API_KEY", "")
    if not youtube_api_key:
        return [], {
            "reason": "missing_api_key",
            "message": "Backend YOUTUBE_API_KEY is not configured.",
            "status_code": 500,
        }

    try:
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "videoCategoryId": "10",  # 10 = Music category
                "maxResults": max_results,
                "key": youtube_api_key,
            },
            timeout=12,
        )

        if response.status_code >= 400:
            payload = {}
            try:
                payload = response.json()
            except ValueError:
                payload = {}

            api_error = payload.get("error", {})
            reason = (
                (api_error.get("errors") or [{}])[0].get("reason")
                if isinstance(api_error.get("errors"), list)
                else None
            )
            return [], {
                "reason": reason or "youtube_api_error",
                "message": api_error.get("message") or "YouTube API request failed.",
                "status_code": response.status_code,
            }

        items = response.json().get("items", [])
        return _map_youtube_items(items), None

    except requests.RequestException as exc:
        return [], {
            "reason": "network_error",
            "message": f"Failed to connect to YouTube API: {str(exc)}",
            "status_code": 503,
        }


def search_youtube_tracks(query: str, max_results: int = 15) -> dict:
    safe_query = (query or "").strip()
    safe_max = max(1, min(int(max_results or 15), 25))
    if not safe_query:
        return {"tracks": [], "error": None}

    tracks, error = _search_youtube_raw(safe_query, safe_max)
    return {
        "tracks": tracks,
        "error": error,
    }

def get_tracks_for_emotion(emotion: str) -> list:
    query = EMOTION_QUERY_MAP.get(emotion, "chill music")
    tracks, _error = _search_youtube_raw(query, 5)
    # Fallback: if no tracks found, return a default track for the emotion
    DEFAULT_YOUTUBE_TRACKS = {
        "happy": {
            "title": "Pharrell Williams - Happy",
            "channel": "PharrellWilliamsVEVO",
            "videoId": "y6Sxv-sUYtM",
            "video_id": "y6Sxv-sUYtM",
            "youtube_url": "https://www.youtube.com/watch?v=y6Sxv-sUYtM"
        },
        "sad": {
            "title": "Adele - Someone Like You",
            "channel": "AdeleVEVO",
            "videoId": "hLQl3WQQoQ0",
            "video_id": "hLQl3WQQoQ0",
            "youtube_url": "https://www.youtube.com/watch?v=hLQl3WQQoQ0"
        },
        "angry": {
            "title": "Linkin Park - Numb",
            "channel": "LinkinPark",
            "videoId": "kXYiU_JCYtU",
            "video_id": "kXYiU_JCYtU",
            "youtube_url": "https://www.youtube.com/watch?v=kXYiU_JCYtU"
        },
        "neutral": {
            "title": "Seethala pinne",
            "channel": "Calm Music",
            "videoId": "zjoOyGi-rOw",
            "video_id": "zjoOyGi-rOw",
            "youtube_url": "https://www.youtube.com/watch?v=zjoOyGi-rOw&list=RDzjoOyGi-rOw&start_radio=1&rv=zjoOyGi-rOw"
        },
        "fear": {
            "title": "Relaxing Ambient Music",
            "channel": "Relaxing Music",
            "videoId": "2OEL4P1Rz04",
            "video_id": "2OEL4P1Rz04",
            "youtube_url": "https://www.youtube.com/watch?v=2OEL4P1Rz04"
        },
        "surprise": {
            "title": "Queen - Don't Stop Me Now",
            "channel": "Queen Official",
            "videoId": "HgzGwKwLmgM",
            "video_id": "HgzGwKwLmgM",
            "youtube_url": "https://www.youtube.com/watch?v=HgzGwKwLmgM"
        },
        "disgust": {
            "title": "Gary Clark Jr. - Bright Lights",
            "channel": "GaryClarkJrVEVO",
            "videoId": "CFb5bYogwQ8",
            "video_id": "CFb5bYogwQ8",
            "youtube_url": "https://www.youtube.com/watch?v=CFb5bYogwQ8"
        }
    }
    if not tracks:
        fallback = DEFAULT_YOUTUBE_TRACKS.get(emotion.lower(), DEFAULT_YOUTUBE_TRACKS["neutral"])
        tracks = [fallback]
    return tracks

