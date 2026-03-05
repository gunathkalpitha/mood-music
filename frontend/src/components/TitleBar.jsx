import React, { useEffect, useState } from 'react'

export default function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false)

    useEffect(() => {
        let unsubscribe = null

        const hydrate = async () => {
            try {
                const value = await window.electronAPI?.isMaximized?.()
                if (typeof value === 'boolean') setIsMaximized(value)
            } catch {
                setIsMaximized(false)
            }

            unsubscribe = window.electronAPI?.onMaximizeChange?.((value) => {
                setIsMaximized(Boolean(value))
            })
        }

        hydrate()

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe()
        }
    }, [])

    const minimize = () => window.electronAPI?.minimize()
    const maximize = () => window.electronAPI?.toggleMaximize()
    const close = () => window.electronAPI?.close()

    return (
        <div className="titlebar">
            <div className="titlebar-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                </svg>
                Mood Music
            </div>
            <span className="titlebar-title">AI-Powered Music Discovery</span>
            <div className="titlebar-controls">
                <button className="win-btn minimize" onClick={minimize} title="Minimize" aria-label="Minimize">
                    <svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                        <rect x="1" y="7" width="8" height="1.2" rx="0.3" />
                    </svg>
                </button>
                <button className="win-btn maximize" onClick={maximize} title={isMaximized ? 'Restore' : 'Maximize'} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
                    {isMaximized ? (
                        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="1.8" y="3" width="5.5" height="5.2" />
                            <path d="M3 3V1.8H8.2V7H7" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="1.8" y="1.8" width="6.4" height="6.4" />
                        </svg>
                    )}
                </button>
                <button className="win-btn close" onClick={close} title="Close" aria-label="Close">
                    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <path d="M2 2l6 6M8 2 2 8" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
