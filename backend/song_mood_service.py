import importlib
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import numpy as np
import requests

librosa = None
TextBlob = None
yt_dlp = None

KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

_MOOD_CACHE: dict[str, dict[str, Any]] = {}
_MAX_CACHE_SIZE = 200


def _ensure_optional_dependencies() -> None:
    global librosa, TextBlob, yt_dlp

    if librosa is None:
        try:
            librosa = importlib.import_module("librosa")
        except Exception:
            librosa = None

    if TextBlob is None:
        try:
            textblob_module = importlib.import_module("textblob")
            TextBlob = getattr(textblob_module, "TextBlob", None)
        except Exception:
            TextBlob = None

    if yt_dlp is None:
        try:
            yt_dlp = importlib.import_module("yt_dlp")
        except Exception:
            yt_dlp = None


def _extract_video_id(youtube_url: str) -> str:
    parsed = urlparse(youtube_url)

    if parsed.hostname in {"youtu.be", "www.youtu.be"}:
        return parsed.path.strip("/")

    if parsed.path == "/watch":
        return parse_qs(parsed.query).get("v", [""])[0]

    if parsed.path.startswith("/shorts/"):
        return parsed.path.split("/", 2)[2]

    if parsed.path.startswith("/embed/"):
        return parsed.path.split("/", 2)[2]

    # Fallback for plain ids passed as URLs or malformed input
    candidate = youtube_url.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate):
        return candidate

    return ""


