import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/svg+xml','image/gif','application/pdf']
    cb(null, allowed.includes(file.mimetype))
  }
})

router.post('/floor-map', authMiddleware, requireRole('admin'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo inválido' })
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname })
})

router.post('/logo', authMiddleware, requireRole('admin'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo inválido' })
  res.json({ url: `/uploads/${req.file.filename}` })
})

export default router
