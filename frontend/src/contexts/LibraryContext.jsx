import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { annotateTrackWithEmotion } from '../utils/trackEmotionClassifier.js'

const LibraryContext = createContext(null)

const FAVS_KEY = 'mm_favorites'
const PL_KEY = 'mm_playlists'

function load(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) ?? def }
    catch { return def }
}

export function LibraryProvider({ children }) {
    const [favorites, setFavorites] = useState(() => load(FAVS_KEY, []))
    const [playlists, setPlaylists] = useState(() => load(PL_KEY, []))

    useEffect(() => {
        localStorage.setItem(FAVS_KEY, JSON.stringify(favorites))
    }, [favorites])

    useEffect(() => {
        localStorage.setItem(PL_KEY, JSON.stringify(playlists))
    }, [playlists])

    // --- Favorites ---
    const isFav = useCallback((videoId) => favorites.some(f => f.videoId === videoId), [favorites])

    const toggleFav = useCallback((track) => {
        setFavorites(prev =>
            prev.some(f => f.videoId === track.videoId)
                ? prev.filter(f => f.videoId !== track.videoId)
                : [...prev, track]
        )
    }, [])

    // --- Playlists ---
    const createPlaylist = useCallback((name) => {
        const playlist = { id: Date.now().toString(), name, tracks: [], createdAt: Date.now() }
        setPlaylists(prev => [...prev, playlist])
        return playlist.id
    }, [])

    const deletePlaylist = useCallback((id) => {
        setPlaylists(prev => prev.filter(p => p.id !== id))
    }, [])

    const renamePlaylist = useCallback((id, name) => {
        setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name } : p))
    }, [])

    const addToPlaylist = useCallback((playlistId, track) => {
        const categorizedTrack = annotateTrackWithEmotion(track)
        setPlaylists(prev => prev.map(p => {
            if (p.id !== playlistId) return p
            if (p.tracks.find(t => t.videoId === categorizedTrack.videoId)) return p
            return { ...p, tracks: [...p.tracks, categorizedTrack] }
        }))
    }, [])

    const removeFromPlaylist = useCallback((playlistId, videoId) => {
        setPlaylists(prev => prev.map(p =>
            p.id === playlistId
                ? { ...p, tracks: p.tracks.filter(t => t.videoId !== videoId) }
                : p
        ))
    }, [])

    const replacePlaylistTracks = useCallback((playlistId, tracks) => {
        setPlaylists(prev => prev.map(p =>
            p.id === playlistId
                ? { ...p, tracks }
                : p
        ))
    }, [])

    return (
        <LibraryContext.Provider value={{
            favorites, isFav, toggleFav,
            playlists, createPlaylist, deletePlaylist, renamePlaylist,
            addToPlaylist, removeFromPlaylist, replacePlaylistTracks
        }}>
            {children}
        </LibraryContext.Provider>
    )
}

export const useLibrary = () => useContext(LibraryContext)
