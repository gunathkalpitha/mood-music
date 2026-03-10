import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useLibrary } from '../contexts/LibraryContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function MusicPlayer({
    tracks,
    title,
    subtitle,
    accentColor,
    onAddToPlaylist,
    autoPlay = false,
    autoPlayToken = 0,
    initialIndex = 0,
}) {
    const [currentIdx, setCurrentIdx] = useState(0)
    const [showIframe, setShowIframe] = useState(false)
    const { isFav, toggleFav, playlists, addToPlaylist } = useLibrary()
    const toast = useToast()
    const [showPlMenu, setShowPlMenu] = useState(false)

    useEffect(() => {
        if (!tracks || tracks.length === 0) return
        const safeIndex = Math.max(0, Math.min(initialIndex, tracks.length - 1))
        setCurrentIdx(safeIndex)
        // Always trigger auto-play when autoPlayToken changes and autoPlay is true
        if (autoPlay && autoPlayToken > 0) {
            setShowIframe(true)
        } else {
            setShowIframe(Boolean(autoPlay))
        }
    }, [autoPlay, autoPlayToken, initialIndex, tracks])

    useEffect(() => {
        if (!tracks || tracks.length === 0) return
        if (currentIdx > tracks.length - 1) {
            setCurrentIdx(Math.max(0, tracks.length - 1))
        }
    }, [currentIdx, tracks])

    const track = tracks?.[currentIdx]

    const goTo = (i) => {
        setCurrentIdx(i)
        setShowIframe(true)
        setShowPlMenu(false)
    }

    const prev = () => goTo(Math.max(0, currentIdx - 1))
    const next = () => goTo(Math.min(tracks.length - 1, currentIdx + 1))

    const handleFav = useCallback(() => {
        if (!track) return
        toggleFav(track)
        toast(isFav(track.videoId) ? 'Removed from favorites' : 'Added to favorites ❤️',
            isFav(track.videoId) ? 'info' : 'success')
    }, [track, toggleFav, isFav, toast])

    const handleAddToPlaylist = (plId) => {
        if (!track) return
        addToPlaylist(plId, track)
        toast('Added to playlist 🎵', 'success')
        setShowPlMenu(false)
    }

    if (!tracks || tracks.length === 0) {
        return (
            <div className="empty-state" style={{ flex: 1 }}>
                <div className="empty-state-icon">🎵</div>
                <h3>No tracks available</h3>
                <p>Try again or search for music manually</p>
            </div>
        )
    }

    const embedUrl = useMemo(() => {
        if (!track?.videoId) return ''

        const base = `https://www.youtube.com/embed/${track.videoId}`
        const params = new URLSearchParams({
            autoplay: '1',
            rel: '0',
        })

        // Ask YouTube to continue with the rest of the current queue.
        const seen = new Set([track.videoId])
        const remainingIds = []
        for (let i = currentIdx + 1; i < tracks.length; i += 1) {
            const id = tracks[i]?.videoId
            if (!id || seen.has(id)) continue
            seen.add(id)
            remainingIds.push(id)
        }

        if (remainingIds.length > 0) {
            params.set('playlist', remainingIds.join(','))
        }

        return `${base}?${params.toString()}`
    }, [currentIdx, track, tracks])

    return (
        <div className="music-player-page">
            {/* Left: Now Playing */}
            <div className="now-playing-panel">
                {/* Art */}
                <div className="now-playing-art" style={{ boxShadow: `0 12px 48px rgba(0,0,0,0.5), 0 0 40px ${accentColor ?? 'var(--accent-glow)'}55` }}>
                    {track?.thumbnail
                        ? <img src={track.thumbnail} alt={track.title} />
                        : <div className="now-playing-art-placeholder">🎵</div>
                    }
                    {showIframe && (
                        <div className="playing-indicator">
                            <div className="bar" /><div className="bar" /><div className="bar" /><div className="bar" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="now-playing-info">
                    <div className="now-playing-title">{track?.title ?? 'No track'}</div>
                    <div className="now-playing-channel">{track?.channel}</div>
                </div>

                {/* Controls */}
                <div className="now-playing-controls">
                    <button className="ctrl-btn" onClick={prev} disabled={currentIdx === 0}
                        style={{ opacity: currentIdx === 0 ? 0.3 : 1 }}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                        </svg>
                    </button>
                    <button className="play-pause-btn" onClick={() => setShowIframe(v => !v)}>
                        {showIframe
                            ? <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                            : <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M8 5v14l11-7z" /></svg>
                        }
                    </button>
                    <button className="ctrl-btn" onClick={next} disabled={currentIdx === tracks.length - 1}
                        style={{ opacity: currentIdx === tracks.length - 1 ? 0.3 : 1 }}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                        </svg>
                    </button>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                    {/* Favorite */}
                    <button className={`btn btn-ghost ${isFav(track?.videoId) ? '' : ''}`}
                        style={{
                            flex: 1, fontSize: 13, padding: '9px', gap: 6,
                            color: isFav(track?.videoId) ? 'var(--danger)' : undefined
                        }}
                        onClick={handleFav}>
                        <svg viewBox="0 0 24 24" fill={isFav(track?.videoId) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {isFav(track?.videoId) ? 'Favorited' : 'Favorite'}
                    </button>

                    {/* Add to playlist */}
                    {playlists.length > 0 && (
                        <div style={{ position: 'relative' }}>
                            <button className="btn btn-ghost" style={{ fontSize: 13, padding: '9px 12px' }}
                                onClick={() => setShowPlMenu(m => !m)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round" />
                                    <path d="M19 16v6M16 19h6" strokeLinecap="round" />
                                </svg>
                            </button>
                            {showPlMenu && (
                                <div style={{
                                    position: 'absolute', bottom: '110%', right: 0,
                                    background: 'var(--bg-mid)', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                    minWidth: 180, overflow: 'hidden', zIndex: 50
                                }}>
                                    {playlists.map(p => (
                                        <button key={p.id} onClick={() => handleAddToPlaylist(p.id)}
                                            style={{
                                                display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                                                color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', textAlign: 'left'
                                            }}
                                            onMouseOver={e => e.target.style.background = 'var(--bg-glass-hover)'}
                                            onMouseOut={e => e.target.style.background = 'none'}>
                                            🎵 {p.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Open in YouTube */}
                <a href={track?.youtube_url} target="_blank" rel="noopener noreferrer"
                    className="open-youtube-btn" style={{ textDecoration: 'none' }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.5 12 3.5 12 3.5s-7.55 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.03 0 12 0 12s0 3.97.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.45 20.5 12 20.5 12 20.5s7.55 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.97 24 12 24 12s0-3.97-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z" />
                    </svg>
                    Open in YouTube
                </a>
            </div>

            {/* Right: Queue + Embed */}
            <div className="queue-panel">
                <div className="queue-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="queue-title">{title}</div>
                            <div className="queue-subtitle">{subtitle} · {tracks.length} tracks</div>
                        </div>
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}
                            onClick={() => { setShowIframe(true); }}>
                            ▶ Play All
                        </button>
                    </div>
                </div>

                {/* Embedded Player */}
                {showIframe && track && (
                    <div style={{
                        margin: '12px 16px 0',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        aspectRatio: '16/9',
                        flexShrink: 0
                    }}>
                        <iframe
                            key={track.videoId}
                            src={embedUrl}
                            width="100%" height="100%"
                            style={{ border: 'none', display: 'block' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={track.title}
                        />
                    </div>
                )}

                {/* Track list */}
                <div className="queue-list">
                    {tracks.map((t, i) => (
                        <div key={t.videoId ?? i}
                            className={`queue-item ${i === currentIdx ? 'active' : ''}`}
                            onClick={() => goTo(i)}>
                            <div className="queue-num">
                                {i === currentIdx && showIframe
                                    ? <span style={{ color: 'var(--accent-bright)', fontSize: 14 }}>▶</span>
                                    : i + 1
                                }
                            </div>
                            {t.thumbnail
                                ? <img className="queue-thumb" src={t.thumbnail} alt={t.title} loading="lazy" />
                                : <div className="queue-thumb-placeholder">🎵</div>
                            }
                            <div className="queue-info">
                                <div className="queue-track-title">{t.title}</div>
                                <div className="queue-track-channel">{t.channel}</div>
                            </div>
                            <div className="queue-item-actions">
                                <button className={`btn-icon ${isFav(t.videoId) ? 'active' : ''}`}
                                    title="Favorite"
                                    onClick={(e) => { e.stopPropagation(); toggleFav(t); toast(isFav(t.videoId) ? 'Removed' : 'Added to favorites ❤️', 'success') }}>
                                    <svg viewBox="0 0 24 24" fill={isFav(t.videoId) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="14" height="14">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                </button>
                                <a href={t.youtube_url} target="_blank" rel="noopener noreferrer"
                                    className="btn-icon" title="Open YouTube" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                                    onClick={e => e.stopPropagation()}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
                                        <polyline points="15 3 21 3 21 9" strokeLinecap="round" />
                                        <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
