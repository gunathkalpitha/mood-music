import React from 'react'

const PLAYLIST_EMOJIS = ['🎵', '🎸', '🎷', '🥁', '🎹', '🎺', '🎻', '🎤', '🔥', '💜']

export default function Home({ answers, onChoose, user }) {
    const h = new Date().getHours()
    const timeWord = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'

    const vibeMap = {
        amazing: 'you\'re glowing today ✨',
        good: 'great day so far 🌟',
        okay: 'let\'s make it better 🎶',
        tired: 'some music will help 🛌',
        sad: 'music always heals 💜',
        energetic: 'let\'s keep that energy high ⚡',
        chill: 'time to relax 🌊',
        rock: 'let\'s rock out 🎸',
        romantic: 'setting the mood 💕',
        focus: 'focus mode on 🎯',
        party: 'party time! 🎉',
    }

    const vibe = answers?.vibe ?? answers?.greeting ?? 'good'
    const subtitle = vibeMap[vibe] ?? 'let\'s find the perfect music'

    return (
        <div className="home-screen">
            <div className="home-greeting">
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎧</div>
                <h2>Good {timeWord}! Let's vibe</h2>
                <p>{subtitle}</p>
                {(user?.name || user?.email) && (
                    <div className="home-user-pill">
                        👋 {user.name || user.email}
                        {user.premium ? <span className="home-user-premium">Premium</span> : <span className="home-user-free">Free</span>}
                    </div>
                )}
            </div>

            <div className="choice-cards">
                {/* AI Music Match */}
                <div className="choice-card ai" onClick={() => onChoose('ai')}>
                    <span className="choice-icon">🤖</span>
                    <div className="choice-title">AI Music Match</div>
                    <div className="choice-desc">
                        Your camera reads your mood and instantly picks songs that match how you feel right now
                    </div>
                    <div className="choice-badge ai-badge">
                        ✨ Smart Pick
                    </div>
                </div>

                {/* My Playlists */}
                <div className="choice-card playlist" onClick={() => onChoose('playlist')}>
                    <span className="choice-icon" style={{ filter: 'drop-shadow(0 0 20px rgba(6,182,212,0.5))' }}>🎶</span>
                    <div className="choice-title">My Playlists</div>
                    <div className="choice-desc">
                        Browse your saved playlists, search YouTube, and play exactly what you're in the mood for
                    </div>
                    <div className="choice-badge pl-badge">
                        📋 Your Library
                    </div>
                </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                You can switch between modes anytime
            </div>
        </div>
    )
}
