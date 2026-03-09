import React, { useEffect, useState } from 'react'
import { useToast } from '../contexts/ToastContext.jsx'
import { DETECTION_INTERVAL_OPTIONS, useSettings } from '../contexts/SettingsContext.jsx'

const DEFAULT_BACKEND = 'http://localhost:8000'|| 'http://10.104.182.20:8000'


export default function Settings({ onBack, user, onUserChange }) {
    const toast = useToast()
    const { settings, updateSettings, resetSettings } = useSettings()

    const [name, setName] = useState(user?.name ?? '')
    const [gmail, setGmail] = useState(user?.email ?? '')
    const [googleLinked, setGoogleLinked] = useState(Boolean(user?.googleLinked))

    const [draft, setDraft] = useState(settings)

    useEffect(() => {
        setName(user?.name ?? '')
        setGmail(user?.email ?? '')
        setGoogleLinked(Boolean(user?.googleLinked))
    }, [user?.email, user?.googleLinked, user?.name])

    useEffect(() => {
        setDraft(settings)
    }, [settings])

    const gmailValid = !gmail.trim() || /^[^@\s]+@gmail\.com$/i.test(gmail.trim())

    const saveAccount = () => {
        if (!gmailValid) {
            toast('Please enter a valid Gmail address (example@gmail.com).', 'error')
            return
        }

        onUserChange?.((prev) => ({
            ...prev,
            name: name.trim(),
            email: gmail.trim(),
            googleLinked,
        }))

        toast('Account settings saved.', 'success')
    }

    const saveAppSettings = () => {
        updateSettings({
            backendUrl: draft.backendUrl?.trim() || DEFAULT_BACKEND,
            detectionIntervalMs: Number(draft.detectionIntervalMs) || 150000,
            aiAutoRunEnabled: draft.aiAutoRunEnabled !== false,
            aiAutoRunIntervalMs: Number(draft.aiAutoRunIntervalMs) || 150000,
            autoPlayAfterDetection: draft.autoPlayAfterDetection !== false,
            preferPlaylistForMood: draft.preferPlaylistForMood !== false,
            autoDetectOnCameraStart: Boolean(draft.autoDetectOnCameraStart),
            captureQuality: Number(draft.captureQuality) || 0.8,
            playlistLink: draft.playlistLink?.trim() ?? '',
            openExternalLinksInBrowser: Boolean(draft.openExternalLinksInBrowser),
            showToastNotifications: Boolean(draft.showToastNotifications),
            startScreen: draft.startScreen || 'home',
        })

        toast('App settings saved.', 'success')
    }

    const handleReset = () => {
        resetSettings()
        toast('Settings reset to defaults.', 'info')
    }

    const openLink = (url) => {
        if (!url) return
        if (draft.openExternalLinksInBrowser) {
            window.open(url, '_blank', 'noopener,noreferrer')
            return
        }
        window.location.href = url
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <button className="back-btn" onClick={onBack}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                        <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div>
                    <div className="settings-title">Settings</div>
                    <div className="settings-subtitle">Manage account, mood detection, integrations, and playback preferences.</div>
                </div>
            </div>

            <div className="settings-grid">
                <section className="glass-card settings-card">
                    <h3>Account</h3>
                    <p>Keep your profile and Gmail updated.</p>

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
                    {!gmailValid && <div className="settings-help error">Please enter a valid Gmail address.</div>}

                    <label className="settings-check">
                        <input
                            type="checkbox"
                            checked={googleLinked}
                            onChange={(e) => setGoogleLinked(e.target.checked)}
                        />
                        Google account linked
                    </label>

                    <div className="settings-actions">
                        <button className="btn btn-ghost" onClick={() => openLink('https://accounts.google.com/signup')}>
                            Open Google
                        </button>
                        <button className="btn btn-primary" onClick={saveAccount}>Save Account</button>
                    </div>
                </section>

                <section className="glass-card settings-card">
                    <h3>Mood Detection</h3>
                    <p>Control camera detection behavior and backend API endpoint.</p>

                    <label className="settings-label">Backend URL</label>
                    <input
                        className="modal-input"
                        value={draft.backendUrl ?? DEFAULT_BACKEND}
                        onChange={(e) => setDraft((prev) => ({ ...prev, backendUrl: e.target.value }))}
                        placeholder={DEFAULT_BACKEND}
                    />

                    <label className="settings-label">Auto-detect interval</label>
                    <select
                        className="modal-input"
                        value={String(draft.detectionIntervalMs ?? 150000)}
                        onChange={(e) => setDraft((prev) => ({ ...prev, detectionIntervalMs: Number(e.target.value) }))}
                    >
                        {DETECTION_INTERVAL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <label className="settings-check">
                        <input
                            type="checkbox"
                            checked={draft.aiAutoRunEnabled !== false}
                            onChange={(e) => setDraft((prev) => ({ ...prev, aiAutoRunEnabled: e.target.checked }))}
                        />
                        AI Player: auto turn on camera and detect mood repeatedly
                    </label>

                    <label className="settings-label">AI Player auto interval</label>
                    <select
                        className="modal-input"
                        value={String(draft.aiAutoRunIntervalMs ?? 150000)}
                        onChange={(e) => setDraft((prev) => ({ ...prev, aiAutoRunIntervalMs: Number(e.target.value) }))}
                        disabled={draft.aiAutoRunEnabled === false}
                    >
                        {DETECTION_INTERVAL_OPTIONS.map((opt) => (
                            <option key={`ai-${opt.value}`} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <label className="settings-label">Capture quality</label>
                    <select
                        className="modal-input"
                        value={String(draft.captureQuality ?? 0.8)}
                        onChange={(e) => setDraft((prev) => ({ ...prev, captureQuality: Number(e.target.value) }))}
                    >
                        <option value="0.6">Fast (0.6)</option>
                        <option value="0.8">Balanced (0.8)</option>
                        <option value="0.92">High quality (0.92)</option>
                    </select>

                    <label className="settings-check">
                        <input
                            type="checkbox"
                            checked={Boolean(draft.autoDetectOnCameraStart)}
                            onChange={(e) => setDraft((prev) => ({ ...prev, autoDetectOnCameraStart: e.target.checked }))}
                        />
                        Run one immediate scan when camera starts
                    </label>

                    <label className="settings-check">
                        <input
                            type="checkbox"
                            checked={draft.autoPlayAfterDetection !== false}
                            onChange={(e) => setDraft((prev) => ({ ...prev, autoPlayAfterDetection: e.target.checked }))}
                        />
                        Auto-play song after emotion is detected
                    </label>

                    <label className="settings-check">
                        <input
                            type="checkbox"
                            checked={draft.preferPlaylistForMood !== false}
                            onChange={(e) => setDraft((prev) => ({ ...prev, preferPlaylistForMood: e.target.checked }))}
                        />
                        Prefer songs from my playlists first
                    </label>
                </section>

                <section className="glass-card settings-card">
                    <h3>Integrations</h3>
                    <p>Add your playlist URL and external link behavior.</p>

                    <label className="settings-label">Playlist link</label>
                    <input
                        className="modal-input"
                        value={draft.playlistLink ?? ''}
                        onChange={(e) => setDraft((prev) => ({ ...prev, playlistLink: e.target.value }))}
                        placeholder="https://www.youtube.com/playlist?list=..."
                    />

                    <label className="settings-check">
                        <input
                            type="checkbox"
                            checked={Boolean(draft.openExternalLinksInBrowser)}
                            onChange={(e) => setDraft((prev) => ({ ...prev, openExternalLinksInBrowser: e.target.checked }))}
                        />
                        Open external links in browser
                    </label>

                    <div className="settings-actions">
                        <button
                            className="btn btn-ghost"
                            disabled={!draft.playlistLink?.trim()}
                            onClick={() => openLink(draft.playlistLink)}
                        >
                            Open Playlist Link
                        </button>
                    </div>
                </section>

                <section className="glass-card settings-card">
                    <h3>Playback & App</h3>
                    <p>Customize startup behavior and UI notifications.</p>

                    <label className="settings-label">Startup screen</label>
                    <select
                        className="modal-input"
                        value={draft.startScreen ?? 'home'}
                        onChange={(e) => setDraft((prev) => ({ ...prev, startScreen: e.target.value }))}
                    >
                        <option value="home">Home</option>
                        <option value="ai">AI Music Match</option>
                        <option value="playlist">My Playlists</option>
                    </select>

                    <label className="settings-check">
                        <input
                            type="checkbox"
                            checked={Boolean(draft.showToastNotifications)}
                            onChange={(e) => setDraft((prev) => ({ ...prev, showToastNotifications: e.target.checked }))}
                        />
                        Show toast notifications
                    </label>
                </section>
            </div>

            <div className="settings-footer">
                <button className="btn btn-danger" onClick={handleReset}>Reset to Defaults</button>
                <button className="btn btn-primary" onClick={saveAppSettings}>Save Settings</button>
            </div>
        </div>
    )
}
