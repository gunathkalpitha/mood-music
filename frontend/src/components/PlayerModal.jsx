import React from 'react'
import { usePlayer } from '../contexts/PlayerContext.jsx'

export default function PlayerModal() {
    const { currentTrack, showModal, closeModal } = usePlayer()

    if (!showModal || !currentTrack) return null

    const embedUrl = `https://www.youtube.com/embed/${currentTrack.videoId}?autoplay=1&rel=0`

    return (
        <div className="player-modal-overlay" onClick={closeModal}>
            <div className="player-modal" onClick={e => e.stopPropagation()}>
                <div className="player-modal-header">
                    <div>
                        <div className="player-modal-title">{currentTrack.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{currentTrack.channel}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <a href={currentTrack.youtube_url} target="_blank" rel="noopener noreferrer"
                            className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}>
                            Open in YouTube ↗
                        </a>
                        <button className="btn-icon" onClick={closeModal} title="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="player-iframe-wrap">
                    <iframe
                        src={embedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={currentTrack.title}
                    />
                </div>
            </div>
        </div>
    )
}
