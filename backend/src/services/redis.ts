// services/redis.ts
import Redis from 'ioredis'
import { logger } from './logger'

export let redis: Redis

export async function connectRedis() {
  redis = new Redis({
    host:     process.env.REDIS_HOST || 'localhost',
    port:     parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  })
  redis.on('connect', () => logger.info('Redis conectado'))
  redis.on('error',   (err) => logger.error('Redis erro', { err }))
  return redis
}

export async function getCache<T>(key: string): Promise<T | null> {
  const val = await redis?.get(key)
  return val ? JSON.parse(val) : null
}

export async function setCache(key: string, value: any, ttlSeconds = 60) {
  await redis?.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

export async function delCache(key: string) {
  await redis?.del(key)
}
