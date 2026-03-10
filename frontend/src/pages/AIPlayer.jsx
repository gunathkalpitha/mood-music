import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import axios from 'axios'
import MusicPlayer from '../components/MusicPlayer.jsx'
import { useSettings } from '../contexts/SettingsContext.jsx'
import { useLibrary } from '../contexts/LibraryContext.jsx'
import { annotateTrackWithEmotion } from '../utils/trackEmotionClassifier.js'

const EMOTION_CONFIG = {
    happy: { icon: '😄', color: 'var(--e-happy)', label: 'Happy' },
    sad: { icon: '😢', color: 'var(--e-sad)', label: 'Sad' },
    angry: { icon: '😠', color: 'var(--e-angry)', label: 'Angry' },
    neutral: { icon: '😐', color: 'var(--e-neutral)', label: 'Neutral' },
    fear: { icon: '😨', color: 'var(--e-fear)', label: 'Fearful' },
    surprise: { icon: '😲', color: 'var(--e-surprise)', 'label': 'Surprised' },
    disgust: { icon: '😒', color: 'var(--e-disgust)', label: 'Disgusted' },
}

const STEPS = [
    { id: 'cam', icon: '📷', label: 'Starting camera…' },
    { id: 'face', icon: '👤', label: 'Detecting your face…' },
    { id: 'mood', icon: '🧠', label: 'Reading your mood…' },
    { id: 'search', icon: '🎵', label: 'Finding matching songs…' },
]

const CALM_HINTS = [
    'calm', 'relax', 'relaxing', 'chill', 'lofi', 'ambient', 'soft', 'sleep',
    'meditation', 'acoustic', 'slow', 'peace', 'piano', 'rain'
]

const EMOTION_PLAY_PRIORITY = {
    happy: ['happy', 'surprise', 'sad'],
    sad: ['sad', 'fear', 'happy'],
    angry: ['sad', 'happy', 'fear'],
    fear: ['sad', 'fear', 'happy'],
    surprise: ['surprise', 'happy', 'sad'],
    neutral: ['sad', 'happy', 'fear'],
    disgust: ['sad', 'happy', 'fear'],
}

function trackText(track) {
    return `${track?.title ?? ''} ${track?.channel ?? ''} ${track?.description ?? ''}`.toLowerCase()
}

function isCalmTrack(track) {
    const text = trackText(track)
    return CALM_HINTS.some((hint) => text.includes(hint))
}

function dedupeTracks(tracks) {
    const seen = new Set()
    const unique = []
    for (const track of tracks) {
        const id = track?.videoId
        if (!id || seen.has(id)) continue
        seen.add(id)
        unique.push(track)
    }
    return unique
}

function selectTracksForMood(playlistTracks, detectedEmotion) {
    const emotion = (detectedEmotion || 'neutral').toLowerCase()
    const uniqueTracks = dedupeTracks(playlistTracks)
    const annotated = uniqueTracks.map((track) => annotateTrackWithEmotion(track))
    const calmBucket = annotated.filter(isCalmTrack)
    const ordered = []
    const used = new Set()

    const appendBucket = (bucket) => {
        for (const track of bucket) {
            if (used.has(track.videoId)) continue
            used.add(track.videoId)
            ordered.push(track)
        }
    }

    if (['sad', 'angry', 'fear', 'neutral', 'disgust'].includes(emotion)) {
        appendBucket(calmBucket)
    }

    if (emotion === 'happy') {
        appendBucket(annotated.filter((track) => track.aiEmotion === 'happy'))
        appendBucket(calmBucket)
    }

    const priority = EMOTION_PLAY_PRIORITY[emotion] ?? EMOTION_PLAY_PRIORITY.neutral
    for (const targetEmotion of priority) {
        appendBucket(annotated.filter((track) => track.aiEmotion === targetEmotion))
    }

    appendBucket(annotated)
    return ordered
}

