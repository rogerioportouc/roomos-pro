import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

const BookingSchema = z.object({
  roomId:    z.string().uuid(),
  title:     z.string().min(1).max(200),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/),
  notes:     z.string().optional(),
  userId:    z.string().uuid().optional(),
})

const toMin = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m }

// GET /api/bookings
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const { date, roomId, userId, status } = req.query
  const where: any = {}
  if (date)   where.date   = new Date(date as string)
  if (roomId) where.roomId = roomId
  if (status) where.status = status
  // Non-managers only see own bookings
  if (req.user?.role === 'user') where.userId = req.user.id
  else if (userId) where.userId = userId

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      room: { select: { name: true, floor: true, color: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
  res.json(bookings)
})

// POST /api/bookings
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const data = BookingSchema.parse(req.body)

  // Conflict check
  const conflicts = await prisma.booking.findMany({
    where: { roomId: data.roomId, date: new Date(data.date), status: 'confirmed' },
  })
  const hasConflict = conflicts.some(b =>
    !(toMin(data.endTime) <= toMin(b.endTime) && toMin(data.endTime) <= toMin(b.startTime)) &&
    !(toMin(data.startTime) >= toMin(b.endTime))
  )
  if (hasConflict) return res.status(409).json({ error: 'Conflito de horário' })

  const booking = await prisma.booking.create({
    data: {
      ...data,
      date:   new Date(data.date),
      userId: data.userId || req.user!.id,
    },
    include: {
      room: { select: { name: true, color: true } },
      user: { select: { name: true } },
    },
  })

  // WebSocket broadcast
  const io = (req as any).io
  io?.to('wallboard').emit('booking:created', booking)
  io?.to(`room:${booking.roomId}`).emit('booking:created', booking)

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'booking_create',
      detail: `Reservou ${booking.room.name} — ${data.title} ${data.startTime}`,
      ip: req.ip,
    },
  })

  res.status(201).json(booking)
})

// POST /api/bookings/:id/checkin
router.post('/:id/checkin', authMiddleware, async (req: AuthRequest, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } })
  if (!booking) return res.status(404).json({ error: 'Reserva não encontrada' })
  if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Reserva não está confirmada' })

  const now = new Date()
  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data:  { checkinAt: now },
  })

  const io = (req as any).io
  io?.to(`room:${booking.roomId}`).emit('booking:checkin', { bookingId: booking.id, checkinAt: now })
  io?.to('wallboard').emit('booking:checkin', { bookingId: booking.id })

  res.json(updated)
})

// PUT /api/bookings/:id — update / cancel
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } })
  if (!booking) return res.status(404).json({ error: 'Reserva não encontrada' })

  // Only owner or manager can edit
  const isOwner = booking.userId === req.user!.id
  const isMgr   = ['admin','manager'].includes(req.user!.role)
  if (!isOwner && !isMgr) return res.status(403).json({ error: 'Sem permissão' })

  const { status, cancelReason } = req.body
  const data: any = { status }
  if (status === 'cancelled') {
    data.cancelledAt   = new Date()
    data.cancelReason  = cancelReason
  }

  const updated = await prisma.booking.update({ where: { id: req.params.id }, data })

  const io = (req as any).io
  io?.to('wallboard').emit('booking:updated', updated)
  io?.to(`room:${booking.roomId}`).emit('booking:updated', updated)

  res.json(updated)
})

export default router
