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
import { setupSocket } from './socket/index.js'
import { authMiddleware } from './middleware/auth.middleware.js'
import { roomOwnerMiddleware } from './middleware/room-access.middleware.js'
import { generalLimiter } from './middleware/rate-limiter.middleware.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
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

// Health check
app.get('/api/health', async (_req, res) => {
  // Test DB connection
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: error ? `error: ${error.message}` : 'connected',
    tables_ok: !error,
  })
})

// Socket.io
setupSocket(io)

const PORT = process.env.PORT || 3001

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})

export { app, io }
