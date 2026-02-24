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

def get_tracks_for_emotion(emotion: str) -> list:
    youtube_api_key = os.getenv("YOUTUBE_API_KEY", "")
    query = EMOTION_QUERY_MAP.get(emotion, "chill music")
    tracks = []
    if youtube_api_key:
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
            items = response.json().get("items", [])
            tracks = [
                {
                    "title": item["snippet"]["title"],
                    "channel": item["snippet"]["channelTitle"],
                    "video_id": item["id"]["videoId"],
                    "thumbnail": item["snippet"]["thumbnails"]["medium"]["url"],
                    "youtube_url": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
                }
                for item in items
            ]
        except requests.RequestException:
            tracks = []
    # Fallback: if no tracks found, return a default track for the emotion
    DEFAULT_YOUTUBE_TRACKS = {
        "happy": {
            "title": "Pharrell Williams - Happy",
            "channel": "PharrellWilliamsVEVO",
            "youtube_url": "https://www.youtube.com/watch?v=y6Sxv-sUYtM"
        },
        "sad": {
            "title": "Adele - Someone Like You",
            "channel": "AdeleVEVO",
            "youtube_url": "https://www.youtube.com/watch?v=hLQl3WQQoQ0"
        },
        "angry": {
            "title": "Linkin Park - Numb",
            "channel": "LinkinPark",
            "youtube_url": "https://www.youtube.com/watch?v=kXYiU_JCYtU"
        },
        "neutral": {
            "title": "Seethala pinne",
            "channel": "Calm Music",
            "youtube_url": "https://www.youtube.com/watch?v=zjoOyGi-rOw&list=RDzjoOyGi-rOw&start_radio=1&rv=zjoOyGi-rOw"
        },
        "fear": {
            "title": "Relaxing Ambient Music",
            "channel": "Relaxing Music",
            "youtube_url": "https://www.youtube.com/watch?v=2OEL4P1Rz04"
        },
        "surprise": {
            "title": "Queen - Don't Stop Me Now",
            "channel": "Queen Official",
            "youtube_url": "https://www.youtube.com/watch?v=HgzGwKwLmgM"
        },
        "disgust": {
            "title": "Gary Clark Jr. - Bright Lights",
            "channel": "GaryClarkJrVEVO",
            "youtube_url": "https://www.youtube.com/watch?v=CFb5bYogwQ8"
        }
    }
    if not tracks:
        fallback = DEFAULT_YOUTUBE_TRACKS.get(emotion.lower(), DEFAULT_YOUTUBE_TRACKS["neutral"])
        tracks = [fallback]
    return tracks

