import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import db from '../db.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'

interface Project {
  id: string
  user_id: string
  name: string
  thumbnail: string | null
  data: string
  created_at: string
  updated_at: string
}

interface ProjectData {
  layers: any[]
  graphics: any[]
  history: any[]
  canvasSettings: {
    width: number
    height: number
    zoom: number
    position: { x: number; y: number }
  }
}

const getUserIdFromToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded.userId
  } catch {
    return null
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const userId = getUserIdFromToken(req)
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const projects = db.prepare(`
      SELECT id, name, thumbnail, created_at, updated_at 
      FROM projects 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `).all(userId) as Project[]

    res.json({ projects })
  } catch (error) {
    console.error('Get projects error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const userId = getUserIdFromToken(req)
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { name, data, thumbnail } = req.body

    if (!name) {
      res.status(400).json({ error: 'Project name is required' })
      return
    }

    const id = crypto.randomUUID()
    const projectData: ProjectData = data || {
      layers: [],
      graphics: [],
      history: [],
      canvasSettings: { width: 800, height: 600, zoom: 1, position: { x: 0, y: 0 } }
    }

    db.prepare(`
      INSERT INTO projects (id, user_id, name, thumbnail, data) 
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, name, thumbnail || null, JSON.stringify(projectData))

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project

    res.json({ project })
  } catch (error) {
    console.error('Create project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const userId = getUserIdFromToken(req)
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const project = db.prepare(`
      SELECT * FROM projects WHERE id = ? AND user_id = ?
    `).get(req.params.id, userId) as Project | undefined

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    res.json({ project: { ...project, data: JSON.parse(project.data) } })
  } catch (error) {
    console.error('Get project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const userId = getUserIdFromToken(req)
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { name, data, thumbnail } = req.body
    const projectId = req.params.id

    const existing = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as { id: string } | undefined
    if (!existing) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const params: any[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      params.push(name)
    }
    if (data !== undefined) {
      updates.push('data = ?')
      params.push(JSON.stringify(data))
    }
    if (thumbnail !== undefined) {
      updates.push('thumbnail = ?')
      params.push(thumbnail)
    }

    params.push(projectId, userId)

    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params)

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project

    res.json({ project })
  } catch (error) {
    console.error('Update project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const userId = getUserIdFromToken(req)
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const result = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, userId)

    if (result.changes === 0) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
