import React from 'react'
import { useLibrary } from '../contexts/LibraryContext.jsx'
import TrackCard from '../components/TrackCard.jsx'

export default function Favorites() {
    const { favorites, toggleFav } = useLibrary()

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">❤️ Favorites</h1>
                <p className="page-subtitle">
                    {favorites.length > 0
                        ? `${favorites.length} saved track${favorites.length !== 1 ? 's' : ''}`
                        : 'Your loved songs appear here'}
                </p>
            </div>

            {favorites.length === 0 ? (
                <div className="empty-state glass-card" style={{ padding: 60 }}>
                    <div className="empty-state-icon">💔</div>
                    <h3>No favorites yet</h3>
                    <p>Click the heart icon on any track in Search or Mood Detect to save it here</p>
                </div>
            ) : (
                <div className="track-grid">
                    {favorites.map(track => (
                        <TrackCard key={track.videoId} track={track} showAddToPlaylist />
                    ))}
                </div>
            )}
        </div>
    )
}
