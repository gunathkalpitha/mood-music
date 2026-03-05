import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../contexts/LibraryContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const PLAYLIST_EMOJIS = ['🎵', '🎸', '🎷', '🥁', '🎹', '🎺', '🎻', '🎤', '🔥', '💜', '⚡', '🌙', '☀️', '🌊', '🏔️']

export default function Playlists() {
    const { playlists, createPlaylist, deletePlaylist, renamePlaylist } = useLibrary()
    const toast = useToast()
    const navigate = useNavigate()
    const [showModal, setShowModal] = useState(false)
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')

    const handleCreate = () => {
        const name = newName.trim()
        if (!name) return
        const id = createPlaylist(name)
        toast(`Playlist "${name}" created 🎵`, 'success')
        setNewName('')
        setShowModal(false)
        navigate(`/playlists/${id}`)
    }

    const handleDelete = (e, id, name) => {
        e.stopPropagation()
        if (window.confirm(`Delete playlist "${name}"?`)) {
            deletePlaylist(id)
            toast(`Playlist deleted`, 'info')
        }
    }

    const handleRename = (e, id) => {
        e.stopPropagation()
        const name = editName.trim()
        if (name) renamePlaylist(id, name)
        setEditingId(null)
        setEditName('')
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="page-title">🎶 Playlists</h1>
                    <p className="page-subtitle">
                        {playlists.length > 0
                            ? `${playlists.length} playlist${playlists.length !== 1 ? 's' : ''}`
                            : 'Create your first playlist'}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                    New Playlist
                </button>
            </div>

            {playlists.length === 0 ? (
                <div className="empty-state glass-card" style={{ padding: 60 }}>
                    <div className="empty-state-icon">🎶</div>
                    <h3>No playlists yet</h3>
                    <p>Create a playlist and add songs from Search or Mood Detect</p>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
                        + New Playlist
                    </button>
                </div>
            ) : (
                <div className="playlist-grid">
                    {playlists.map((pl, i) => (
                        <div key={pl.id} className="playlist-card" onClick={() => navigate(`/playlists/${pl.id}`)}>
                            <div className="playlist-card-actions">
                                <button className="btn-icon" title="Delete"
                                    onClick={(e) => handleDelete(e, pl.id, pl.name)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" width="14" height="14">
                                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                            <div className="playlist-icon">{PLAYLIST_EMOJIS[i % PLAYLIST_EMOJIS.length]}</div>
                            {editingId === pl.id ? (
                                <input
                                    className="modal-input"
                                    value={editName}
                                    autoFocus
                                    onChange={e => setEditName(e.target.value)}
                                    onBlur={(e) => handleRename(e, pl.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(e, pl.id) }}
                                    onClick={e => e.stopPropagation()}
                                    style={{ marginBottom: 4, padding: '6px 10px', fontSize: 14 }}
                                />
                            ) : (
                                <div className="playlist-name" onDoubleClick={(e) => { e.stopPropagation(); setEditingId(pl.id); setEditName(pl.name) }}>
                                    {pl.name}
                                </div>
                            )}
                            <div className="playlist-count">{pl.tracks.length} track{pl.tracks.length !== 1 ? 's' : ''}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Playlist Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">🎵 Create New Playlist</div>
                        <input
                            className="modal-input"
                            placeholder="Give your playlist a name…"
                            value={newName}
                            autoFocus
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowModal(false) }}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
