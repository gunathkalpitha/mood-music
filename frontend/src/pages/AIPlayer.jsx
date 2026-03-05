import React, { useRef, useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import MusicPlayer from '../components/MusicPlayer.jsx'

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

const STEPS = [
    { id: 'cam', icon: '📷', label: 'Starting camera…' },
    { id: 'face', icon: '👤', label: 'Detecting your face…' },
    { id: 'mood', icon: '🧠', label: 'Reading your mood…' },
    { id: 'search', icon: '🎵', label: 'Finding matching songs…' },
]

export default function AIPlayer({ onBack }) {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    const [phase, setPhase] = useState('permission') // permission | loading | result | error
    const [stepIdx, setStepIdx] = useState(0)
    const [emotion, setEmotion] = useState(null)
    const [tracks, setTracks] = useState([])
    const [error, setError] = useState('')
    const [currentIdx, setCurrentIdx] = useState(0)

    const stopCam = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }, [])

    const startDetection = useCallback(async () => {
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
            return
        }

        // Step 1: wait for video ready
        await new Promise(r => setTimeout(r, 1800))
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
            const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

            setStepIdx(3)
            const res = await axios.post(`${BACKEND_URL}/detect-mood`, { image: base64 }, { timeout: 20000 })
            const data = res.data
            setEmotion({ emotion: data.emotion, scores: data.scores })
            setTracks(data.tracks || [])
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
        }
    }, [stopCam])

    // Auto-start on mount
    useEffect(() => {
        return () => stopCam()
    }, [stopCam])

    const retry = () => {
        setPhase('permission')
        setEmotion(null)
        setTracks([])
        setCurrentIdx(0)
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
                        <p>Your camera will capture a photo to analyze your facial expression and find the perfect songs</p>
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
                    {/* Mini cam preview */}
                    <div className="ai-cam-strip" style={{ marginLeft: 'auto' }}>
                        <video ref={videoRef} autoPlay muted playsInline />
                        <div className="ai-cam-label">● LIVE</div>
                    </div>
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="ai-thinking">
                    <div className="ai-orb" />
                    <div className="ai-thinking-text">
                        <h3>Analyzing your vibe…</h3>
                        <p>Hold still for a moment while I read how you're feeling</p>
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
            <MusicPlayer
                tracks={tracks}
                title={`🎭 Mood: ${cfg?.label ?? 'Detected'}`}
                subtitle={`AI picked these for your ${cfg?.label?.toLowerCase() ?? ''} vibe`}
                accentColor={cfg?.color ?? 'var(--accent)'}
            />
        </div>
    )
}
