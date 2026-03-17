import type { Server } from 'socket.io'
import { supabaseAdmin } from '../services/supabase.js'

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>()

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys())
}

export function getOnlineCount(): number {
  return onlineUsers.size
}

export function setupSocket(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string
    if (!token) {
      return next(new Error('Token de autenticacao ausente'))
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) {
      return next(new Error('Token invalido'))
    }

    socket.data.userId = user.id
    next()
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    console.log(`User connected: ${userId}`)

    // Track online
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set())
    }
    onlineUsers.get(userId)!.add(socket.id)

    // Broadcast online count to admin channel
    io.to('admin').emit('online_count', { count: onlineUsers.size, users: getOnlineUsers() })

    socket.on('join_room', async ({ roomId }: { roomId: string }) => {
      // Verify membership before joining
      const { data: member } = await supabaseAdmin
        .from('room_members')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .is('removed_at', null)
        .single()

      if (member) {
        socket.join(`room:${roomId}`)
        console.log(`User ${userId} joined room:${roomId}`)
      }
    })

    socket.on('join_admin', () => {
      socket.join('admin')
    })

    socket.on('leave_room', ({ roomId }: { roomId: string }) => {
      socket.leave(`room:${roomId}`)
    })

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`)

      // Remove from online tracking
      const sockets = onlineUsers.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          onlineUsers.delete(userId)
        }
      }

      // Broadcast updated count
      io.to('admin').emit('online_count', { count: onlineUsers.size, users: getOnlineUsers() })
    })
  })
}
