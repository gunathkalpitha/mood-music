import React from 'react'
import { usePlayer } from '../contexts/PlayerContext.jsx'
import { useLibrary } from '../contexts/LibraryContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function TrackCard({ track, showAddToPlaylist }) {
    const { play, currentTrack } = usePlayer()
    const { isFav, toggleFav, playlists, addToPlaylist } = useLibrary()
    const toast = useToast()
    const [showMenu, setShowMenu] = React.useState(false)

    const isPlaying = currentTrack?.videoId === track.videoId
    const fav = isFav(track.videoId)

    const handleFav = (e) => {
        e.stopPropagation()
        toggleFav(track)
        toast(fav ? 'Removed from favorites' : 'Added to favorites ❤️', fav ? 'info' : 'success')
    }

    const handleAdd = (e, playlistId) => {
        e.stopPropagation()
        addToPlaylist(playlistId, track)
        toast('Added to playlist 🎵', 'success')
        setShowMenu(false)
    }

    return (
        <div className={`track-card ${isPlaying ? 'playing' : ''}`} onClick={() => play(track)}>
            {track.thumbnail
                ? <img className="track-thumb" src={track.thumbnail} alt={track.title} loading="lazy" />
                : <div className="track-thumb-placeholder">🎵</div>
            }
            <div className="track-info">
                <div className="track-title">{track.title}</div>
                <div className="track-channel">{track.channel}</div>
            </div>
            <div className="track-actions" onClick={e => e.stopPropagation()}>
                {isPlaying && (
                    <span style={{ fontSize: 18, animation: 'pulse-ring 1.5s infinite' }}>▶️</span>
                )}
                <button className={`btn-icon ${fav ? 'active' : ''}`} onClick={handleFav} title={fav ? 'Remove from favorites' : 'Add to favorites'}>
                    <svg viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>
                {showAddToPlaylist && playlists.length > 0 && (
                    <div style={{ position: 'relative' }}>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setShowMenu(m => !m) }} title="Add to playlist">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round" />
                                <circle cx="19" cy="19" r="3" />
                                <path d="M19 17v4M17 19h4" strokeLinecap="round" />
                            </svg>
                        </button>
                        {showMenu && (
                            <div style={{
                                position: 'absolute', right: 0, top: '110%', zIndex: 100,
                                background: 'var(--bg-mid)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                minWidth: 180, overflow: 'hidden'
                            }}>
                                {playlists.map(p => (
                                    <button key={p.id} onClick={(e) => handleAdd(e, p.id)} style={{
                                        display: 'block', width: '100%', padding: '10px 16px',
                                        background: 'none', border: 'none', color: 'var(--text-primary)',
                                        fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
                                        textAlign: 'left', transition: 'background 0.15s'
                                    }}
                                        onMouseOver={e => e.target.style.background = 'var(--bg-glass-hover)'}
                                        onMouseOut={e => e.target.style.background = 'none'}
                                    >
                                        🎵 {p.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); play(track) }} title="Play">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
