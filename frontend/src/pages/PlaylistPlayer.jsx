import React, { useState, useCallback, useEffect, useMemo } from 'react'
import axios from 'axios'
import MusicPlayer from '../components/MusicPlayer.jsx'
import { useLibrary } from '../contexts/LibraryContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useSettings } from '../contexts/SettingsContext.jsx'
import { annotateTrackWithEmotion, annotateTracksWithEmotion } from '../utils/trackEmotionClassifier.js'
import { analyzeTrackMood, analyzeTracksMoodBatch } from '../utils/songMoodApi.js'

const PLAYLIST_EMOJIS = ['🎵', '🎸', '🎷', '🥁', '🎹', '🎺', '🎻', '🎤', '🔥', '💜', '⚡', '🌙', '☀️', '🌊']
const HOME_QUERIES = [
    'top music hits',
    'new music videos',
    'lofi beats',
    'trending pop songs',
]

const EMOTION_LABELS = {
    happy: { icon: '😄', text: 'happy' },
    chill: { icon: '😌', text: 'chill' },
    neutral: { icon: '😐', text: 'neutral' },
    sad: { icon: '😢', text: 'sad' },
    angry: { icon: '😠', text: 'angry' },
    fear: { icon: '😨', text: 'fear' },
    surprise: { icon: '😲', text: 'surprise' },
}

const EMOTION_ORDER = ['happy', 'chill', 'neutral', 'sad', 'angry', 'fear', 'surprise']

function getYoutubeErrorMessage(error) {
    const apiError = error?.response?.data?.error || error
    const reason = apiError?.reason || ''

    if (reason === 'quotaExceeded') {
        return 'YouTube daily quota exceeded on backend API key. Try again later or update YOUTUBE_API_KEY in backend.'
    }

    if (reason === 'keyInvalid') {
        return 'YouTube API key is invalid on backend. Update YOUTUBE_API_KEY.'
    }

    if (reason === 'accessNotConfigured') {
        return 'YouTube Data API v3 is not enabled for backend key.'
    }

    if (reason === 'missing_api_key') {
        return 'Backend YOUTUBE_API_KEY is missing. Add it to backend environment.'
    }

    if (apiError?.message) {
        return `YouTube search failed: ${apiError.message}`
    }

    return 'YouTube search failed due to network/API error.'
}

