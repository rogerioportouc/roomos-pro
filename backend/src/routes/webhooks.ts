import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', authMiddleware, requireRole('admin'), async (_req, res) => {
  res.json(await prisma.webhook.findMany())
})
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { url, events, secret } = req.body
  res.status(201).json(await prisma.webhook.create({ data: { url, events, secret } }))
})
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  await prisma.webhook.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
