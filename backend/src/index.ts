import express from 'express'
import cors from 'cors'
import multer from 'multer'
import axios from 'axios'
import path from 'path'
import { fileURLToPath } from 'url'
import editRoutes from './routes/edit.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api', editRoutes)

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})
const upload = multer({ storage })

interface ImageLayer {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
}

const images: ImageLayer[] = [
  {
    id: '1',
    src: 'https://picsum.photos/400/300',
    x: 50,
    y: 50,
    width: 400,
    height: 300
  },
  {
    id: '2',
    src: 'https://picsum.photos/300/200',
    x: 200,
    y: 150,
    width: 300,
    height: 200
  }
]

app.get('/api/images', (req, res) => {
  res.json(images)
})

app.get('/api/images/:id', (req, res) => {
  const image = images.find(img => img.id === req.params.id)
  if (!image) return res.status(404).json({ error: 'Not found' })
  res.json(image)
})

app.post('/api/images', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const newImage: ImageLayer = {
    id: String(Date.now()),
    src: `/uploads/${req.file.filename}`,
    x: 0,
    y: 0,
    width: 300,
    height: 200
  }
  images.push(newImage)
  res.json(newImage)
})

app.put('/api/images/:id', (req, res) => {
  const image = images.find(img => img.id === req.params.id)
  if (!image) return res.status(404).json({ error: 'Not found' })
  Object.assign(image, req.body)
  res.json(image)
})

app.delete('/api/images/:id', (req, res) => {
  const index = images.findIndex(img => img.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Not found' })
  images.splice(index, 1)
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
