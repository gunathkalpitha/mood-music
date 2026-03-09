import React, { useRef, useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import TrackCard from '../components/TrackCard.jsx'
import { useSettings } from '../contexts/SettingsContext.jsx'

const AUTO_DETECT_INTERVAL_MS = 150000 // 2 minutes 30 seconds

function formatIntervalLabel(ms) {
    const totalSeconds = Math.round(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    if (minutes === 0) return `${seconds}s`
    if (seconds === 0) return `${minutes}m`
    return `${minutes}m ${seconds}s`
}

const EMOTION_CONFIG = {
    happy: { icon: '😄', color: 'var(--e-happy)', label: 'Happy' },
    sad: { icon: '😢', color: 'var(--e-sad)', label: 'Sad' },
    angry: { icon: '😠', color: 'var(--e-angry)', label: 'Angry' },
    neutral: { icon: '😐', color: 'var(--e-neutral)', label: 'Neutral' },
    fear: { icon: '😨', color: 'var(--e-fear)', label: 'Fearful' },
    surprise: { icon: '😲', color: 'var(--e-surprise)', 'label': 'Surprised' },
    disgust: { icon: '😒', color: 'var(--e-disgust)', label: 'Disgusted' },
}

export default function MoodDetect() {
    const { settings } = useSettings()

    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const timerRef = useRef(null)
    const detectionInFlightRef = useRef(false)

    const [streaming, setStreaming] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [emotion, setEmotion] = useState(null)   // { emotion, scores }
    const [tracks, setTracks] = useState([])

const backendUrl = settings?.backendUrl?.trim() || 'http://127.0.0.1:8000'
    const detectIntervalMs = Number(settings?.detectionIntervalMs) || AUTO_DETECT_INTERVAL_MS
    const captureQuality = Number(settings?.captureQuality) || 0.8
    const detectOnStart = settings?.autoDetectOnCameraStart !== false

    const stopCamera = useCallback(() => {
        clearInterval(timerRef.current)
        timerRef.current = null
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null
        setStreaming(false)
    }, [])

    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || detectionInFlightRef.current) return
        const video = videoRef.current
        if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return

        detectionInFlightRef.current = true
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        const base64 = canvas.toDataURL('image/jpeg', captureQuality).split(',')[1]
        setLoading(true)
        try {
            const res = await axios.post(`${backendUrl}/detect-mood`, { image: base64 }, { timeout: 15000 })
            setEmotion({ emotion: res.data.emotion, scores: res.data.scores })
            setTracks(res.data.tracks || [])
            setError('')
        } catch (e) {
            if (e.code === 'ECONNREFUSED' || e.message?.includes('Network')) {
                setError('Backend offline. Start the FastAPI server: uvicorn backend.main:app --reload')
            } else {
                setError('Could not detect emotion. Make sure your face is visible.')
            }
        } finally {
            setLoading(false)
            detectionInFlightRef.current = false
        }
    }, [backendUrl, captureQuality])

    const startAutoDetect = useCallback(() => {
        clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            captureAndAnalyze()
        }, detectIntervalMs)
    }, [captureAndAnalyze, detectIntervalMs])

    const startCameraAndAutoDetect = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream

                // Wait for dimensions before the first capture.
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
            }

            setStreaming(true)
            setError('')

            if (detectOnStart) {
                captureAndAnalyze()
            }
            startAutoDetect()
        } catch {
            setError('Camera access denied. Please allow webcam permissions.')
        }
    }, [captureAndAnalyze, startAutoDetect, detectOnStart])

    const toggleDetection = useCallback(async () => {
        if (streaming) {
            clearInterval(timerRef.current)
            stopCamera()
        } else {
            await startCameraAndAutoDetect()
        }
    }, [streaming, startCameraAndAutoDetect, stopCamera])

    useEffect(() => {
        if (!streaming) return
        startAutoDetect()
    }, [streaming, startAutoDetect])

    useEffect(() => () => { clearInterval(timerRef.current); streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

    const cfg = emotion ? (EMOTION_CONFIG[emotion.emotion] ?? EMOTION_CONFIG.neutral) : null

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">🎭 Mood Detect</h1>
                <p className="page-subtitle">Let your face choose the music — AI analyzes your emotion and recommends songs</p>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {/* Webcam Panel */}
                <div style={{ flex: '0 0 auto' }}>
                    <div className="glass-card" style={{
                        width: 420,
                        borderColor: cfg ? cfg.color : 'var(--border-active)',
                        padding: 24,
                        minHeight: 240,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 14,
                    }}>
                        <div style={{ fontSize: 42 }}>{streaming ? '🫥' : '📷'}</div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
                            {streaming ? 'Camera running in background' : 'Camera is off'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45 }}>
                            Live preview is hidden. Frames are captured privately for mood analysis only.
                        </div>

                        {streaming && cfg && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                width: 'fit-content',
                                borderRadius: 999,
                                padding: '6px 12px',
                                border: `1px solid ${cfg.color}`,
                                background: `${cfg.color}22`,
                                color: cfg.color,
                                fontWeight: 700,
                                fontSize: 13,
                            }}>
                                {cfg.icon} {cfg.label}
                            </div>
                        )}

                        {loading && (
                            <div style={{
                                background: 'rgba(139,92,246,0.15)',
                                border: '1px solid rgba(139,92,246,0.4)',
                                borderRadius: 10,
                                padding: '8px 10px',
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--accent-bright)',
                            }}>
                                🔍 Analyzing current frame...
                            </div>
                        )}
                    </div>

                    <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none' }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
                        <button className={`btn ${streaming ? 'btn-danger' : 'btn-primary'}`} onClick={toggleDetection}>
                            {streaming ? '⏹ Stop Camera' : '📷 Start Camera'}
                        </button>
                        {streaming && (
                            <button className="btn btn-ghost" onClick={captureAndAnalyze}>
                                {loading
                                    ? <><span className="spin">⟳</span> Detecting…</>
                                    : '🎯 Detect Now'
                                }
                            </button>
                        )}
                    </div>

                    {streaming && (
                        <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                            Auto-detection runs every {formatIntervalLabel(detectIntervalMs)} while background camera is on.
                        </div>
                    )}

                    {error && (
                        <div style={{
                            marginTop: 12, padding: '12px 16px',
                            background: 'rgba(244,63,94,0.12)',
                            border: '1px solid rgba(244,63,94,0.3)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 13, color: 'var(--danger)',
                            maxWidth: 480
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Results Panel */}
                <div style={{ flex: 1, minWidth: 300 }}>
                    {emotion && cfg && (
                        <>
                            <div style={{ marginBottom: 20 }}>
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 10,
                                    padding: '8px 20px', borderRadius: 99,
                                    background: `${cfg.color}22`,
                                    border: `1px solid ${cfg.color}`,
                                    marginBottom: 16
                                }}>
                                    <span>{cfg.icon}</span>
                                    <span style={{ fontWeight: 700, color: cfg.color, textTransform: 'capitalize' }}>
                                        {cfg.label}
                                    </span>
                                </div>

                                {emotion.scores && (
                                    <div className="mood-bars">
                                        {Object.entries(emotion.scores)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([em, score]) => {
                                                const c = EMOTION_CONFIG[em] ?? EMOTION_CONFIG.neutral
                                                return (
                                                    <div className="mood-bar-row" key={em}>
                                                        <span className="mood-bar-label">{c.icon} {em}</span>
                                                        <div className="mood-bar-track">
                                                            <div className="mood-bar-fill"
                                                                style={{ width: `${Math.round(score * 100)}%`, background: c.color }} />
                                                        </div>
                                                        <span className="mood-bar-pct">{Math.round(score * 100)}%</span>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                                    🎵 Recommended for your mood
                                </h3>
                                <div className="track-grid">
                                    {tracks.map((track, i) => (
                                        <TrackCard key={track.videoId ?? i} track={track} showAddToPlaylist />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {!emotion && (
                        <div className="empty-state glass-card" style={{ padding: 40 }}>
                            <div className="empty-state-icon">🎭</div>
                            <h3>Ready to detect your mood?</h3>
                            <p>Start the camera to begin automatic mood checks every 2 minutes and 30 seconds.</p>
                            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                                ℹ️ Requires FastAPI backend running on localhost:8000
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
