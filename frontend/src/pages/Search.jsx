import React, { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import VideoCard from '../components/VideoCard.jsx'

const YOUTUBE_API_KEY = 'AIzaSyCzRyvCNt7H7kmrOeo1uCn3CKqbyylv-y0'

const MOOD_CHIPS = [
    { label: '😊 Happy', query: 'happy upbeat music' },
    { label: '😢 Sad', query: 'sad emotional music' },
    { label: '⚡ Energy', query: 'energetic workout music' },
    { label: '😴 Chill', query: 'lofi chill music' },
    { label: '🎸 Rock', query: 'rock music hits' },
    { label: '🎵 Pop', query: 'pop hits 2024' },
    { label: '🎷 Jazz', query: 'smooth jazz' },
    { label: '🇱🇰 Sinhala', query: 'Sinhala songs popular' },
]

export default function Search() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searched, setSearched] = useState(false)
    const inputRef = useRef(null)

    const search = useCallback(async (q) => {
        const term = (q ?? query).trim()
        if (!term) return
        setLoading(true)
        setError('')
        setSearched(true)
        try {
            const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: term,
                    type: 'video',
                    videoCategoryId: '10',
                    maxResults: 20,
                    key: YOUTUBE_API_KEY
                }
            })
            const items = res.data.items ?? []
            setResults(items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                description: item.snippet.description ?? '',
                thumbnail: item.snippet.thumbnails?.medium?.url ?? '',
                youtube_url: `https://www.youtube.com/watch?v=${item.id.videoId}`
            })))
        } catch (e) {
            setError('YouTube search failed. Check your API key or try again.')
            setResults([])
        } finally {
            setLoading(false)
        }
    }, [query])

    const handleChip = (chipQuery) => {
        setQuery(chipQuery)
        search(chipQuery)
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">🔍 Search YouTube</h1>
                <p className="page-subtitle">Find any song, artist, or album directly from YouTube</p>
            </div>

            {/* Search Bar */}
            <div className="search-bar" style={{ marginBottom: 16 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search songs, artists, albums…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    autoFocus
                />
                {loading
                    ? <span className="spin" style={{ color: 'var(--accent)', fontSize: 18 }}>⟳</span>
                    : <button className="btn-icon" onClick={() => search()} title="Search">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </button>
                }
            </div>

            {/* Mood Chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                {MOOD_CHIPS.map(chip => (
                    <button key={chip.label} className="chip" onClick={() => handleChip(chip.query)}>
                        {chip.label}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '12px 16px', background: 'rgba(244,63,94,0.12)',
                    border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-md)',
                    color: 'var(--danger)', fontSize: 13, marginBottom: 20
                }}>⚠️ {error}</div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        {results.length} results for <strong style={{ color: 'var(--text-secondary)' }}>"{query}"</strong>
                    </div>
                    <div className="video-grid">
                        {results.map(track => <VideoCard key={track.videoId} track={track} />)}
                    </div>
                </>
            )}

            {searched && !loading && results.length === 0 && !error && (
                <div className="empty-state">
                    <div className="empty-state-icon">🔎</div>
                    <h3>No results found</h3>
                    <p>Try a different search term or use the mood chips above</p>
                </div>
            )}

            {!searched && (
                <div className="empty-state">
                    <div className="empty-state-icon">🎵</div>
                    <h3>Search for music</h3>
                    <p>Type an artist, song title, or select a mood chip to discover music on YouTube</p>
                </div>
            )}
        </div>
    )
}
