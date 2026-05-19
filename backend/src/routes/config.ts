import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', authMiddleware, async (_req, res) => {
  const configs = await prisma.systemConfig.findMany()
  const obj = Object.fromEntries(configs.map(c => [c.key, c.value]))
  res.json(obj)
})

router.put('/:key', authMiddleware, requireRole('admin'), async (req, res) => {
  const cfg = await prisma.systemConfig.upsert({
    where: { key: req.params.key },
    update: { value: req.body },
    create: { key: req.params.key, value: req.body }
  })
  res.json(cfg)
})

export default router
