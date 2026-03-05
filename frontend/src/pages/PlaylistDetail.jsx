import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLibrary } from '../contexts/LibraryContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import TrackCard from '../components/TrackCard.jsx'

export default function PlaylistDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { playlists, removeFromPlaylist } = useLibrary()
    const toast = useToast()

    const playlist = playlists.find(p => p.id === id)

    if (!playlist) {
        return (
            <div className="empty-state" style={{ marginTop: 60 }}>
                <div className="empty-state-icon">❓</div>
                <h3>Playlist not found</h3>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/playlists')}>
                    Back to Playlists
                </button>
            </div>
        )
    }

    const handleRemove = (videoId, title) => {
        removeFromPlaylist(id, videoId)
        toast(`Removed "${title}" from playlist`, 'info')
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <button className="btn-icon" onClick={() => navigate('/playlists')} title="Back" style={{ marginTop: 4 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                        <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div>
                    <h1 className="page-title">🎵 {playlist.name}</h1>
                    <p className="page-subtitle">
                        {playlist.tracks.length} track{playlist.tracks.length !== 1 ? 's' : ''} · Created {new Date(playlist.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {playlist.tracks.length === 0 ? (
                <div className="empty-state glass-card" style={{ padding: 60 }}>
                    <div className="empty-state-icon">🎵</div>
                    <h3>Empty playlist</h3>
                    <p>Go to Search or Mood Detect and click the playlist icon on any track to add songs here</p>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/search')}>
                        Browse Music
                    </button>
                </div>
            ) : (
                <div className="track-grid">
                    {playlist.tracks.map(track => (
                        <div key={track.videoId} style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <TrackCard track={track} showAddToPlaylist />
                            </div>
                            <button
                                className="btn-icon"
                                title="Remove from playlist"
                                onClick={() => handleRemove(track.videoId, track.title)}
                                style={{ flexShrink: 0, color: 'var(--danger)' }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
