import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import db from '../db.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

interface User {
  id: string
  email: string
  password_hash: string
  created_at: string
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' })
      return
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' })
      return
    }

    const password_hash = await bcrypt.hash(password, 10)
    const id = crypto.randomUUID()

    db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, email, password_hash)

    const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.json({
      user: { id, email },
      token
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.json({
      user: { id: user.id, email: user.email },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' })
      return
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }

    const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(decoded.userId) as { id: string; email: string; created_at: string } | undefined
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    res.json({ user })
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
