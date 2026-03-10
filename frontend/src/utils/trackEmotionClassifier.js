export const EMOTION_CATEGORIES = ['happy', 'chill', 'neutral', 'sad', 'angry', 'fear', 'surprise']

const EMOTION_KEYWORDS = {
    happy: [
        'happy', 'joy', 'smile', 'sunny', 'bright', 'celebration', 'celebrate', 'dance',
        'party', 'fun', 'good vibes', 'feel good', 'love song', 'romance', 'romantic',
        'upbeat', 'groove', 'festival', 'vibe', 'positive'
    ],
    chill: [
        'chill', 'calm', 'relax', 'relaxing', 'ambient', 'lofi', 'sleep', 'focus',
        'soft', 'gentle', 'meditation', 'peaceful', 'mellow', 'easy listening'
    ],
    neutral: [
        'instrumental', 'background', 'mix', 'playlist', 'radio', 'session', 'official audio'
    ],
    sad: [
        'sad', 'cry', 'tears', 'teardrop', 'alone', 'lonely', 'heartbreak', 'broken heart',
        'miss you', 'goodbye', 'melancholy', 'slow', 'acoustic', 'lofi', 'rain', 'nostalgia',
        'pain', 'emotional', 'blue', 'blues', 'depressed'
    ],
    angry: [
        'angry', 'rage', 'fury', 'fight', 'war', 'revenge', 'hardcore', 'metal', 'rock',
        'drill', 'trap', 'beast mode', 'aggressive', 'power', 'intense', 'fire', 'beast'
    ],
    fear: [
        'fear', 'afraid', 'scared', 'anxiety', 'panic', 'haunted', 'horror', 'creepy',
        'ghost', 'nightmare', 'tense', 'suspense', 'mystery', 'shadow', 'dark ambient'
    ],
    surprise: [
        'wow', 'surprise', 'unexpected', 'twist', 'remix', 'mashup', 'drop', 'epic',
        'viral', 'fresh', 'crazy', 'wild', 'explosive', 'shocking', 'omg', 'mind blowing'
    ],
}

const EMOTION_HASHTAGS = {
    happy: ['happy', 'joy', 'goodvibes', 'feelgood', 'party', 'dance', 'romantic', 'love'],
    chill: ['chill', 'calm', 'relax', 'ambient', 'lofi', 'sleep', 'focus', 'mellow'],
    neutral: ['music', 'song', 'audio', 'mix', 'playlist', 'instrumental'],
    sad: ['sad', 'heartbreak', 'brokenheart', 'lonely', 'missyou', 'cry', 'tears', 'lofi'],
    angry: ['angry', 'rage', 'aggressive', 'beastmode', 'fight', 'trap', 'drill', 'metal'],
    fear: ['fear', 'scary', 'horror', 'creepy', 'haunted', 'nightmare', 'panic', 'anxiety'],
    surprise: ['surprise', 'wow', 'omg', 'viral', 'remix', 'mashup', 'twist', 'mindblown'],
}

function extractHashtags(rawText) {
    const tags = []
    const regex = /#([a-z0-9_]+)/gi
    let match

    while ((match = regex.exec(rawText)) !== null) {
        tags.push(match[1].toLowerCase().replace(/_/g, ''))
    }

    return tags
}

function scoreByKeywords(text, keywords, weight) {
    let score = 0
    const matched = []
    for (const keyword of keywords) {
        if (text.includes(keyword)) {
            score += keyword.includes(' ') ? (weight + 0.7) : weight
            matched.push(keyword)
        }
    }
    return { score, matched }
}

function scoreByHashtags(tags, hashtagKeywords, weight) {
    let score = 0
    const matched = []
    for (const tag of tags) {
        if (hashtagKeywords.includes(tag)) {
            score += weight
            matched.push(`#${tag}`)
        }
    }
    return { score, matched }
}

function pickWinner(scores) {
    let winner = 'neutral'
    let bestScore = -Infinity
    for (const emotion of EMOTION_CATEGORIES) {
        if (scores[emotion] > bestScore) {
            winner = emotion
            bestScore = scores[emotion]
        }
    }
    return winner
}

