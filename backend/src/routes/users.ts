import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { authMiddleware, requireRole } from '../middleware/auth'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

router.get('/', authMiddleware, requireRole('admin'), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id:true, name:true, email:true, role:true, dept:true, phone:true, sso:true, active:true, createdAt:true },
    orderBy: { name: 'asc' },
  })
  res.json(users)
})

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, dept, phone, sso } = req.body
  const hash = password ? await bcrypt.hash(password, 12) : null
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: role || 'user', dept, phone, sso: sso || 'local' }
  })
  res.status(201).json({ ...user, password: undefined })
})

router.put('/:id', authMiddleware, async (req, res) => {
  const { name, dept, phone, notes, role } = req.body
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, dept, phone, notes, ...(role ? { role } : {}) }
  })
  res.json({ ...updated, password: undefined })
})

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { active: false } })
  res.status(204).send()
})

router.get('/audit-logs', authMiddleware, requireRole('admin'), async (req, res) => {
  const { userId, action } = req.query
  const where: any = {}
  if (userId) where.userId = userId
  if (action) where.action = action
  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(logs)
})

export default router
