import React from 'react'
import { usePlayer } from '../contexts/PlayerContext.jsx'

export default function PlayerBar() {
    const { currentTrack, openModal } = usePlayer()

    if (!currentTrack) {
        return (
            <div className="player-bar" style={{ justifyContent: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    🎵 No track playing — select a song to begin
                </span>
            </div>
        )
    }

    return (
        <div className="player-bar">
            <div className="player-track-info">
                {currentTrack.thumbnail
                    ? <img className="player-thumb" src={currentTrack.thumbnail} alt={currentTrack.title} />
                    : <div className="player-thumb-placeholder">🎵</div>
                }
                <div>
                    <div className="player-title">{currentTrack.title}</div>
                    <div className="player-channel">{currentTrack.channel}</div>
                </div>
            </div>

            <div className="player-center">
                <div className="player-controls">
                    <button className="player-play-btn" onClick={openModal} title="Open player">
                        <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click to open player</span>
            </div>

            <div className="player-right">
                <button className="btn-ghost btn" style={{ fontSize: 12, padding: '6px 14px' }} onClick={openModal}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 9l6 3-6 3V9z" fill="currentColor" stroke="none" />
                    </svg>
                    Open Player
                </button>
                <a href={currentTrack.youtube_url} target="_blank" rel="noopener noreferrer"
                    className="btn-icon" title="Open in YouTube" style={{ color: 'var(--text-secondary)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
                        <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" />
                    </svg>
                </a>
            </div>
        </div>
    )
}
