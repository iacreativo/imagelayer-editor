import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import editRoutes from './routes/edit.js'
import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api', editRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
