import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function configurePassport() {
  // ── Google Workspace ──────────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK || `${process.env.APP_URL}/api/auth/google/callback`,
    }, async (_at, _rt, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value
        if (!email) return done(new Error('E-mail não disponível'))

        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          user = await prisma.user.create({
            data: {
              name:  profile.displayName || email.split('@')[0],
              email,
              sso:   'google',
              ssoId: profile.id,
              role:  'user',
            }
          })
        } else if (user.sso !== 'google') {
          await prisma.user.update({ where: { id: user.id }, data: { ssoId: profile.id } })
        }

        if (!user.active) return done(null, false)

        await prisma.auditLog.create({
          data: { userId: user.id, action: 'login', detail: 'Login via Google SSO' }
        })
        done(null, user)
      } catch (err) {
        done(err as Error)
      }
    }))
  }

  // ── Microsoft 365 / Azure AD ─────────────────────────────────
  if (process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET) {
    // Dynamic import for passport-microsoft (CommonJS compat)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Strategy: MicrosoftStrategy } = require('passport-microsoft')
      passport.use(new MicrosoftStrategy({
        clientID:     process.env.MS_CLIENT_ID,
        clientSecret: process.env.MS_CLIENT_SECRET,
        callbackURL:  process.env.MS_CALLBACK || `${process.env.APP_URL}/api/auth/microsoft/callback`,
        scope:        ['user.read','openid','profile','email'],
        tenant:       process.env.MS_TENANT_ID || 'common',
      }, async (_at: string, _rt: string, profile: any, done: Function) => {
        try {
          const email = profile.emails?.[0]?.value || profile._json?.mail
          if (!email) return done(new Error('E-mail não disponível'))

          let user = await prisma.user.findUnique({ where: { email } })
          if (!user) {
            user = await prisma.user.create({
              data: {
                name:  profile.displayName || email.split('@')[0],
                email,
                sso:   'ms365',
                ssoId: profile.id,
                role:  'user',
              }
            })
          }

          if (!user.active) return done(null, false)
          await prisma.auditLog.create({
            data: { userId: user.id, action: 'login', detail: 'Login via Microsoft 365' }
          })
          done(null, user)
        } catch (err) {
          done(err)
        }
      }))
    } catch (e) {
      console.warn('passport-microsoft não instalado — SSO Microsoft desabilitado')
    }
  }
}
