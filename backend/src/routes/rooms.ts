import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, requireRole } from '../middleware/auth'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

const RoomSchema = z.object({
  name:            z.string().min(1),
  floor:           z.string().optional(),
  capacity:        z.number().int().positive().default(10),
  color:           z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#00C2FF'),
  amenities:       z.array(z.string()).default([]),
  checkinEnabled:  z.boolean().default(true),
  checkinMethod:   z.enum(['qrcode','button','both']).default('both'),
  autoCancelMin:   z.number().int().min(1).max(120).default(15),
  allowLate:       z.boolean().default(true),
  lateWindowMin:   z.number().int().min(0).max(60).default(10),
  cancelPolicy:    z.enum(['any','manager_only','no_cancel']).default('any'),
  cancelMinBefore: z.number().int().min(0).default(0),
  maxDurationH:    z.number().int().min(1).max(12).default(4),
  requireNote:     z.boolean().default(false),
  posX:            z.number().min(0).max(100).default(50),
  posY:            z.number().min(0).max(100).default(50),
})

// GET /api/rooms — list all active rooms with current status
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })

    const today = new Date().toISOString().split('T')[0]
    const now   = new Date().toTimeString().slice(0,5)

    const roomsWithStatus = await Promise.all(rooms.map(async (room) => {
      const current = await prisma.booking.findFirst({
        where: {
          roomId: room.id,
          date: new Date(today),
          startTime: { lte: now },
          endTime:   { gt:  now },
          status: 'confirmed',
        },
        include: { user: { select: { name: true } } },
      })
      const next = await prisma.booking.findFirst({
        where: {
          roomId: room.id,
          date: new Date(today),
          startTime: { gt: now },
          status: 'confirmed',
        },
        orderBy: { startTime: 'asc' },
      })
      return { ...room, currentBooking: current, nextBooking: next }
    }))

    res.json(roomsWithStatus)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar salas' })
  }
})

// GET /api/rooms/:id/availability
router.get('/:id/availability', authMiddleware, async (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date é obrigatório' })

  const bookings = await prisma.booking.findMany({
    where: { roomId: req.params.id, date: new Date(date as string), status: 'confirmed' },
    orderBy: { startTime: 'asc' },
    select: { startTime: true, endTime: true, title: true },
  })
  res.json(bookings)
})

// POST /api/rooms — create (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const data = RoomSchema.parse(req.body)
  const room = await prisma.room.create({ data })
  res.status(201).json(room)
})

// PUT /api/rooms/:id — update
router.put('/:id', authMiddleware, requireRole('manager'), async (req, res) => {
  const data = RoomSchema.partial().parse(req.body)
  const room = await prisma.room.update({ where: { id: req.params.id }, data })

  // Broadcast via WebSocket
  const io = (req as any).io
  io?.to('wallboard').emit('room:updated', room)

  res.json(room)
})

// PUT /api/rooms/:id/position — update map position
router.put('/:id/position', authMiddleware, requireRole('admin'), async (req, res) => {
  const { posX, posY } = req.body
  const room = await prisma.room.update({
    where: { id: req.params.id },
    data:  { posX, posY },
  })
  res.json(room)
})

// DELETE /api/rooms/:id — soft delete
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  await prisma.room.update({ where: { id: req.params.id }, data: { active: false } })
  res.status(204).send()
})

export default router
