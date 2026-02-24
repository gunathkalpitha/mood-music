# Mood Music

An AI-powered emotion detection system that recommends music based on your real-time facial expressions.

## About

This application uses **DeepFace** to detect emotions from your webcam and automatically recommends songs from YouTube that match your current mood. 

### How it works
1. Your webcam captures your face in real-time
2. DeepFace analyzes 7 emotions: happy, sad, angry, neutral, fear, surprise, disgust
3. Based on detected emotion, the app searches YouTube for matching music
4. Top 5 recommended tracks appear on screen and in console
5. Press `1`/`2`/`3` to play any suggested track in your browser

### Key Features
- 🎥 Real-time emotion detection from webcam
- 🎵 Automatic music recommendations based on mood
- ⌨️ Quick play hotkeys (1/2/3)
- 📊 Live confidence scores overlay
- 🚀 FastAPI backend for scalable emotion analysis

### Tech Stack
- **Backend**: FastAPI
- **ML**: DeepFace, OpenCV
- **Music API**: YouTube Data API v3
- **Language**: Python 3.11+
