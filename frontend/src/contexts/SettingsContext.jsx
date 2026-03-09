import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const SettingsContext = createContext(null)

const SETTINGS_KEY = 'mm_app_settings'

export const DETECTION_INTERVAL_OPTIONS = [
    { label: '30 seconds', value: 30000 },
    { label: '1 minute', value: 60000 },
    { label: '2 minutes 30 seconds', value: 150000 },
]

const DEFAULT_SETTINGS = {
    backendUrl: 'http://localhost:8000',
    detectionIntervalMs: 150000,
    aiAutoRunEnabled: true,
    aiAutoRunIntervalMs: 150000,
    autoPlayAfterDetection: true,
    preferPlaylistForMood: true,
    autoDetectOnCameraStart: true,
    captureQuality: 0.8,
    playlistLink: '',
    openExternalLinksInBrowser: true,
    showToastNotifications: true,
    startScreen: 'home',
}

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY)
        if (!raw) return DEFAULT_SETTINGS
        const parsed = JSON.parse(raw)
        return { ...DEFAULT_SETTINGS, ...parsed }
    } catch {
        return DEFAULT_SETTINGS
    }
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(loadSettings)

    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    }, [settings])

    const value = useMemo(() => ({
        settings,
        updateSettings: (patch) => {
            setSettings((prev) => ({ ...prev, ...patch }))
        },
        resetSettings: () => {
            setSettings(DEFAULT_SETTINGS)
        },
    }), [settings])

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (!context) {
        return {
            settings: DEFAULT_SETTINGS,
            updateSettings: () => {},
            resetSettings: () => {},
        }
    }
    return context
}
