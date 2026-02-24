import requests
import os
from dotenv import load_dotenv

load_dotenv()

EMOTION_QUERY_MAP = {
    "happy":    "happy vibes playlist music",
    "sad":      "sad emotional music playlist",
    "angry":    "aggressive intense workout music",
    "neutral":  "chill lofi music",
    "fear":     "calm relaxing ambient music",
    "surprise": "upbeat energetic music",
    "disgust":  "dark blues music",
}

def get_tracks_for_emotion(emotion: str) -> list:
    youtube_api_key = os.getenv("YOUTUBE_API_KEY", "")

    if not youtube_api_key:
        return []

    query = EMOTION_QUERY_MAP.get(emotion, "chill music")
    
    try:
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "videoCategoryId": "10",  # 10 = Music category
                "maxResults": 5,
                "key": youtube_api_key
            },
            timeout=10
        )
        response.raise_for_status()
    except requests.RequestException:
        return []
    
    items = response.json().get("items", [])
    
    return [
        {
            "title": item["snippet"]["title"],
            "channel": item["snippet"]["channelTitle"],
            "video_id": item["id"]["videoId"],
            "thumbnail": item["snippet"]["thumbnails"]["medium"]["url"],
            "youtube_url": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
        }
        for item in items
    ]