import express from 'express'
import http from 'http'
import { Server as SocketIO } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import passport from 'passport'
import { configurePassport } from './middleware/passport'
import { logger } from './services/logger'
import { connectRedis } from './services/redis'

// Routes
import authRoutes    from './routes/auth'
import roomRoutes    from './routes/rooms'
import bookingRoutes from './routes/bookings'
import userRoutes    from './routes/users'
import uploadRoutes  from './routes/uploads'
import webhookRoutes from './routes/webhooks'
import configRoutes  from './routes/config'

const app  = express()
const server = http.createServer(app)
const io   = new SocketIO(server, {
  cors: { origin: process.env.APP_URL || '*', methods: ['GET','POST'] },
  path: '/ws',
})

// ── Middleware ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.APP_URL || '*', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(passport.initialize())
configurePassport()

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 })
app.use('/api/', limiter)

// Attach io to requests
app.use((req: any, _res, next) => { req.io = io; next() })

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',     authRoutes)
app.use('/api/rooms',    roomRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/users',    userRoutes)
app.use('/api/uploads',  uploadRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/config',   configRoutes)

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.4.1', ts: new Date().toISOString() })
})

// ── Serve React frontend (production) ─────────────────────────
const DIST = path.join(__dirname, '../../frontend/dist')
app.use(express.static(DIST))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')))

// ── WebSocket ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info(`WS connected: ${socket.id}`)
  socket.on('subscribe:room', (roomId: string) => socket.join(`room:${roomId}`))
  socket.on('subscribe:wallboard', () => socket.join('wallboard'))
  socket.on('disconnect', () => logger.info(`WS disconnected: ${socket.id}`))
})

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000')

async function main() {
  await connectRedis()
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`RoomOS Pro v2.4.1 running on port ${PORT}`)
    logger.info(`Environment: ${process.env.NODE_ENV}`)
    logger.info(`URL: ${process.env.APP_URL}`)
  })
}

main().catch((err) => {
  logger.error('Startup error', err)
  process.exit(1)
})

export { io }