export function classifyTrackEmotion(track) {
    const pipelineMood = track?.aiMoodAnalysis?.final_mood
    if (pipelineMood) {
        const mood = String(pipelineMood).toLowerCase()
        const normalizedMood = EMOTION_CATEGORIES.includes(mood)
            ? mood
            : (mood === 'calm' || mood === 'relaxed' ? 'chill' : 'neutral')

        return {
            emotion: normalizedMood,
            confidence: Number(track?.aiMoodAnalysis?.confidence ?? 0.7),
            scores: track?.aiMoodAnalysis?.scores || {},
            source: 'audio_pipeline_v1',
            signals: track?.aiMoodAnalysis?.rules_triggered || [],
            hashtags: [],
        }
    }

    const rawText = `${track?.title ?? ''} ${track?.channel ?? ''} ${track?.description ?? ''}`.toLowerCase()
    const normalized = rawText.replace(/[^a-z0-9#\s]/g, ' ').replace(/\s+/g, ' ').trim()
    const hashtags = extractHashtags(rawText)

    const scores = {
        happy: 0.3,
        chill: 0.3,
        neutral: 0.3,
        sad: 0.3,
        angry: 0.3,
        fear: 0.3,
        surprise: 0.3,
    }

    const signals = {
        happy: [],
        chill: [],
        neutral: [],
        sad: [],
        angry: [],
        fear: [],
        surprise: [],
    }

    for (const emotion of EMOTION_CATEGORIES) {
        const byKeywords = scoreByKeywords(normalized, EMOTION_KEYWORDS[emotion], 1.1)
        const byHashtags = scoreByHashtags(hashtags, EMOTION_HASHTAGS[emotion], 2.8)
        scores[emotion] += byKeywords.score + byHashtags.score
        signals[emotion].push(...byKeywords.matched, ...byHashtags.matched)
    }

    if (normalized.includes('official') || normalized.includes('music video')) scores.happy += 0.2
    if (normalized.includes('relax') || normalized.includes('calm') || normalized.includes('sleep')) scores.sad += 0.6
    if (normalized.includes('live') || normalized.includes('concert')) scores.surprise += 0.4
    if (normalized.includes('hard') || normalized.includes('bass boost')) scores.angry += 0.4
    if (normalized.includes('instrumental') || normalized.includes('session')) scores.neutral += 0.6
    if (normalized.includes('chill') || normalized.includes('lofi') || normalized.includes('ambient')) scores.chill += 0.9

    const audioFeatures = track?.audioFeatures || track?.audio_features || track?.aiMoodAnalysis?.audio_features
    if (audioFeatures) {
        const bpm = Number(audioFeatures.tempo_bpm)
        const energy = Number(audioFeatures.energy)
        const mode = String(audioFeatures.mode || '').toLowerCase()
        const lyricsSentiment = Number(track?.lyricsSentiment ?? track?.aiMoodAnalysis?.lyrics?.sentiment_polarity)

        if (!Number.isNaN(bpm)) {
            if (bpm > 100) scores.happy += 1.2
            if (bpm < 85) { scores.sad += 1.1; scores.chill += 0.6 }
        }

        if (!Number.isNaN(energy)) {
            if (energy > 0.6) { scores.happy += 1.1; scores.angry += 0.6 }
            if (energy < 0.35) { scores.chill += 1.0; scores.sad += 0.5 }
        }

        if (mode === 'major') scores.happy += 0.9
        if (mode === 'minor') scores.sad += 0.8

        if (!Number.isNaN(lyricsSentiment)) {
            if (lyricsSentiment > 0.2) scores.happy += 1.0
            else if (lyricsSentiment < -0.2) scores.sad += 1.2
            else scores.neutral += 0.5
        }
    }

    const winner = pickWinner(scores)
    const sum = EMOTION_CATEGORIES.reduce((acc, emotion) => acc + scores[emotion], 0)
    const confidence = sum > 0 ? scores[winner] / sum : 0.2

    return {
        emotion: winner,
        confidence,
        scores,
        source: 'ai_hashtag_keyword_v3',
        signals: signals[winner].slice(0, 6),
        hashtags,
    }
}

export function annotateTrackWithEmotion(track, force = false) {
    if (!track) return track
    if (!force && track.aiEmotion && track.aiEmotionSource) return track

    const result = classifyTrackEmotion(track)
    return {
        ...track,
        aiEmotion: result.emotion,
        aiEmotionConfidence: Number(result.confidence.toFixed(4)),
        aiEmotionSource: result.source,
        aiEmotionSignals: result.signals,
    }
}

export function annotateTracksWithEmotion(tracks = [], force = false) {
    return tracks.map((track) => annotateTrackWithEmotion(track, force))
}