export default function AIPlayer({ onBack, autoStartToken = 0 }) {
    const { settings } = useSettings()
    const { playlists } = useLibrary()

    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const autoRunTimerRef = useRef(null)
    const detectionInFlightRef = useRef(false)
    const lastAutoStartTokenRef = useRef(0)
    const hasAutoStartedRef = useRef(false)
    const playedTracksByEmotionRef = useRef({})

    const [phase, setPhase] = useState('permission') // permission | loading | result | error
    const [stepIdx, setStepIdx] = useState(0)
    const [emotion, setEmotion] = useState(null)
    const [tracks, setTracks] = useState([])
    const [error, setError] = useState('')
    const [trackSource, setTrackSource] = useState('api')
    const [autoPlayToken, setAutoPlayToken] = useState(0)
    const [initialTrackIndex, setInitialTrackIndex] = useState(0)

const backendUrl = settings?.backendUrl?.trim() || 'http://127.0.0.1:8000'
    const captureQuality = Number(settings?.captureQuality) || 0.8
    const aiAutoRunEnabled = settings?.aiAutoRunEnabled !== false
    const aiAutoRunIntervalMs = Number(settings?.aiAutoRunIntervalMs) || 150000
    const autoPlayAfterDetection = settings?.autoPlayAfterDetection !== false
    const preferPlaylistForMood = settings?.preferPlaylistForMood !== false
    const allPlaylistTracks = useMemo(
        () => playlists.flatMap((playlist) => playlist.tracks || []),
        [playlists]
    )

    const getNextTrackIndexForEmotion = useCallback((candidateTracks, detectedEmotion) => {
        if (!candidateTracks || candidateTracks.length === 0) return 0

        const emotionKey = (detectedEmotion || 'neutral').toLowerCase()
        const playedForEmotion = playedTracksByEmotionRef.current[emotionKey] || new Set()

        let nextIndex = candidateTracks.findIndex((track) => {
            const id = track?.videoId
            return id && !playedForEmotion.has(id)
        })

        // If we played all tracks in this emotion bucket, start a fresh cycle.
        if (nextIndex === -1) {
            playedForEmotion.clear()
            nextIndex = 0
        }

        const chosenId = candidateTracks[nextIndex]?.videoId
        if (chosenId) {
            playedForEmotion.add(chosenId)
        }

        playedTracksByEmotionRef.current[emotionKey] = playedForEmotion
        return nextIndex
    }, [])

    const waitForUsableVideoFrame = useCallback(async () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return

        // Metadata only gives width/height. Wait until frame data is actually available.
        if (video.readyState < 2) {
            await new Promise(resolve => {
                const onLoadedData = () => {
                    video.removeEventListener('loadeddata', onLoadedData)
                    resolve()
                }
                video.addEventListener('loadeddata', onLoadedData)
            })
        }

        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext('2d')

        // Try a few times until we get a non-black frame.
        for (let attempt = 0; attempt < 8; attempt += 1) {
            ctx.drawImage(video, 0, 0)
            const sample = ctx.getImageData(0, 0, 24, 24).data
            let total = 0
            for (let i = 0; i < sample.length; i += 4) {
                total += sample[i] + sample[i + 1] + sample[i + 2]
            }
            const avgBrightness = total / ((sample.length / 4) * 3)
            if (avgBrightness > 8) return
            await new Promise(r => setTimeout(r, 120))
        }
    }, [])

    const stopCam = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }, [])

    const clearAutoRunTimer = useCallback(() => {
        clearTimeout(autoRunTimerRef.current)
        autoRunTimerRef.current = null
    }, [])

    const startDetection = useCallback(async () => {
        if (detectionInFlightRef.current) return
        detectionInFlightRef.current = true
        setPhase('loading')
        setStepIdx(0)
        setError('')

        // Step 0: start cam
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            streamRef.current = stream
            if (videoRef.current) videoRef.current.srcObject = stream
            setStepIdx(1)
        } catch {
            setError('Camera access denied. Please allow camera permissions and try again.')
            setPhase('error')
            detectionInFlightRef.current = false
            return
        }

        // Step 1: wait for video dimensions before capture
        await new Promise(resolve => {
            const video = videoRef.current
            if (!video) return resolve()
            if (video.readyState >= 2 && video.videoWidth > 0) return resolve()

            const onLoaded = () => {
                video.removeEventListener('loadedmetadata', onLoaded)
                resolve()
            }
            video.addEventListener('loadedmetadata', onLoaded)
        })

        if (videoRef.current) {
            try {
                await videoRef.current.play()
            } catch {
                // Some browsers already autoplay the stream; ignore play() errors.
            }
        }

        await waitForUsableVideoFrame()

        await new Promise(r => setTimeout(r, 1000))
        setStepIdx(2)

        // Step 2: capture and analyze
        await new Promise(r => setTimeout(r, 1200))
        try {
            const canvas = canvasRef.current
            const video = videoRef.current
            if (!canvas || !video) throw new Error('No video')
            canvas.width = video.videoWidth || 640
            canvas.height = video.videoHeight || 480
            canvas.getContext('2d').drawImage(video, 0, 0)
            const base64 = canvas.toDataURL('image/jpeg', captureQuality).split(',')[1]

            setStepIdx(3)
            const res = await axios.post(`${backendUrl}/detect-mood`, { image: base64 }, { timeout: 20000 })
            const data = res.data
            const detectedEmotion = data.emotion
            const playlistMatched = selectTracksForMood(allPlaylistTracks, detectedEmotion).slice(0, 30)
            const apiTracks = data.tracks || []
            let chosenTracks = apiTracks
            let chosenSource = 'api'

            if (preferPlaylistForMood) {
                if (playlistMatched.length > 0) {
                    chosenTracks = playlistMatched
                    chosenSource = 'playlist'
                }
            } else {
                if (apiTracks.length > 0) {
                    chosenTracks = apiTracks
                    chosenSource = 'api'
                } else if (playlistMatched.length > 0) {
                    chosenTracks = playlistMatched
                    chosenSource = 'playlist-fallback'
                }
            }

            setEmotion({ emotion: detectedEmotion, scores: data.scores })
            setTracks(chosenTracks)
            setTrackSource(chosenSource)
            setInitialTrackIndex(getNextTrackIndexForEmotion(chosenTracks, detectedEmotion))
            if (autoPlayAfterDetection && chosenTracks.length > 0) {
                setAutoPlayToken((value) => value + 1)
            }
            stopCam()
            setPhase('result')
        } catch (e) {
            stopCam()
            if (e.code === 'ECONNREFUSED' || e.message?.includes('Network') || e.code === 'ERR_NETWORK') {
                setError('AI backend is offline. Please start the FastAPI server:\n\nuvicorn backend.main:app --reload')
            } else {
                setError('Could not detect emotion. Make sure your face is clearly visible and try again.')
            }
            setPhase('error')
        } finally {
            detectionInFlightRef.current = false
        }
    }, [allPlaylistTracks, autoPlayAfterDetection, backendUrl, captureQuality, preferPlaylistForMood, stopCam, waitForUsableVideoFrame])

    // Auto-start on mount
    useEffect(() => {
        return () => {
            clearAutoRunTimer()
            stopCam()
        }
    }, [clearAutoRunTimer, stopCam])

    useEffect(() => {
        if (phase !== 'permission') return
        if (!autoStartToken) return
        if (lastAutoStartTokenRef.current === autoStartToken) return

        lastAutoStartTokenRef.current = autoStartToken
        startDetection()
    }, [autoStartToken, phase, startDetection])

    useEffect(() => {
        if (phase !== 'permission') return
        if (!aiAutoRunEnabled) return
        if (hasAutoStartedRef.current) return

        hasAutoStartedRef.current = true
        startDetection()
    }, [aiAutoRunEnabled, phase, startDetection])

    useEffect(() => {
        clearAutoRunTimer()
        if (!aiAutoRunEnabled) return
        if (phase !== 'result') return

        autoRunTimerRef.current = setTimeout(() => {
            startDetection()
        }, aiAutoRunIntervalMs)

        return clearAutoRunTimer
    }, [aiAutoRunEnabled, aiAutoRunIntervalMs, clearAutoRunTimer, phase, startDetection])

    const retry = () => {
        clearAutoRunTimer()
        hasAutoStartedRef.current = false
        setPhase('permission')
        setEmotion(null)
        setTracks([])
        setTrackSource('api')
        setInitialTrackIndex(0)
        setStepIdx(0)
    }

    const cfg = emotion ? (EMOTION_CONFIG[emotion.emotion] ?? EMOTION_CONFIG.neutral) : null

    // ===== PERMISSION SCREEN =====
    if (phase === 'permission') {
        return (
            <div className="ai-player-page">
                <div className="ai-page-header">
                    <button className="back-btn" onClick={onBack}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>🤖 AI Music Match</span>
                </div>
                <div className="ai-thinking">
                    <div style={{ fontSize: 80, filter: 'drop-shadow(0 0 30px rgba(139,92,246,0.6))' }}>🎭</div>
                    <div className="ai-thinking-text">
                        <h3>Let AI read your mood</h3>
                        <p>Your camera runs privately in the background to analyze facial emotion and find matching songs.</p>
                        {aiAutoRunEnabled && (
                            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                Auto mode is on: it will re-run every {Math.round(aiAutoRunIntervalMs / 1000)}s.
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                        <button className="btn btn-primary" style={{ fontSize: 16, padding: '14px 36px' }} onClick={startDetection}>
                            📷 Allow Camera & Start
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Camera is only used for mood analysis — no recording</span>
                    </div>
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <video ref={videoRef} style={{ display: 'none' }} autoPlay muted playsInline />
            </div>
        )
    }

    // ===== LOADING SCREEN =====
    if (phase === 'loading') {
        return (
            <div className="ai-player-page">
                <div className="ai-page-header">
                    <button className="back-btn" onClick={onBack}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>🤖 AI Music Match</span>
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <video ref={videoRef} style={{ display: 'none' }} autoPlay muted playsInline />
                <div className="ai-thinking">
                    <div className="ai-orb" />
                    <div className="ai-thinking-text">
                        <h3>Analyzing your vibe…</h3>
                        <p>Hold still for a moment while I read how you're feeling. Camera preview stays hidden.</p>
                    </div>
                    <div className="ai-thinking-steps">
                        {STEPS.map((s, i) => (
                            <div key={s.id} className={`ai-step ${i === stepIdx ? 'active' : i < stepIdx ? 'done' : ''}`}>
                                <span className="ai-step-icon">
                                    {i < stepIdx ? '✅' : i === stepIdx ? <span className="spin">⟳</span> : s.icon}
                                </span>
                                <span>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // ===== ERROR =====
    if (phase === 'error') {
        return (
            <div className="ai-player-page">
                <div className="ai-page-header">
                    <button className="back-btn" onClick={onBack}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>🤖 AI Music Match</span>
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="ai-thinking">
                    <div style={{ fontSize: 64 }}>⚠️</div>
                    <div className="ai-thinking-text">
                        <h3>Something went wrong</h3>
                        <p style={{ whiteSpace: 'pre-line', maxWidth: 400, fontSize: 13 }}>{error}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-ghost" onClick={onBack}>← Go Back</button>
                        <button className="btn btn-primary" onClick={retry}>🔄 Try Again</button>
                    </div>
                </div>
            </div>
        )
    }

    // ===== RESULT =====
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease both' }}>
            <div className="ai-page-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <button className="back-btn" onClick={onBack}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                        <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>🤖 AI Music Match</span>
                {cfg && (
                    <div style={{
                        marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 16px', borderRadius: 99,
                        background: `${cfg.color}22`, border: `1px solid ${cfg.color}55`,
                        fontSize: 13, fontWeight: 700, color: cfg.color
                    }}>
                        {cfg.icon} {cfg.label} Detected
                    </div>
                )}
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={retry}>
                    🔄 Re-detect
                </button>
            </div>
            {aiAutoRunEnabled && (
                <div style={{ margin: '10px 24px 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Auto mode enabled: camera and detection will run every {Math.round(aiAutoRunIntervalMs / 1000)} seconds.
                </div>
            )}
            <MusicPlayer
                tracks={tracks}
                title={`🎭 Mood: ${cfg?.label ?? 'Detected'}`}
                subtitle={trackSource === 'playlist'
                    ? `Auto-playing ${cfg?.label?.toLowerCase() ?? 'mood'} tracks from your playlists`
                    : trackSource === 'playlist-fallback'
                        ? `No API matches found, using your playlist tracks`
                    : `AI picked these for your ${cfg?.label?.toLowerCase() ?? ''} vibe`
                }
                accentColor={cfg?.color ?? 'var(--accent)'}
                autoPlay={autoPlayAfterDetection}
                autoPlayToken={autoPlayToken}
                initialIndex={initialTrackIndex}
            />
        </div>
    )
}
