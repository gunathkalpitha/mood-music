import axios from 'axios'

const BACKEND_TIMEOUT_MS = 180000

function normalizeMood(mood) {
    const raw = String(mood || '').toLowerCase().trim()
    if (!raw) return 'neutral'

    const map = {
        energetic: 'happy',
        excitement: 'surprise',
        calm: 'chill',
        relaxed: 'chill',
        relax: 'chill',
    }

    return map[raw] || raw
}

function resolveYoutubeUrl(track) {
    if (!track) return ''
    if (track.youtube_url) return track.youtube_url
    if (track.videoId) return `https://www.youtube.com/watch?v=${track.videoId}`
    return ''
}

function toPayload(track) {
    return {
        youtube_url: resolveYoutubeUrl(track),
        title: track?.title || null,
        channel: track?.channel || null,
        description: track?.description || null,
    }
}

function applyAnalysis(track, analysis) {
    const normalizedMood = normalizeMood(analysis?.final_mood)
    const confidenceRaw = Number(analysis?.confidence)
    const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : undefined

    return {
        ...track,
        aiEmotion: normalizedMood,
        aiEmotionRaw: analysis?.final_mood || normalizedMood,
        aiEmotionConfidence: confidence,
        aiEmotionSource: 'audio_pipeline_v1',
        aiEmotionSignals: analysis?.rules_triggered || [],
        aiMoodAnalysis: analysis || null,
        audioFeatures: analysis?.audio_features || null,
        lyricsSentiment: analysis?.lyrics?.sentiment_polarity,
    }
}

export async function analyzeTrackMood(track, backendUrl) {
    const payload = toPayload(track)
    if (!payload.youtube_url) return track

    const response = await axios.post(
        `${backendUrl}/analyze-song-mood`,
        payload,
        { timeout: BACKEND_TIMEOUT_MS }
    )

    return applyAnalysis(track, response.data)
}

export async function analyzeTracksMoodBatch(tracks, backendUrl) {
    if (!Array.isArray(tracks) || tracks.length === 0) return tracks

    const payloadTracks = tracks
        .map((track) => ({ original: track, payload: toPayload(track) }))
        .filter((entry) => Boolean(entry.payload.youtube_url))

    if (payloadTracks.length === 0) return tracks

    const response = await axios.post(
        `${backendUrl}/analyze-song-moods`,
        {
            tracks: payloadTracks.map((entry) => entry.payload),
            use_cache: true,
        },
        { timeout: BACKEND_TIMEOUT_MS }
    )

    const results = Array.isArray(response?.data?.results) ? response.data.results : []

    const byVideoId = new Map()
    for (const result of results) {
        if (result?.video_id) {
            byVideoId.set(result.video_id, result)
        }
    }

    return tracks.map((track) => {
        const youtubeUrl = resolveYoutubeUrl(track)
        let matched = null

        if (track?.videoId && byVideoId.has(track.videoId)) {
            matched = byVideoId.get(track.videoId)
        }

        if (!matched && youtubeUrl) {
            matched = results.find((result) => result?.youtube_url === youtubeUrl) || null
        }

        if (!matched) return track
        return applyAnalysis(track, matched)
    })
}