export default function PlaylistPlayer({ onBack, user, onUserChange }) {
    const { playlists, createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist, replacePlaylistTracks } = useLibrary()
    const { settings } = useSettings()
    const toast = useToast()

    const [selectedPl, setSelectedPl] = useState(playlists[0]?.id ?? null)
    const [playQueue, setPlayQueue] = useState(null) // When null → browse mode; when set → playing mode
    const [searchQ, setSearchQ] = useState('')
    const [searchRes, setSearchRes] = useState([])
    const [searching, setSearching] = useState(false)
    const [homeFeed, setHomeFeed] = useState([])
    const [loadingHome, setLoadingHome] = useState(false)
    const [newPlName, setNewPlName] = useState('')
    const [showNewPl, setShowNewPl] = useState(false)
    const [premiumPrompt, setPremiumPrompt] = useState(false)
    const [categorizing, setCategorizing] = useState(false)

    const selectedPlaylist = playlists.find(p => p.id === selectedPl)
    const emotionCounts = useMemo(() => {
        const counts = {}
        if (!selectedPlaylist) return counts
        for (const track of selectedPlaylist.tracks) {
            const bucket = (track.aiEmotion || 'uncategorized').toLowerCase()
            counts[bucket] = (counts[bucket] || 0) + 1
        }
        return counts
    }, [selectedPlaylist])
    const isPremium = Boolean(user?.premium)
    const playlistLink = settings?.playlistLink?.trim() ?? ''
    const openExternalInBrowser = settings?.openExternalLinksInBrowser !== false
    const backendUrl = settings?.backendUrl?.trim() || 'http://127.0.0.1:8000'

    const openSavedPlaylistLink = () => {
        if (!playlistLink) return
        if (openExternalInBrowser) {
            window.open(playlistLink, '_blank', 'noopener,noreferrer')
            return
        }
        window.location.href = playlistLink
    }

    const loadHomeFeed = useCallback(async () => {
        setLoadingHome(true)
        try {
            const calls = HOME_QUERIES.map((q) => axios.post(`${backendUrl}/youtube-search`, {
                query: q,
                max_results: 6,
            }))

            const responses = await Promise.all(calls)
            const merged = responses.flatMap((res) => {
                const payload = res.data || {}
                return payload.error ? [] : (payload.tracks || [])
            })

            const deduped = []
            const seenIds = new Set()
            for (const track of merged) {
                if (seenIds.has(track.videoId)) continue
                seenIds.add(track.videoId)
                deduped.push(track)
                if (deduped.length >= 24) break
            }

            setHomeFeed(deduped)
        } catch (error) {
            toast(getYoutubeErrorMessage(error), 'error')
            setHomeFeed([])
        } finally {
            setLoadingHome(false)
        }
    }, [backendUrl, toast])

    useEffect(() => {
        loadHomeFeed()
    }, [loadHomeFeed])

    const visibleResults = useMemo(() => {
        if (searchQ.trim()) return searchRes
        return homeFeed
    }, [homeFeed, searchQ, searchRes])

    const searchYoutube = useCallback(async () => {
        if (!searchQ.trim()) {
            setSearchRes([])
            return
        }

        setSearching(true)
        try {
            const res = await axios.post(`${backendUrl}/youtube-search`, {
                query: searchQ.trim(),
                max_results: 15,
            })

            if (res.data?.error) {
                toast(getYoutubeErrorMessage(res.data.error), 'error')
                setSearchRes([])
            } else {
                setSearchRes(res.data?.tracks ?? [])
            }
        } catch (error) {
            toast(getYoutubeErrorMessage(error), 'error')
        }
        finally { setSearching(false) }
    }, [searchQ, toast, backendUrl])

    const addSong = useCallback(async (track) => {
        if (!selectedPl) { toast('Select a playlist first', 'error'); return }

        let categorized = annotateTrackWithEmotion(track)
        try {
            categorized = await analyzeTrackMood(track, backendUrl)
        } catch {
            // Keep local classifier result if backend audio analysis is unavailable.
        }

        const alreadyExists = selectedPlaylist?.tracks?.some((t) => t.videoId === categorized.videoId)
        if (alreadyExists) {
            toast('This song is already in the selected playlist.', 'info')
            return
        }

        addToPlaylist(selectedPl, categorized)
        toast(`Added to "${selectedPlaylist?.name}" 🎵`, 'success')
    }, [selectedPl, selectedPlaylist, addToPlaylist, toast, backendUrl])

    const categorizeSelectedPlaylist = useCallback(async () => {
        if (!selectedPlaylist) return
        if (selectedPlaylist.tracks.length === 0) {
            toast('No tracks to categorize in this playlist.', 'info')
            return
        }

        setCategorizing(true)
        try {
            let categorized = await analyzeTracksMoodBatch(selectedPlaylist.tracks, backendUrl)

            // Ensure every track has at least a local fallback category.
            categorized = categorized.map((track) => {
                if (track.aiEmotion && track.aiEmotionSource) return track
                return annotateTrackWithEmotion(track)
            })

            replacePlaylistTracks(selectedPlaylist.id, categorized)

            const audioBasedCount = categorized.filter((track) => track.aiEmotionSource === 'audio_pipeline_v1').length
            if (audioBasedCount > 0) {
                toast(`AI categorized ${categorized.length} track(s). Audio-based analysis: ${audioBasedCount}.`, 'success')
            } else {
                toast('Categorization finished using local fallback rules.', 'info')
            }
        } catch {
            const fallback = annotateTracksWithEmotion(selectedPlaylist.tracks, true)
            replacePlaylistTracks(selectedPlaylist.id, fallback)
            toast('Audio pipeline is unavailable; used local keyword categorizer.', 'info')
        } finally {
            setCategorizing(false)
        }
    }, [replacePlaylistTracks, selectedPlaylist, toast, backendUrl])

    const playFromExternal = useCallback((track) => {
        if (!isPremium) {
            setPremiumPrompt(true)
            return
        }

        setPlayQueue({
            id: `external-${track.videoId}`,
            name: 'YouTube Quick Play',
            tracks: [track],
        })
    }, [isPremium])

    const upgradePremium = useCallback(() => {
        onUserChange?.((prev) => ({ ...prev, premium: true }))
        setPremiumPrompt(false)
        toast('Premium activated ✨', 'success')
    }, [onUserChange, toast])

    const handleCreatePlaylist = () => {
        if (!newPlName.trim()) return
        const id = createPlaylist(newPlName.trim())
        setSelectedPl(id)
        setNewPlName('')
        setShowNewPl(false)
        toast(`Playlist "${newPlName.trim()}" created!`, 'success')
    }

    // If playing mode
    if (playQueue) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="ai-page-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                    <button className="back-btn" onClick={() => setPlayQueue(null)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>🎶 {playQueue.name}</span>
                    <button className="back-btn" onClick={onBack} style={{ marginLeft: 'auto' }} title="Back to Home">
                        🏠
                    </button>
                </div>
                <MusicPlayer
                    tracks={playQueue.tracks}
                    title={`🎶 ${playQueue.name}`}
                    subtitle={`${playQueue.tracks.length} tracks`}
                    accentColor="var(--accent2)"
                />
            </div>
        )
    }

    // Browse mode — left: playlists, right: tracks + search
    return (
        <div className="playlist-sel-page">
            <div className="playlist-sel-header">
                <button className="back-btn" onClick={onBack}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                        <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>🎶 My Playlists</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="premium-chip" style={{ marginLeft: 'auto' }}>
                    {isPremium ? '👑 Premium' : 'Free'}
                </div>
                {!isPremium && (
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setPremiumPrompt(true)}>
                        Upgrade
                    </button>
                )}
                {playlistLink && (
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}
                        onClick={openSavedPlaylistLink}>
                        🔗 Open Saved Playlist
                    </button>
                )}
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}
                    onClick={() => setShowNewPl(true)}>
                    + New Playlist
                </button>
            </div>

            <div className="playlist-sel-body">
                {/* Left: Playlist list */}
                <div className="playlist-sel-list">
                    {playlists.length === 0 && (
                        <div style={{ padding: '20px 12px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                            No playlists yet.<br />Create one to start!
                        </div>
                    )}
                    {playlists.map((pl, i) => (
                        <div key={pl.id}
                            className={`pl-list-item ${selectedPl === pl.id ? 'active' : ''}`}
                            onClick={() => setSelectedPl(pl.id)}>
                            <span className="pl-list-icon">{PLAYLIST_EMOJIS[i % PLAYLIST_EMOJIS.length]}</span>
                            <div className="pl-list-info">
                                <div className="pl-list-name">{pl.name}</div>
                                <div className="pl-list-count">{pl.tracks.length} tracks</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Track pane */}
                <div className="playlist-tracks-pane">
                    {selectedPlaylist ? (
                        <>
                            <div className="ptp-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                                        {selectedPlaylist.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                        {selectedPlaylist.tracks.length} tracks saved
                                    </div>
                                    {selectedPlaylist.tracks.length > 0 && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI categories:</span>
                                            {EMOTION_ORDER.filter((mood) => (emotionCounts[mood] || 0) > 0).map((mood) => (
                                                <span key={mood} style={{ fontSize: 11 }}>
                                                    {EMOTION_LABELS[mood]?.icon || '🎵'} {emotionCounts[mood]}
                                                </span>
                                            ))}
                                            {(emotionCounts.uncategorized || 0) > 0 && (
                                                <span style={{ fontSize: 11 }}>🎵 {emotionCounts.uncategorized}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {selectedPlaylist.tracks.length > 0 && (
                                        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}
                                            onClick={categorizeSelectedPlaylist}
                                            disabled={categorizing}>
                                            {categorizing ? 'Analyzing songs...' : 'Categorize Playlist'}
                                        </button>
                                    )}
                                    {selectedPlaylist.tracks.length > 0 && (
                                        <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}
                                            onClick={() => setPlayQueue(selectedPlaylist)}>
                                            ▶ Play Playlist
                                        </button>
                                    )}
                                    <button className="btn btn-danger" style={{ fontSize: 12, padding: '7px 14px' }}
                                        onClick={() => {
                                            if (window.confirm(`Delete "${selectedPlaylist.name}"?`)) {
                                                deletePlaylist(selectedPlaylist.id)
                                                setSelectedPl(playlists.find(p => p.id !== selectedPlaylist.id)?.id ?? null)
                                                toast('Playlist deleted', 'info')
                                            }
                                        }}>
                                        🗑
                                    </button>
                                </div>
                            </div>

                            <div className="ptp-tracks">
                                {selectedPlaylist.tracks.length === 0 && (
                                    <div className="empty-state" style={{ padding: 40 }}>
                                        <div className="empty-state-icon">🎵</div>
                                        <h3>No tracks yet</h3>
                                        <p>Search YouTube below to add songs</p>
                                    </div>
                                )}
                                {selectedPlaylist.tracks.map((t, i) => (
                                    <div key={t.videoId} className="queue-item" style={{ cursor: 'default' }}>
                                        <div className="queue-num">{i + 1}</div>
                                        {t.thumbnail
                                            ? <img className="queue-thumb" src={t.thumbnail} alt={t.title} loading="lazy" />
                                            : <div className="queue-thumb-placeholder">🎵</div>
                                        }
                                        <div className="queue-info">
                                            <div className="queue-track-title">{t.title}</div>
                                            <div className="queue-track-channel">{t.channel}</div>
                                            {t.aiEmotion && (
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    AI emotion: {t.aiEmotion}
                                                    {typeof t.aiEmotionConfidence === 'number' ? ` (${Math.round(t.aiEmotionConfidence * 100)}%)` : ''}
                                                </div>
                                            )}
                                        </div>
                                        <div className="queue-item-actions" style={{ opacity: 1 }}>
                                            <a href={t.youtube_url} target="_blank" rel="noopener noreferrer"
                                                className="btn-icon" title="Open in YouTube" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.5 12 3.5 12 3.5s-7.55 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.03 0 12 0 12s0 3.97.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.45 20.5 12 20.5 12 20.5s7.55 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.97 24 12 24 12s0-3.97-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z" />
                                                </svg>
                                            </a>
                                            <button className="btn-icon" title="Remove" style={{ color: 'var(--danger)' }}
                                                onClick={() => { removeFromPlaylist(selectedPl, t.videoId); toast('Removed', 'info') }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* YouTube Search Bar at bottom */}
                            <div className="yt-search-row">
                                <div className="search-bar" style={{ flex: 1, padding: '9px 14px', borderRadius: 'var(--radius-md)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search YouTube songs…"
                                        value={searchQ}
                                        onChange={e => setSearchQ(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && searchYoutube()}
                                    />
                                </div>
                                <button className="btn btn-ghost" style={{ padding: '9px 12px', fontSize: 12 }} onClick={loadHomeFeed}>
                                    Home picks
                                </button>
                                <button className="btn btn-primary" style={{ padding: '9px 16px', fontSize: 13 }}
                                    onClick={searchYoutube} disabled={searching}>
                                    {searching ? <span className="spin">⟳</span> : 'Search'}
                                </button>
                            </div>

                            {/* Search Results */}
                            {(loadingHome || visibleResults.length > 0 || (searchQ.trim() && !searching)) && (
                                <div style={{
                                    maxHeight: 280, overflowY: 'auto', padding: '8px 20px 12px',
                                    borderTop: '1px solid var(--border)',
                                    display: 'flex', flexDirection: 'column', gap: 4
                                }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, paddingTop: 4 }}>
                                        {searchQ.trim()
                                            ? `YouTube results — add to "${selectedPlaylist?.name}" or quick-play${isPremium ? '' : ' (Premium)'}`
                                            : 'YouTube home picks — discover songs before searching'}
                                    </div>
                                    {loadingHome && !searchQ.trim() && (
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>
                                            Loading YouTube home songs…
                                        </div>
                                    )}
                                    {!loadingHome && visibleResults.length === 0 && searchQ.trim() && (
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>
                                            No songs found for this search.
                                        </div>
                                    )}
                                    {visibleResults.map(t => (
                                        <div key={t.videoId} className="queue-item" style={{ cursor: 'default' }}>
                                            {t.thumbnail
                                                ? <img className="queue-thumb" src={t.thumbnail} alt={t.title} loading="lazy" />
                                                : <div className="queue-thumb-placeholder">🎵</div>
                                            }
                                            <div className="queue-info">
                                                <div className="queue-track-title">{t.title}</div>
                                                <div className="queue-track-channel">{t.channel}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                <a href={t.youtube_url} target="_blank" rel="noopener noreferrer"
                                                    className="btn-icon" style={{ color: 'rgba(255,50,50,0.8)', textDecoration: 'none' }}>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.5 12 3.5 12 3.5s-7.55 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.03 0 12 0 12s0 3.97.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.45 20.5 12 20.5 12 20.5s7.55 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.97 24 12 24 12s0-3.97-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z" />
                                                    </svg>
                                                </a>
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ fontSize: 11, padding: '5px 10px' }}
                                                    onClick={() => playFromExternal(t)}
                                                    title={isPremium ? 'Play now' : 'Premium feature'}>
                                                    {isPremium ? '▶ Play now' : '👑 Play'}
                                                </button>
                                                <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 10px' }}
                                                    onClick={() => addSong(t)}>
                                                    + Add
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state" style={{ flex: 1 }}>
                            <div className="empty-state-icon">🎶</div>
                            <h3>{playlists.length === 0 ? 'Create your first playlist' : 'Select a playlist'}</h3>
                            <p>{playlists.length === 0 ? 'Click "+ New Playlist" to get started' : 'Choose a playlist from the left to view and edit it'}</p>
                            {playlists.length === 0 && (
                                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowNewPl(true)}>
                                    + New Playlist
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* New Playlist Modal */}
            {showNewPl && (
                <div className="modal-overlay" onClick={() => setShowNewPl(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">🎵 Create New Playlist</div>
                        <input className="modal-input"
                            placeholder="Playlist name…"
                            value={newPlName} autoFocus
                            onChange={e => setNewPlName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreatePlaylist(); if (e.key === 'Escape') setShowNewPl(false) }}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowNewPl(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreatePlaylist} disabled={!newPlName.trim()}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {premiumPrompt && (
                <div className="modal-overlay" onClick={() => setPremiumPrompt(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">👑 Upgrade to Premium</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                            Free users can play songs from selected playlists. Premium unlocks quick-play for any YouTube song result.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setPremiumPrompt(false)}>Maybe later</button>
                            <button className="btn btn-primary" onClick={upgradePremium}>Activate Premium</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
