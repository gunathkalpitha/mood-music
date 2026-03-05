import React, { useRef, useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import TrackCard from '../components/TrackCard.jsx'

const BACKEND_URL = 'http://localhost:8000'

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
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const timerRef = useRef(null)

    const [streaming, setStreaming] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [emotion, setEmotion] = useState(null)   // { emotion, scores }
    const [tracks, setTracks] = useState([])

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            streamRef.current = stream
            if (videoRef.current) videoRef.current.srcObject = stream
            setStreaming(true)
            setError('')
        } catch {
            setError('Camera access denied. Please allow webcam permissions.')
        }
    }, [])

    const stopCamera = useCallback(() => {
        clearInterval(timerRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null
        setStreaming(false)
    }, [])

    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
        setLoading(true)
        try {
            const res = await axios.post(`${BACKEND_URL}/detect-mood`, { image: base64 }, { timeout: 15000 })
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
        }
    }, [])

    const toggleDetection = useCallback(async () => {
        if (streaming) {
            clearInterval(timerRef.current)
            stopCamera()
        } else {
            await startCamera()
        }
    }, [streaming, startCamera, stopCamera])

    const startAutoDetect = useCallback(() => {
        captureAndAnalyze()
        timerRef.current = setInterval(captureAndAnalyze, 5000)
    }, [captureAndAnalyze])

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
                    <div className="webcam-container" style={{ borderColor: cfg ? cfg.color : 'var(--border-active)' }}>
                        <video ref={videoRef} className="webcam-video" autoPlay muted playsInline />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {streaming && cfg && (
                            <div className="webcam-overlay">
                                <div className="emotion-display">
                                    <span className="emotion-icon">{cfg.icon}</span>
                                    <div>
                                        <div className="emotion-label" style={{ color: cfg.color }}>{cfg.label}</div>
                                        {emotion.scores && (
                                            <div className="emotion-confidence">
                                                {Math.round((emotion.scores[emotion.emotion] || 0) * 100)}% confidence
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!streaming && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(8,8,20,0.85)',
                                display: 'grid', placeItems: 'center',
                                borderRadius: 'inherit'
                            }}>
                                <div style={{ textAlign: 'center', padding: 20 }}>
                                    <div style={{ fontSize: 56, marginBottom: 16 }}>📷</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Camera off</div>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div style={{
                                position: 'absolute', top: 12, right: 12,
                                background: 'rgba(139,92,246,0.9)',
                                borderRadius: 99, padding: '4px 12px',
                                fontSize: 12, fontWeight: 700, color: 'white'
                            }}>
                                🔍 Analyzing…
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
                        <button className={`btn ${streaming ? 'btn-danger' : 'btn-primary'}`} onClick={toggleDetection}>
                            {streaming ? '⏹ Stop Camera' : '📷 Start Camera'}
                        </button>
                        {streaming && (
                            <button className="btn btn-ghost" onClick={startAutoDetect}>
                                {loading
                                    ? <><span className="spin">⟳</span> Detecting…</>
                                    : '🎯 Detect Mood'
                                }
                            </button>
                        )}
                    </div>

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
                            <p>Start the camera and click "Detect Mood" to get AI-powered music recommendations based on your facial expression.</p>
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
