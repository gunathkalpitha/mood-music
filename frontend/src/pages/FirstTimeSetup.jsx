import React, { useMemo, useState } from 'react'
import { DETECTION_INTERVAL_OPTIONS } from '../contexts/SettingsContext.jsx'

const DEFAULT_BACKEND = 'http://localhost:8000'


const STEPS = [
    { id: 'account', title: 'Account Details', subtitle: 'Add your profile and Gmail to personalize the app.' },
    { id: 'preferences', title: 'Essential Settings', subtitle: 'Configure mood detection and startup preferences.' },
    { id: 'permissions', title: 'Ready to Detect', subtitle: 'Confirm permissions and start mood detection.' },
]

function isValidGmail(email) {
    return /^[^@\s]+@gmail\.com$/i.test(email)
}

export default function FirstTimeSetup({ user, settings, onComplete }) {
    const [step, setStep] = useState(0)
    const [error, setError] = useState('')

    const [name, setName] = useState(user?.name ?? '')
    const [gmail, setGmail] = useState(user?.email ?? '')
    const [googleLinked, setGoogleLinked] = useState(Boolean(user?.googleLinked))

    const [backendUrl, setBackendUrl] = useState(settings?.backendUrl ?? DEFAULT_BACKEND)
    const [detectionIntervalMs, setDetectionIntervalMs] = useState(Number(settings?.detectionIntervalMs) || 150000)
    const [captureQuality, setCaptureQuality] = useState(Number(settings?.captureQuality) || 0.8)
    const [autoDetectOnCameraStart, setAutoDetectOnCameraStart] = useState(settings?.autoDetectOnCameraStart !== false)
    const [openExternalLinksInBrowser, setOpenExternalLinksInBrowser] = useState(settings?.openExternalLinksInBrowser !== false)
    const [startScreen, setStartScreen] = useState(settings?.startScreen || 'ai')

    const [cameraConsent, setCameraConsent] = useState(false)
    const [privacyConsent, setPrivacyConsent] = useState(false)

    const progressLabel = useMemo(() => `Step ${step + 1} of ${STEPS.length}`, [step])

    const validateStep = () => {
        if (step === 0) {
            if (!name.trim()) {
                setError('Please enter your name.')
                return false
            }
            if (!gmail.trim() || !isValidGmail(gmail.trim())) {
                setError('Please enter a valid Gmail address, for example name@gmail.com.')
                return false
            }
            setError('')
            return true
        }

        if (step === 1) {
            if (!backendUrl.trim()) {
                setError('Backend URL is required for emotion detection.')
                return false
            }
            setError('')
            return true
        }

        if (!cameraConsent || !privacyConsent) {
            setError('Please confirm camera and privacy consent to continue.')
            return false
        }

        setError('')
        return true
    }

    const goNext = () => {
        if (!validateStep()) return

        if (step < STEPS.length - 1) {
            setStep((s) => s + 1)
            return
        }

        onComplete?.({
            userProfile: {
                name: name.trim(),
                email: gmail.trim(),
                googleLinked,
                premium: Boolean(user?.premium),
            },
            appSettings: {
                backendUrl: backendUrl.trim() || DEFAULT_BACKEND,
                detectionIntervalMs: Number(detectionIntervalMs) || 150000,
                captureQuality: Number(captureQuality) || 0.8,
                autoDetectOnCameraStart: Boolean(autoDetectOnCameraStart),
                openExternalLinksInBrowser: Boolean(openExternalLinksInBrowser),
                showToastNotifications: settings?.showToastNotifications !== false,
                startScreen: startScreen || 'ai',
                playlistLink: settings?.playlistLink ?? '',
            },
        })
    }

    const goBack = () => {
        setError('')
        setStep((s) => Math.max(0, s - 1))
    }

    return (
        <div className="welcome-screen onboarding-screen">
            <div className="welcome-logo" style={{ marginBottom: 28 }}>
                <div className="welcome-logo-icon">🎵</div>
                <h1>Mood Music Setup</h1>
                <p>First-time setup before AI emotion detection</p>
            </div>

            <div className="onboarding-shell glass-card">
                <div className="onboarding-head">
                    <div className="question-step">{progressLabel}</div>
                    <h2>{STEPS[step].title}</h2>
                    <p>{STEPS[step].subtitle}</p>
                </div>

                {step === 0 && (
                    <div className="onboarding-body">
                        <label className="settings-label">Display name</label>
                        <input
                            className="modal-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                        />

                        <label className="settings-label">Gmail</label>
                        <input
                            className="modal-input"
                            value={gmail}
                            onChange={(e) => setGmail(e.target.value)}
                            placeholder="example@gmail.com"
                        />

                        <label className="settings-check">
                            <input
                                type="checkbox"
                                checked={googleLinked}
                                onChange={(e) => setGoogleLinked(e.target.checked)}
                            />
                            Google account linked
                        </label>

                        <div className="onboarding-inline-actions">
                            <button
                                className="btn btn-ghost"
                                onClick={() => window.open('https://accounts.google.com/signup', '_blank', 'noopener,noreferrer')}
                            >
                                Open Google Sign Up
                            </button>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="onboarding-body">
                        <label className="settings-label">Backend URL</label>
                        <input
                            className="modal-input"
                            value={backendUrl}
                            onChange={(e) => setBackendUrl(e.target.value)}
                            placeholder={DEFAULT_BACKEND}
                        />

                        <label className="settings-label">Auto-detect interval</label>
                        <select
                            className="modal-input"
                            value={String(detectionIntervalMs)}
                            onChange={(e) => setDetectionIntervalMs(Number(e.target.value))}
                        >
                            {DETECTION_INTERVAL_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        <label className="settings-label">Capture quality</label>
                        <select
                            className="modal-input"
                            value={String(captureQuality)}
                            onChange={(e) => setCaptureQuality(Number(e.target.value))}
                        >
                            <option value="0.6">Fast (0.6)</option>
                            <option value="0.8">Balanced (0.8)</option>
                            <option value="0.92">High quality (0.92)</option>
                        </select>

                        <label className="settings-label">Default launch screen</label>
                        <select
                            className="modal-input"
                            value={startScreen}
                            onChange={(e) => setStartScreen(e.target.value)}
                        >
                            <option value="ai">AI Music Match</option>
                            <option value="home">Home</option>
                            <option value="playlist">My Playlists</option>
                        </select>

                        <label className="settings-check">
                            <input
                                type="checkbox"
                                checked={autoDetectOnCameraStart}
                                onChange={(e) => setAutoDetectOnCameraStart(e.target.checked)}
                            />
                            Run immediate scan when camera starts
                        </label>

                        <label className="settings-check">
                            <input
                                type="checkbox"
                                checked={openExternalLinksInBrowser}
                                onChange={(e) => setOpenExternalLinksInBrowser(e.target.checked)}
                            />
                            Open links in browser
                        </label>
                    </div>
                )}

                {step === 2 && (
                    <div className="onboarding-body">
                        <div className="onboarding-note">
                            After setup, the app will immediately run emotion detection and recommend music.
                        </div>

                        <label className="settings-check">
                            <input
                                type="checkbox"
                                checked={cameraConsent}
                                onChange={(e) => setCameraConsent(e.target.checked)}
                            />
                            I allow camera access for facial emotion detection
                        </label>

                        <label className="settings-check">
                            <input
                                type="checkbox"
                                checked={privacyConsent}
                                onChange={(e) => setPrivacyConsent(e.target.checked)}
                            />
                            I understand images are only used for mood analysis
                        </label>
                    </div>
                )}

                {error && <div className="settings-help error">{error}</div>}

                <div className="onboarding-footer">
                    <button className="btn btn-ghost" onClick={goBack} disabled={step === 0}>Back</button>
                    <button className="btn btn-primary" onClick={goNext}>
                        {step === STEPS.length - 1 ? 'Finish & Detect Mood' : 'Continue'}
                    </button>
                </div>
            </div>

            <div className="progress-dots" style={{ marginTop: 20 }}>
                {STEPS.map((_, i) => (
                    <div key={i} className={`progress-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
                ))}
            </div>
        </div>
    )
}
