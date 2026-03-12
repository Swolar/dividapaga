import { io, Socket } from 'socket.io-client'

const DEMO_MODE = !import.meta.env.VITE_API_URL

// Mock socket for demo mode (no real connection)
class MockSocket {
  private listeners = new Map<string, Set<(...args: any[]) => void>>()
  connected = false

  emit(_event: string, ..._args: any[]) { return this }

  on(event: string, fn: (...args: any[]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return this
  }

  off(event: string, fn?: (...args: any[]) => void) {
    if (fn) {
      this.listeners.get(event)?.delete(fn)
    } else {
      this.listeners.delete(event)
    }
    return this
  }

  connect() { this.connected = true; return this }
  disconnect() { this.connected = false; return this }
  set auth(_v: any) {}
}

let socket: Socket | MockSocket | null = null

export function getSocket(): Socket {
  if (!socket) {
    if (DEMO_MODE) {
      socket = new MockSocket()
    } else {
      socket = io(import.meta.env.VITE_API_URL || '/', {
        autoConnect: false,
        transports: ['websocket', 'polling'],
      })
    }
  }
  return socket as Socket
}

export function connectSocket(token: string) {
  const s = getSocket()
  if (DEMO_MODE) {
    (s as any).connected = true
    return
  }
  s.auth = { token }
  if (!s.connected) {
    s.connect()
  }
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
}
