from deepface import DeepFace
import numpy as np
import cv2
import base64

def decode_image(base64_string: str) -> np.ndarray:
    img_data = base64.b64decode(base64_string)
    np_arr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

def analyze_emotion(base64_image: str) -> dict:
    frame = decode_image(base64_image)
    results = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
    dominant = str(results[0]['dominant_emotion'])
    raw_emotions = results[0]['emotion']
    all_emotions = {key: float(value) for key, value in raw_emotions.items()}
    return {
        "dominant_emotion": dominant,
        "scores": all_emotions
    }