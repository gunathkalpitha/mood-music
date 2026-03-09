import React, { useState } from 'react'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { LibraryProvider } from './contexts/LibraryContext.jsx'
import { useSettings } from './contexts/SettingsContext.jsx'
import TitleBar from './components/TitleBar.jsx'
import FirstTimeSetup from './pages/FirstTimeSetup.jsx'
import Home from './pages/Home.jsx'
import AIPlayer from './pages/AIPlayer.jsx'
import PlaylistPlayer from './pages/PlaylistPlayer.jsx'
import Settings from './pages/Settings.jsx'
import './index.css'
import './v2.css'

const ONBOARDING_KEY = 'mm_onboarding_complete'

function hasCompletedOnboarding() {
    try {
        return localStorage.getItem(ONBOARDING_KEY) === '1'
    } catch {
        return false
    }
}

// App flow: first-time setup -> ai, returning users -> home/startScreen -> [ai | playlist | settings]
export default function App() {
    const { settings, updateSettings } = useSettings()

    const resolveStartScreen = (value) => {
        if (value === 'ai' || value === 'playlist' || value === 'home') return value
        return 'home'
    }

    const [screen, setScreen] = useState(() => (hasCompletedOnboarding() ? resolveStartScreen(settings?.startScreen) : 'setup')) // setup | home | ai | playlist | settings
    const [answers, setAnswers] = useState({})
    const [aiAutoStartToken, setAiAutoStartToken] = useState(0)
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem('mm_user_profile')
            if (raw) {
                const parsed = JSON.parse(raw)
                return {
                    name: parsed?.name ?? '',
                    email: parsed?.email ?? '',
                    googleLinked: Boolean(parsed?.googleLinked),
                    premium: Boolean(parsed?.premium),
                }
            }
        } catch {
        }

        return {
            name: '',
            email: '',
            googleLinked: false,
            premium: false,
        }
    })

    const updateUser = (updater) => {
        setUser(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater
            localStorage.setItem('mm_user_profile', JSON.stringify(next))
            return next
        })
    }

    const handleSetupComplete = ({ userProfile, appSettings }) => {
        if (userProfile) {
            updateUser((prev) => ({ ...prev, ...userProfile }))
        }

        if (appSettings) {
            updateSettings(appSettings)
        }

        localStorage.setItem(ONBOARDING_KEY, '1')
        setAnswers({ mode: 'ai', onboarding: 'completed' })
        setAiAutoStartToken((v) => v + 1)
        setScreen('ai')
    }

    const handleChoose = (path) => setScreen(path)
    const goHome = () => setScreen('home')

    return (
        <ToastProvider>
            <LibraryProvider>
                <div className="app-layout">
                    <TitleBar />
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                        {screen === 'setup' && (
                            <FirstTimeSetup onComplete={handleSetupComplete} user={user} settings={settings} />
                        )}
                        {screen === 'home' && (
                            <Home answers={answers} onChoose={handleChoose} user={user} />
                        )}
                        {screen === 'ai' && (
                            <AIPlayer onBack={goHome} autoStartToken={aiAutoStartToken} />
                        )}
                        {screen === 'playlist' && (
                            <PlaylistPlayer onBack={goHome} user={user} onUserChange={updateUser} />
                        )}
                        {screen === 'settings' && (
                            <Settings onBack={goHome} user={user} onUserChange={updateUser} />
                        )}
                    </div>
                </div>
            </LibraryProvider>
        </ToastProvider>
    )
}
