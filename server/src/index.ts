import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { authRoutes } from './routes/auth.routes.js'
import { roomRoutes } from './routes/rooms.routes.js'
import { expenseRoutes } from './routes/expenses.routes.js'
import { inviteRoutes, roomInviteRoutes } from './routes/invites.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'
import { uploadRoutes } from './routes/upload.routes.js'
import { profileRoutes } from './routes/profiles.routes.js'
import { adminRoutes } from './routes/admin.routes.js'
import { setupSocket } from './socket/index.js'
import { authMiddleware } from './middleware/auth.middleware.js'
import { roomOwnerMiddleware } from './middleware/room-access.middleware.js'
import { generalLimiter } from './middleware/rate-limiter.middleware.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

// CORS config - aceita dominio principal e preview deploys do Vercel
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim())
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir requests sem origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true)
    // Checar se origin esta na lista ou e um preview deploy do Vercel
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true)
    }
    callback(null, false)
  },
  credentials: true,
}

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true)
      }
      callback(null, false)
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
})

// Middleware
app.use(helmet())
app.use(cors(corsOptions))
app.use(express.json())
app.use('/api', generalLimiter)

// Make io available to routes
app.set('io', io)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/profiles', profileRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/rooms', expenseRoutes)
app.use('/api/invites', inviteRoutes)
app.use('/api/rooms/:roomId/invites', authMiddleware, roomOwnerMiddleware, roomInviteRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const { supabaseAdmin: sb } = await import('./services/supabase.js')
    const { error } = await sb.from('profiles').select('id', { count: 'exact', head: true })
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: error ? `error: ${error.message}` : 'connected',
      tables_ok: !error,
    })
  } catch (err: any) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: `error: ${err.message}`,
      tables_ok: false,
    })
  }
})

// Socket.io
setupSocket(io)

const PORT = process.env.PORT || 3001

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})

export { app, io }
