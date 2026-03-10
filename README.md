# Mood Music

An AI-powered emotion detection system that recommends music based on your real-time facial expressions.

## About

This application uses a custom-trained PyTorch emotion model to detect emotions from your webcam and automatically recommends songs from YouTube that match your current mood. 

### How it works
1. Your webcam captures your face in real-time
2. The backend loads your trained `resnet18` model from `backend/emotion_model/`
3. The model predicts emotion probabilities from each frame
4. Based on detected emotion, the app searches YouTube for matching music
5. Top 5 recommended tracks appear on screen

## Automatic Song Mood Categorization (YouTube Link Pipeline)

The backend now includes a second pipeline that categorizes songs from YouTube links using:

1. Audio download (yt-dlp)
2. Audio feature extraction (librosa): tempo (BPM), energy, key/mode
3. Optional lyrics sentiment (TextBlob + lyrics.ovh)
4. Rule-based mood scoring (happy/sad/chill/angry/fear/surprise/neutral)

### API endpoints

- `POST /analyze-song-mood`
- `POST /analyze-song-moods` (batch)

Example request:

```json
{
	"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
	"title": "Song title",
	"channel": "Artist channel",
	"description": "Optional description"
}
```

Example response fields:

- `audio_features.tempo_bpm`
- `audio_features.key_label`
- `audio_features.energy`
- `lyrics.sentiment_polarity`
- `final_mood`
- `confidence`

### Key Features
- 🎥 Real-time emotion detection from webcam
- 🎵 Automatic music recommendations based on mood
- 🔁 AI mood playback rotates to the next unplayed song per detected emotion (reduces repeats)
- ⏭️ Auto-continues to next songs in the selected queue/category
- 🖥️ Electron desktop app opens maximized by default
- 🚀 FastAPI backend for scalable emotion analysis

### Tech Stack
- **Backend**: FastAPI
- **ML**: PyTorch, TorchVision, Pillow
- **Music API**: YouTube Data API v3
- **Language**: Python 3.11+

## Model files

Place the trained model files in:

- `backend/emotion_model/emotion_model.pth`
- `backend/emotion_model/class_names.json`

`class_names.json` can be either a list (e.g., `["Angry", "Fear", ...]`) or an index-to-label dictionary.

## Run backend

1. Install dependencies:
	- `pip install -r requirements.txt`
2. Ensure FFmpeg is installed and available on PATH (recommended for consistent audio decoding).
3. Start API server from project root:
	- `uvicorn backend.main:app --reload`
4. Open the frontend and use Mood Detect.

## Run desktop frontend

From `frontend/`:

1. Install dependencies:
	- `npm install`
2. Start app in development mode (Vite + Electron):
	- `npm run dev`
3. Build desktop installer:
	- `npm run build`

## YouTube API Key Setup

Playlist/Search use the backend endpoint (`/youtube-search`) which calls YouTube Data API v3.
Set your key for backend in:

- project root `.env` (or backend environment)

```env
YOUTUBE_API_KEY=your_youtube_data_api_key_here
```

Optional: if you later add direct frontend YouTube calls, you can also set:

```env
VITE_YOUTUBE_API_KEY=your_youtube_data_api_key_here
```

## Troubleshooting YouTube Search / Add Song

If search or add-song fails, check backend `/youtube-search` error reason:

- `quotaExceeded`: Daily quota is exhausted for current backend key.
- `keyInvalid`: API key is invalid.
- `accessNotConfigured`: YouTube Data API v3 is not enabled in Google Cloud project.
- `missing_api_key`: `YOUTUBE_API_KEY` is not set in backend environment.

After updating environment variables, restart the backend server.