def _safe_slug(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-")
    return cleaned[:48] or "track"


def _download_audio(youtube_url: str, temp_dir: Path, warnings: list[str]) -> Path | None:
    _ensure_optional_dependencies()
    if yt_dlp is None:
        warnings.append("yt-dlp is not installed; audio analysis was skipped.")
        return None

    out_tmpl = str(temp_dir / "%(id)s.%(ext)s")
    options = {
        "format": "bestaudio/best",
        "outtmpl": out_tmpl,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "socket_timeout": 30,
    }

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            downloaded = Path(ydl.prepare_filename(info))
            if downloaded.exists():
                return downloaded
    except Exception as exc:  # pragma: no cover - network/download runtime path
        warnings.append(f"Audio download failed: {str(exc)}")
        return None

    candidates = list(temp_dir.glob("*"))
    return candidates[0] if candidates else None


def _prepare_audio(source: Path, temp_dir: Path, warnings: list[str]) -> Path:
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        warnings.append("FFmpeg not found; using source audio as-is.")
        return source

    target = temp_dir / f"{_safe_slug(source.stem)}-normalized.wav"
    cmd = [
        ffmpeg_path,
        "-y",
        "-i",
        str(source),
        "-ac",
        "1",
        "-ar",
        "22050",
        "-t",
        "120",
        str(target),
    ]

    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        warnings.append("FFmpeg normalization failed; using source audio as-is.")
        return source

    return target if target.exists() else source


def _estimate_key_mode(chroma_vector: np.ndarray) -> tuple[str, str, float]:
    if chroma_vector.sum() <= 0:
        return "C", "major", 0.0

    chroma_norm = chroma_vector / (np.linalg.norm(chroma_vector) + 1e-8)
    major_norm = MAJOR_PROFILE / np.linalg.norm(MAJOR_PROFILE)
    minor_norm = MINOR_PROFILE / np.linalg.norm(MINOR_PROFILE)

    best_key = 0
    best_mode = "major"
    best_score = -1e9
    second_best = -1e9

    for root in range(12):
        major_score = float(np.dot(chroma_norm, np.roll(major_norm, root)))
        minor_score = float(np.dot(chroma_norm, np.roll(minor_norm, root)))

        for mode, score in (("major", major_score), ("minor", minor_score)):
            if score > best_score:
                second_best = best_score
                best_score = score
                best_key = root
                best_mode = mode
            elif score > second_best:
                second_best = score

    confidence = max(0.0, min(1.0, (best_score - second_best + 0.2) / 0.6))
    return KEY_NAMES[best_key], best_mode, confidence


def _extract_audio_features(audio_path: Path) -> dict[str, Any]:
    _ensure_optional_dependencies()
    if librosa is None:
        raise RuntimeError("librosa is not installed")

    y, sr = librosa.load(str(audio_path), sr=22050, mono=True, duration=120)
    if y.size == 0:
        raise ValueError("Audio signal is empty")

    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    rms = librosa.feature.rms(y=y)[0]
    energy = float(np.clip(np.mean(rms) / 0.12, 0, 1))

    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    key, mode, key_confidence = _estimate_key_mode(chroma.mean(axis=1))

    return {
        "tempo_bpm": round(float(tempo), 2),
        "energy": round(energy, 4),
        "key": key,
        "mode": mode,
        "key_label": f"{key} {'Major' if mode == 'major' else 'Minor'}",
        "key_confidence": round(float(key_confidence), 4),
    }


def _clean_title_for_lyrics(title: str) -> str:
    cleaned = re.sub(r"\([^)]*\)|\[[^]]*\]", " ", title)
    cleaned = re.sub(r"(?i)official|video|lyrics|audio|4k|hd", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -")
    return cleaned


def _split_artist_title(title: str, channel: str) -> tuple[str, str]:
    if " - " in title:
        artist, song = title.split(" - ", 1)
        return artist.strip(), song.strip()

    return channel.strip(), title.strip()


def _fetch_lyrics(artist: str, song_title: str) -> str | None:
    if not artist or not song_title:
        return None

    try:
        response = requests.get(
            f"https://api.lyrics.ovh/v1/{artist}/{song_title}",
            timeout=8,
        )
        if response.status_code != 200:
            return None
        payload = response.json()
        lyrics = payload.get("lyrics")
        if not lyrics or len(lyrics.strip()) < 20:
            return None
        return lyrics
    except requests.RequestException:
        return None


def _analyze_sentiment(lyrics_text: str | None) -> dict[str, Any]:
    _ensure_optional_dependencies()
    if not lyrics_text:
        return {
            "sentiment_polarity": None,
            "sentiment_label": "unknown",
        }

    if TextBlob is None:
        return {
            "sentiment_polarity": None,
            "sentiment_label": "unknown",
        }

    polarity = float(TextBlob(lyrics_text).sentiment.polarity)
    if polarity >= 0.2:
        label = "positive"
    elif polarity <= -0.2:
        label = "negative"
    else:
        label = "neutral"

    return {
        "sentiment_polarity": round(polarity, 4),
        "sentiment_label": label,
    }


def _classify_mood(
    audio_features: dict[str, Any] | None,
    sentiment_polarity: float | None,
    metadata_text: str,
) -> dict[str, Any]:
    scores = {
        "happy": 0.25,
        "sad": 0.25,
        "chill": 0.25,
        "angry": 0.25,
        "fear": 0.25,
        "surprise": 0.25,
        "neutral": 0.35,
    }
    reasons: list[str] = []

    tempo = None
    energy = None
    mode = None

    if audio_features:
        tempo = float(audio_features.get("tempo_bpm", 0.0))
        energy = float(audio_features.get("energy", 0.0))
        mode = str(audio_features.get("mode", "")).lower()

        if tempo >= 100:
            scores["happy"] += 1.2
            scores["surprise"] += 0.5
        if tempo >= 130:
            scores["surprise"] += 0.8
        if tempo < 85:
            scores["sad"] += 1.3
            scores["chill"] += 0.6
        if 70 <= tempo <= 110:
            scores["chill"] += 1.2
            scores["neutral"] += 0.4

        if energy >= 0.65:
            scores["happy"] += 1.5
            scores["angry"] += 1.0
            scores["surprise"] += 0.7
        if energy < 0.35:
            scores["sad"] += 1.0
            scores["chill"] += 1.3
            scores["fear"] += 0.4

        if mode == "major":
            scores["happy"] += 1.3
            scores["surprise"] += 0.3
        elif mode == "minor":
            scores["sad"] += 1.2
            scores["fear"] += 0.8
            scores["angry"] += 0.6

    if sentiment_polarity is not None:
        if sentiment_polarity > 0.2:
            scores["happy"] += 1.5
            scores["chill"] += 0.4
        elif sentiment_polarity < -0.2:
            scores["sad"] += 1.9
            scores["fear"] += 0.8
            scores["angry"] += 0.5
        else:
            scores["neutral"] += 0.8
            scores["chill"] += 0.5

    lower_text = metadata_text.lower()
    party_terms = ["party", "dance", "celebration", "joy", "fun", "festival", "freedom"]
    calm_terms = ["chill", "relax", "calm", "ambient", "sleep", "lofi", "meditation", "soft"]
    dark_terms = ["rage", "hard", "metal", "angry", "dark", "haunted", "horror", "panic"]

    if any(term in lower_text for term in party_terms):
        scores["happy"] += 0.8
    if any(term in lower_text for term in calm_terms):
        scores["chill"] += 1.0
        scores["sad"] += 0.4
    if any(term in lower_text for term in dark_terms):
        scores["angry"] += 1.0
        scores["fear"] += 0.6

    # Explicit happy rule from the requested behavior.
    if (
        tempo is not None
        and energy is not None
        and sentiment_polarity is not None
        and tempo > 100
        and energy > 0.6
        and mode == "major"
        and sentiment_polarity > 0
    ):
        scores["happy"] += 2.6
        reasons.append("tempo>100 + major key + positive lyrics + high energy")

    winner = max(scores, key=scores.get)
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top = ordered[0][1]
    second = ordered[1][1] if len(ordered) > 1 else 0.0
    confidence = max(0.35, min(0.98, 0.5 + (top - second) / 4.0))

    return {
        "final_mood": winner,
        "confidence": round(float(confidence), 4),
        "scores": {name: round(float(value), 4) for name, value in scores.items()},
        "reasons": reasons,
    }


def analyze_youtube_song_mood(
    youtube_url: str,
    title: str | None = None,
    channel: str | None = None,
    description: str | None = None,
    lyrics_text: str | None = None,
    use_cache: bool = True,
) -> dict[str, Any]:
    video_id = _extract_video_id(youtube_url)
    cache_key = video_id or youtube_url

    if use_cache and cache_key in _MOOD_CACHE:
        cached = dict(_MOOD_CACHE[cache_key])
        cached["cached"] = True
        return cached

    warnings: list[str] = []
    audio_features: dict[str, Any] | None = None

    if youtube_url:
        with tempfile.TemporaryDirectory(prefix="yt-mood-") as temp_dir_str:
            temp_dir = Path(temp_dir_str)
            source_file = _download_audio(youtube_url, temp_dir, warnings)
            if source_file is not None:
                try:
                    normalized = _prepare_audio(source_file, temp_dir, warnings)
                    audio_features = _extract_audio_features(normalized)
                except Exception as exc:  # pragma: no cover - runtime decoding path
                    warnings.append(f"Audio analysis failed: {str(exc)}")

    lyrics_source = "provided"
    cleaned_title = _clean_title_for_lyrics(title or "")

    if not lyrics_text:
        lyrics_source = "not_found"
        if cleaned_title or channel:
            artist, song_title = _split_artist_title(cleaned_title or "", channel or "")
            fetched_lyrics = _fetch_lyrics(artist, song_title)
            if fetched_lyrics:
                lyrics_text = fetched_lyrics
                lyrics_source = "lyrics_ovh"

    sentiment = _analyze_sentiment(lyrics_text)

    metadata_text = " ".join([
        title or "",
        channel or "",
        description or "",
    ]).strip()

    classification = _classify_mood(
        audio_features=audio_features,
        sentiment_polarity=sentiment["sentiment_polarity"],
        metadata_text=metadata_text,
    )

    result = {
        "youtube_url": youtube_url,
        "video_id": video_id,
        "audio_features": audio_features,
        "lyrics": {
            "source": lyrics_source,
            **sentiment,
        },
        "final_mood": classification["final_mood"],
        "confidence": classification["confidence"],
        "scores": classification["scores"],
        "rules_triggered": classification["reasons"],
        "status": "ok" if audio_features else "partial",
        "warnings": warnings,
        "cached": False,
    }

    if cache_key:
        if len(_MOOD_CACHE) >= _MAX_CACHE_SIZE:
            oldest = next(iter(_MOOD_CACHE), None)
            if oldest is not None:
                _MOOD_CACHE.pop(oldest, None)
        _MOOD_CACHE[cache_key] = dict(result)

    return result
