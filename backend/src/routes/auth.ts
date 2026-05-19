import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import passport from 'passport'

const router = Router()
const prisma = new PrismaClient()

function signToken(user: { id: string; role: string; email: string }) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES || '24h' }
  )
}

// POST /api/auth/login  (local)
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password) return res.status(401).json({ error: 'Credenciais inválidas' })
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })
  if (!user.active) return res.status(403).json({ error: 'Conta desativada' })

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'login', detail: 'Login local', ip: req.ip }
  })
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { token } = req.body
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, { ignoreExpiration: true }) as any
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.active) return res.status(401).json({ error: 'Usuário inativo' })
    res.json({ token: signToken(user) })
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
})

// GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['email','profile','openid'] }))

// GET /api/auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=sso' }),
  (req: any, res) => {
    const token = signToken(req.user)
    res.redirect(`${process.env.APP_URL}/auth/callback?token=${token}`)
  }
)

// GET /api/auth/microsoft
router.get('/microsoft', passport.authenticate('microsoft', {
  scope: ['user.read','openid','profile','email']
}))

// GET /api/auth/microsoft/callback
router.get('/microsoft/callback',
  passport.authenticate('microsoft', { session: false, failureRedirect: '/login?error=sso' }),
  (req: any, res) => {
    const token = signToken(req.user)
    res.redirect(`${process.env.APP_URL}/auth/callback?token=${token}`)
  }
)

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sem token' })
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as any
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, dept: true, phone: true, sso: true }
    })
    res.json(user)
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as any
      await prisma.auditLog.create({
        data: { userId: payload.sub, action: 'logout', detail: 'Sessão encerrada', ip: req.ip }
      })
    } catch {}
  }
  res.json({ ok: true })
})

export default router
