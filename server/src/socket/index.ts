import type { Server } from 'socket.io'
import { supabaseAdmin } from '../services/supabase.js'

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
    console.log(`User connected: ${socket.data.userId}`)

    socket.on('join_room', async ({ roomId }: { roomId: string }) => {
      // Verify membership before joining
      const { data: member } = await supabaseAdmin
        .from('room_members')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', socket.data.userId)
        .is('removed_at', null)
        .single()

      if (member) {
        socket.join(`room:${roomId}`)
        console.log(`User ${socket.data.userId} joined room:${roomId}`)
      }
    })

    socket.on('leave_room', ({ roomId }: { roomId: string }) => {
      socket.leave(`room:${roomId}`)
    })

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.userId}`)
    })
  })
}
