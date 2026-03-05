import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
    const [currentTrack, setCurrentTrack] = useState(null) // { videoId, title, channel, thumbnail }
    const [showModal, setShowModal] = useState(false)
    const [queue, setQueue] = useState([])

    const play = useCallback((track) => {
        setCurrentTrack(track)
        setShowModal(true)
    }, [])

    const closeModal = useCallback(() => setShowModal(false), [])
    const openModal = useCallback(() => { if (currentTrack) setShowModal(true) }, [currentTrack])

    const addToQueue = useCallback((track) => {
        setQueue(prev => {
            if (prev.find(t => t.videoId === track.videoId)) return prev
            return [...prev, track]
        })
    }, [])

    return (
        <PlayerContext.Provider value={{ currentTrack, play, showModal, closeModal, openModal, queue, addToQueue }}>
            {children}
        </PlayerContext.Provider>
    )
}

export const usePlayer = () => useContext(PlayerContext)
