import React, { useState, useEffect } from 'react'

const QUESTIONS = [
    {
        id: 'greeting',
        step: 'Step 1 of 3',
        text: (time) => {
            const h = new Date().getHours()
            if (h < 12) return '☀️ Good morning! How did you wake up today?'
            if (h < 17) return '🌤️ Good afternoon! How\'s your day going?'
            return '🌙 Good evening! How was your day?'
        },
        options: [
            { emoji: '😄', label: 'Amazing!', value: 'amazing' },
            { emoji: '😊', label: 'Pretty good', value: 'good' },
            { emoji: '😐', label: 'Okay-ish', value: 'okay' },
            { emoji: '😴', label: 'Tired', value: 'tired' },
            { emoji: '😔', label: 'Not great', value: 'sad' },
        ]
    },
    {
        id: 'vibe',
        step: 'Step 2 of 3',
        text: () => '🎶 What kind of vibe are you in for?',
        options: [
            { emoji: '🔥', label: 'Energetic', value: 'energetic' },
            { emoji: '😌', label: 'Chill', value: 'chill' },
            { emoji: '🎸', label: 'Rock it', value: 'rock' },
            { emoji: '💜', label: 'Romantic', value: 'romantic' },
            { emoji: '🌊', label: 'Focus', value: 'focus' },
            { emoji: '🎉', label: 'Party!', value: 'party' },
        ]
    },
    {
        id: 'mode',
        step: 'Step 3 of 3',
        text: () => '🎧 How do you want to discover music today?',
        options: [
            { emoji: '🤖', label: 'Let AI decide', value: 'ai' },
            { emoji: '📋', label: 'My Playlists', value: 'playlist' },
            { emoji: '🎲', label: 'Surprise me!', value: 'ai' },
        ]
    }
]

export default function Welcome({ onComplete, user, onUserChange }) {
    const [step, setStep] = useState(0)
    const [answers, setAnswers] = useState({})
    const [selected, setSelected] = useState(null)
    const [exiting, setExiting] = useState(false)
    const [showSignup, setShowSignup] = useState(false)
    const [signupName, setSignupName] = useState('')
    const [signupEmail, setSignupEmail] = useState('')

    useEffect(() => {
        const seen = localStorage.getItem('mm_seen_signup')
        if (!seen && !user?.googleLinked) {
            setShowSignup(true)
        }
    }, [user?.googleLinked])

    const q = QUESTIONS[step]

    const choose = (value) => {
        setSelected(value)
        const newAnswers = { ...answers, [q.id]: value }
        setAnswers(newAnswers)

        setTimeout(() => {
            if (step < QUESTIONS.length - 1) {
                setStep(s => s + 1)
                setSelected(null)
            } else {
                // Last question answered — proceed
                setExiting(true)
                setTimeout(() => onComplete(newAnswers), 400)
            }
        }, 350)
    }

    const openGoogleSignup = () => {
        window.open('https://accounts.google.com/signup', '_blank', 'noopener,noreferrer')
    }

    const skipGoogleSignup = () => {
        localStorage.setItem('mm_seen_signup', '1')
        setShowSignup(false)
    }

    const completeGoogleSignup = () => {
        const email = signupEmail.trim()
        if (!email) return

        const profile = {
            name: signupName.trim(),
            email,
            googleLinked: true,
            premium: Boolean(user?.premium),
        }

        onUserChange?.(profile)
        localStorage.setItem('mm_seen_signup', '1')
        setShowSignup(false)
    }

    return (
        <div className="welcome-screen" style={{ opacity: exiting ? 0 : 1, transition: 'opacity 0.4s ease' }}>
            {/* Logo */}
            <div className="welcome-logo">
                <div className="welcome-logo-icon">🎵</div>
                <h1>Mood Music</h1>
                <p>AI-powered music discovery</p>
            </div>

            {showSignup && (
                <div className="welcome-signup-card glass-card">
                    <div className="welcome-signup-head">
                        <h3>Start with Google</h3>
                        <span className="welcome-signup-badge">First-time setup</span>
                    </div>
                    <p>Create a Google account (or use existing) to save your profile across sessions.</p>
                    <div className="welcome-signup-actions">
                        <button className="btn btn-primary" onClick={openGoogleSignup}>
                            Continue with Google
                        </button>
                        <button className="btn btn-ghost" onClick={skipGoogleSignup}>
                            Skip for now
                        </button>
                    </div>
                    <div className="welcome-signup-fields">
                        <input
                            className="modal-input"
                            placeholder="Your name (optional)"
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                        />
                        <input
                            className="modal-input"
                            placeholder="Google email"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-ghost" onClick={completeGoogleSignup} disabled={!signupEmail.trim()}>
                        I completed sign up
                    </button>
                </div>
            )}

            {/* Question Card */}
            <div className="question-card glass-card" style={{ padding: '32px 36px' }} key={step}>
                <div className="question-step">{q.step}</div>
                <div className="question-text">{q.text()}</div>
                <div className="question-options">
                    {q.options.map(opt => (
                        <button
                            key={opt.value + opt.label}
                            className={`question-option ${selected === opt.value && answers[q.id] === undefined ? 'selected' : selected === opt.value ? 'selected' : ''}`}
                            onClick={() => choose(opt.value)}
                        >
                            <span className="question-option-emoji">{opt.emoji}</span>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Progress dots */}
            <div className="progress-dots">
                {QUESTIONS.map((_, i) => (
                    <div key={i} className={`progress-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
                ))}
            </div>
        </div>
    )
}
