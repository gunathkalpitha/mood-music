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
ALT_FACE_CASCADE_PATH = Path(cv2.data.haarcascades) / "haarcascade_frontalface_alt2.xml"
PROFILE_FACE_CASCADE_PATH = Path(cv2.data.haarcascades) / "haarcascade_profileface.xml"
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

FACE_CASCADES = []
for cascade_name, cascade_path in [
    ("frontal_default", FACE_CASCADE_PATH),
    ("frontal_alt2", ALT_FACE_CASCADE_PATH),
    ("profile", PROFILE_FACE_CASCADE_PATH),
]:
    if cascade_path.exists():
        classifier = cv2.CascadeClassifier(str(cascade_path))
        if not classifier.empty():
            FACE_CASCADES.append((cascade_name, classifier))

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


def _encode_image(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _extract_face(image: Image.Image) -> tuple[Image.Image, bool, str]:
    """Crop the largest detected face to better match emotion training datasets."""
    cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)

    # Try multiple preprocess variants to handle low-light webcam frames.
    gray_eq = cv2.equalizeHist(gray)
    gray_blur = cv2.GaussianBlur(gray_eq, (3, 3), 0)
    variants = [
        ("gray", gray),
        ("equalized", gray_eq),
        ("equalized_blur", gray_blur),
    ]
    params = [
        (1.1, 5, (60, 60)),
        (1.1, 4, (48, 48)),
        (1.05, 3, (40, 40)),
    ]

    best_face = None
    best_strategy = "none"

    for cascade_name, cascade in FACE_CASCADES:
        for variant_name, variant in variants:
            for scale_factor, min_neighbors, min_size in params:
                faces = cascade.detectMultiScale(
                    variant,
                    scaleFactor=scale_factor,
                    minNeighbors=min_neighbors,
                    minSize=min_size,
                )

                if len(faces) == 0:
                    continue

                candidate = max(faces, key=lambda box: box[2] * box[3])
                if best_face is None or (candidate[2] * candidate[3]) > (best_face[2] * best_face[3]):
                    best_face = candidate
                    best_strategy = (
                        f"{cascade_name}:{variant_name}:sf{scale_factor}:mn{min_neighbors}:"
                        f"min{min_size[0]}"
                    )

    if best_face is None:
        return image, False, best_strategy

    x, y, w, h = best_face
    pad_x = int(w * 0.2)
    pad_y = int(h * 0.2)

    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(image.width, x + w + pad_x)
    y2 = min(image.height, y + h + pad_y)

    return image.crop((x1, y1, x2, y2)), True, best_strategy


def analyze_emotion(base64_image: str, include_debug_image: bool = False) -> dict:
    image = decode_image(base64_image)
    face_image, face_detected, detection_strategy = _extract_face(image)
    image_tensor = transform(face_image).unsqueeze(0)

    with torch.no_grad():
        output = model(image_tensor)
        probabilities = torch.softmax(output, dim=1).squeeze(0)

    predicted_index = int(torch.argmax(probabilities).item())
    raw_top_confidence = float(probabilities[predicted_index].item())
    dominant = CLASS_NAMES[predicted_index]

    # When no face is found, avoid presenting a confident emotion guess.
    if not face_detected:
        dominant = "neutral"
        decision = "no_face_detected"
        top_confidence = 0.0
    elif raw_top_confidence < LOW_CONFIDENCE_THRESHOLD:
        dominant = "neutral"
        decision = "low_confidence"
        top_confidence = raw_top_confidence
    else:
        decision = "model_prediction"
        top_confidence = raw_top_confidence

    scores = {
        CLASS_NAMES[index]: float(probabilities[index].item())
        for index in range(len(CLASS_NAMES))
    }

    if dominant == "neutral":
        neutral_score = 1.0 if decision == "no_face_detected" else (1.0 - raw_top_confidence)
        scores["neutral"] = max(scores.get("neutral", 0.0), neutral_score)

    response = {
        "dominant_emotion": dominant,
        "scores": scores,
        "meta": {
            "face_detected": face_detected,
            "detection_strategy": detection_strategy,
            "top_confidence": top_confidence,
            "raw_model_confidence": raw_top_confidence,
            "decision": decision,
        },
    }

    if include_debug_image:
        # Expose both source frame and face crop for easier CV debugging.
        response["debug_source_image"] = _encode_image(image)
        response["debug_face_image"] = _encode_image(face_image)

    return response