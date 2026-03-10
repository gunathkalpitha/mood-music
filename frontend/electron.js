const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 960,
        minHeight: 600,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0d0d1a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false // allows loading YouTube iframes in dev
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    })

    // Start maximized so the player always opens in full app window.
    win.maximize()

    if (isDev) {
        win.loadURL('http://localhost:5173')
        // win.webContents.openDevTools()
    } else {
        win.loadFile(path.join(__dirname, 'dist', 'index.html'))
    }

    // Forward open-external calls to OS browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
    })

    const emitMaximizeState = () => {
        win.webContents.send('win-maximize-state', win.isMaximized())
    }

    win.on('maximize', emitMaximizeState)
    win.on('unmaximize', emitMaximizeState)
    win.on('enter-full-screen', emitMaximizeState)
    win.on('leave-full-screen', emitMaximizeState)

    // Window control IPC handlers
    ipcMain.on('win-minimize', () => win.minimize())
    ipcMain.on('win-toggle-maximize', () => {
        if (win.isMaximized()) win.unmaximize()
        else win.maximize()
    })
    ipcMain.on('win-close', () => win.close())
    ipcMain.handle('win-is-maximized', () => win.isMaximized())
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
