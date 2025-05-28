export interface ElectronAPI {
  shutdownComputer: () => Promise<boolean>
  getMachineId: () => Promise<string | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}