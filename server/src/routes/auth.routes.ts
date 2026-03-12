import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase.js'
import { authLimiter } from '../middleware/rate-limiter.middleware.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const authRoutes = Router()

authRoutes.post('/signup', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password, display_name } = req.body

  if (!email || !password || !display_name) {
    res.status(400).json({ message: 'Email, senha e nome sao obrigatorios' })
    return
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name },
  })

  if (error) {
    res.status(400).json({ message: error.message })
    return
  }

  // Sign in to get session
  const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    res.status(400).json({ message: signInError.message })
    return
  }

  res.status(201).json({
    data: {
      user: data.user,
      session: session.session,
    },
  })
})

authRoutes.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ message: 'Email e senha sao obrigatorios' })
    return
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    res.status(401).json({ message: 'Email ou senha incorretos' })
    return
  }

  res.json({ data })
})

authRoutes.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const token = req.accessToken!
  await supabaseAdmin.auth.admin.signOut(token)
  res.json({ message: 'Logout realizado com sucesso' })
})

authRoutes.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.userId!)
    .single()

  if (error || !profile) {
    res.status(404).json({ message: 'Perfil nao encontrado' })
    return
  }

  res.json({ data: profile })
})
