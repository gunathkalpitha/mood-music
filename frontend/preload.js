const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('win-minimize'),
    toggleMaximize: () => ipcRenderer.send('win-toggle-maximize'),
    isMaximized: () => ipcRenderer.invoke('win-is-maximized'),
    onMaximizeChange: (callback) => {
        const listener = (_event, isMaximized) => callback(isMaximized)
        ipcRenderer.on('win-maximize-state', listener)
        return () => ipcRenderer.removeListener('win-maximize-state', listener)
    },
    close: () => ipcRenderer.send('win-close'),
})
