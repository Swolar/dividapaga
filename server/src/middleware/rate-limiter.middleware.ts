import rateLimit from 'express-rate-limit'

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: 'Muitas requisicoes. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Muitas tentativas de login. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Muitos uploads. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const inviteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Muitas tentativas. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})
