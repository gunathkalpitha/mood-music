import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useLibrary } from '../contexts/LibraryContext.jsx'
import axios from 'axios'

const BACKEND_URL = 'http://localhost:8000'

export default function Sidebar() {
    const { favorites, playlists } = useLibrary()
    const [backendOnline, setBackendOnline] = useState(false)

    useEffect(() => {
        const check = async () => {
            try {
                await axios.get(`${BACKEND_URL}/docs`, { timeout: 2000 })
                setBackendOnline(true)
            } catch {
                setBackendOnline(false)
            }
        }
        check()
        const interval = setInterval(check, 8000)
        return () => clearInterval(interval)
    }, [])

    return (
        <aside className="sidebar">
            <span className="sidebar-section-label">Discover</span>

            <NavLink to="/mood" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M12 14c-5 0-7 2-7 4v1h14v-1c0-2-2-4-7-4z" strokeLinejoin="round" />
                </svg>
                Mood Detect
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} title={backendOnline ? 'Backend online' : 'Backend offline'} />
                </span>
            </NavLink>

            <NavLink to="/search" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
                Search YouTube
            </NavLink>

            <span className="sidebar-section-label">Library</span>

            <NavLink to="/favorites" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                Favorites
                {favorites.length > 0 && <span className="nav-badge">{favorites.length}</span>}
            </NavLink>

            <NavLink to="/playlists" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round" />
                </svg>
                Playlists
                {playlists.length > 0 && <span className="nav-badge">{playlists.length}</span>}
            </NavLink>

            <div style={{ flex: 1 }} />

            <div style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                fontSize: 11,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 8
            }}>
                <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} />
                <span>
                    Backend: <strong style={{ color: backendOnline ? 'var(--success)' : 'var(--danger)' }}>
                        {backendOnline ? 'Online' : 'Offline'}
                    </strong>
                </span>
            </div>
        </aside>
    )
}
