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

### Key Features
- 🎥 Real-time emotion detection from webcam
- 🎵 Automatic music recommendations based on mood
- ⌨️ Quick play hotkeys (1/2/3)
- 📊 Live confidence scores overlay
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
2. Start API server from project root:
	- `uvicorn backend.main:app --reload`
3. Open the frontend and use Mood Detect.
