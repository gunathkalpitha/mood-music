import base64
import io
import json
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from torchvision import models, transforms

MODEL_DIR = Path(__file__).resolve().parent / "emotion_model"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"
MODEL_PATH = MODEL_DIR / "emotion_model.pth"
FACE_CASCADE_PATH = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
LOW_CONFIDENCE_THRESHOLD = 0.45


def _normalize_label(label: str) -> str:
    cleaned = label.strip().lower()
    alias_map = {
        "suprise": "surprise",
    }
    return alias_map.get(cleaned, cleaned)


with CLASS_NAMES_PATH.open("r", encoding="utf-8") as class_file:
    raw_class_names = json.load(class_file)

if isinstance(raw_class_names, list):
    class_names = raw_class_names
elif isinstance(raw_class_names, dict):
    class_names = [raw_class_names[key] for key in sorted(raw_class_names, key=lambda item: int(item))]
else:
    raise ValueError("class_names.json must contain a list or an index-to-label dictionary")

CLASS_NAMES = [_normalize_label(name) for name in class_names]

model = models.resnet18(weights=None)
model.fc = torch.nn.Linear(model.fc.in_features, len(CLASS_NAMES))
model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
model.eval()

face_cascade = cv2.CascadeClassifier(str(FACE_CASCADE_PATH))

transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((48, 48)),
    transforms.ToTensor(),
    transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
])


def decode_image(base64_string: str) -> Image.Image:
    if "," in base64_string:
        base64_string = base64_string.split(",", 1)[1]
    img_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(img_data)).convert("RGB")


def _extract_face(image: Image.Image) -> tuple[Image.Image, bool]:
    """Crop the largest detected face to better match emotion training datasets."""
    cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
    )

    if len(faces) == 0:
        return image, False

    x, y, w, h = max(faces, key=lambda box: box[2] * box[3])
    pad_x = int(w * 0.2)
    pad_y = int(h * 0.2)

    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(image.width, x + w + pad_x)
    y2 = min(image.height, y + h + pad_y)

    return image.crop((x1, y1, x2, y2)), True


def analyze_emotion(base64_image: str) -> dict:
    image = decode_image(base64_image)
    face_image, face_detected = _extract_face(image)
    image_tensor = transform(face_image).unsqueeze(0)

    with torch.no_grad():
        output = model(image_tensor)
        probabilities = torch.softmax(output, dim=1).squeeze(0)

    predicted_index = int(torch.argmax(probabilities).item())
    top_confidence = float(probabilities[predicted_index].item())
    dominant = CLASS_NAMES[predicted_index]

    # Your model has no neutral class, so uncertain predictions are mapped to neutral.
    if top_confidence < LOW_CONFIDENCE_THRESHOLD:
        dominant = "neutral"

    scores = {
        CLASS_NAMES[index]: float(probabilities[index].item())
        for index in range(len(CLASS_NAMES))
    }

    if dominant == "neutral":
        scores["neutral"] = max(scores.get("neutral", 0.0), 1.0 - top_confidence)

    return {
        "dominant_emotion": dominant,
        "scores": scores,
        "meta": {
            "face_detected": face_detected,
            "top_confidence": top_confidence,
        },
    }