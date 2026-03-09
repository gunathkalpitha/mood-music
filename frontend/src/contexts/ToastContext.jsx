import React, { createContext, useContext, useState, useCallback } from 'react'
import { useSettings } from './SettingsContext.jsx'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const { settings } = useSettings()

    const show = useCallback((message, type = 'info') => {
        if (settings?.showToastNotifications === false) return
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    }, [settings?.showToastNotifications])

    return (
        <ToastContext.Provider value={show}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <span>
                            {t.type === 'success' && '✅'}
                            {t.type === 'error' && '❌'}
                            {t.type === 'info' && '💜'}
                        </span>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)
