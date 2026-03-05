import React from 'react'
import { usePlayer } from '../contexts/PlayerContext.jsx'
import { useLibrary } from '../contexts/LibraryContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function VideoCard({ track }) {
    const { play, currentTrack } = usePlayer()
    const { isFav, toggleFav, playlists, addToPlaylist } = useLibrary()
    const toast = useToast()
    const [showMenu, setShowMenu] = React.useState(false)

    const isPlaying = currentTrack?.videoId === track.videoId
    const fav = isFav(track.videoId)

    return (
        <div className={`video-card ${isPlaying ? 'playing' : ''}`} onClick={() => play(track)}>
            <div className="video-thumb-wrap">
                {track.thumbnail
                    ? <img src={track.thumbnail} alt={track.title} loading="lazy" />
                    : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'grid', placeItems: 'center', fontSize: 40 }}>🎵</div>
                }
                <div className="video-play-overlay">
                    <div className="video-play-btn">
                        <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
                {isPlaying && (
                    <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'var(--accent)', color: 'white',
                        padding: '3px 8px', borderRadius: 99,
                        fontSize: 11, fontWeight: 700
                    }}>▶ PLAYING</div>
                )}
            </div>
            <div className="video-card-body">
                <div className="video-card-title">{track.title}</div>
                <div className="video-card-channel">{track.channel}</div>
                <div className="video-card-actions" onClick={e => e.stopPropagation()}>
                    <button className={`btn-icon ${fav ? 'active' : ''}`}
                        onClick={() => { toggleFav(track); toast(fav ? 'Removed from favorites' : 'Added to favorites ❤️', fav ? 'info' : 'success') }}
                        title="Favorite">
                        <svg viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </button>
                    {playlists.length > 0 && (
                        <div style={{ position: 'relative' }}>
                            <button className="btn-icon" onClick={() => setShowMenu(m => !m)} title="Add to playlist">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round" />
                                    <circle cx="19" cy="19" r="3" />
                                    <path d="M19 17v4M17 19h4" strokeLinecap="round" />
                                </svg>
                            </button>
                            {showMenu && (
                                <div style={{
                                    position: 'absolute', bottom: '110%', right: 0, zIndex: 100,
                                    background: 'var(--bg-mid)', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                    minWidth: 180, overflow: 'hidden'
                                }}>
                                    {playlists.map(p => (
                                        <button key={p.id} onClick={() => { addToPlaylist(p.id, track); toast('Added to playlist 🎵', 'success'); setShowMenu(false) }}
                                            style={{
                                                display: 'block', width: '100%', padding: '10px 16px',
                                                background: 'none', border: 'none', color: 'var(--text-primary)',
                                                fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', textAlign: 'left'
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
                    <a href={track.youtube_url} target="_blank" rel="noopener noreferrer"
                        className="btn-icon" title="Open in browser" style={{ color: 'var(--text-secondary)' }}
                        onClick={e => e.stopPropagation()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
                            <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    )
}
