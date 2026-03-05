import React, { useState } from 'react'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { LibraryProvider } from './contexts/LibraryContext.jsx'
import TitleBar from './components/TitleBar.jsx'
import Welcome from './pages/Welcome.jsx'
import Home from './pages/Home.jsx'
import AIPlayer from './pages/AIPlayer.jsx'
import PlaylistPlayer from './pages/PlaylistPlayer.jsx'
import './index.css'
import './v2.css'

// App flow: welcome → home → [ai | playlist]
export default function App() {
    const [screen, setScreen] = useState('welcome')   // welcome | home | ai | playlist
    const [answers, setAnswers] = useState({})
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

    const handleWelcomeDone = (ans) => {
        setAnswers(ans)
        // If last question directly chose a path
        if (ans.mode === 'ai') {
            setScreen('ai')
        } else if (ans.mode === 'playlist') {
            setScreen('playlist')
        } else {
            setScreen('home')
        }
    }

    const handleChoose = (path) => setScreen(path)
    const goHome = () => setScreen('home')

    return (
        <ToastProvider>
            <LibraryProvider>
                <div className="app-layout">
                    <TitleBar />
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                        {screen === 'welcome' && (
                            <Welcome onComplete={handleWelcomeDone} user={user} onUserChange={updateUser} />
                        )}
                        {screen === 'home' && (
                            <Home answers={answers} onChoose={handleChoose} user={user} />
                        )}
                        {screen === 'ai' && (
                            <AIPlayer onBack={goHome} />
                        )}
                        {screen === 'playlist' && (
                            <PlaylistPlayer onBack={goHome} user={user} onUserChange={updateUser} />
                        )}
                    </div>
                </div>
            </LibraryProvider>
        </ToastProvider>
    )
}
