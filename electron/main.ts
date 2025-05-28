import { app, BrowserWindow, Menu, ipcMain } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { machineIdSync } from 'node-machine-id'

const execAsync = promisify(exec)

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
Menu.setApplicationMenu(null);

async function handleShutdown() {
  const command = process.platform === 'win32' 
    ? 'shutdown /s /t 0' 
    : 'sudo shutdown -h now'
  
  try {
    await execAsync(command)
  } catch (error) {
    console.error('Failed to execute shutdown command:', error)
    throw error
  }
}

// 获取设备ID
function getMachineId() {
  try {
    return machineIdSync(true)
  } catch (error) {
    console.error('Failed to get machine ID:', error)
    return null
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 500,
    height: 300,
    minWidth: 500,
    minHeight: 300,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// 注册IPC处理程序
ipcMain.handle('shutdown-computer', async () => {
  try {
    await handleShutdown()
    return true
  } catch (error) {
    console.error('Shutdown failed:', error)
    return false
  }
})

ipcMain.handle('get-machine-id', () => {
  return getMachineId()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
