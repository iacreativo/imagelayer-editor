import { Router, Request, Response } from 'express'
import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../.env') })

const router = Router()

interface EditRequestBody {
  imageBase64: string
  prompt: string
  maskBase64?: string
}

interface EditResponseBody {
  resultImageBase64: string
  provider: string
  cost: number
}

interface RunningHubTaskResponse {
  code: number
  msg: string
  data?: {
    taskId: string
  }
}

interface RunningHubStatusResponse {
  code: number
  msg: string
  data?: {
    status: 'pending' | 'running' | 'success' | 'failed'
    output?: {
      image?: string
    }
  }
}

const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || ''
const RUNNINGHUB_BASE_URL = process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.ai'
const RUNNINGHUB_ENDPOINT = process.env.RUNNINGHUB_ENDPOINT || '/rhart-image-n-pro/edit'
const RUNNINGHUB_WORKFLOW_ID = process.env.RUNNINGHUB_WORKFLOW_ID || ''

const MAX_POLL_ATTEMPTS = 30
const POLL_INTERVAL_MS = 2000

const createTask = async (imageBase64: string, prompt: string, maskBase64?: string): Promise<string> => {
  const url = `${RUNNINGHUB_BASE_URL}/task/openapi/create`
  
  const params = {
    workflowId: RUNNINGHUB_WORKFLOW_ID,
    apiKey: RUNNINGHUB_API_KEY,
    prompt: prompt,
    input_image: imageBase64,
    ...(maskBase64 && { mask_image: maskBase64 })
  }

  const response = await axios.post<RunningHubTaskResponse>(url, params, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })

  if (response.data.code !== 0) {
    throw new Error(`RunningHub API error: ${response.data.msg}`)
  }

  if (!response.data.data?.taskId) {
    throw new Error('No taskId returned from RunningHub API')
  }

  return response.data.data.taskId
}

const pollTaskStatus = async (taskId: string): Promise<string> => {
  const url = `${RUNNINGHUB_BASE_URL}/task/openapi/outputs`
  
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await axios.get<RunningHubStatusResponse>(url, {
      params: {
        taskId: taskId,
        apiKey: RUNNINGHUB_API_KEY
      },
      timeout: 10000
    })

    if (response.data.code !== 0) {
      throw new Error(`RunningHub status error: ${response.data.msg}`)
    }

    const status = response.data.data?.status

    if (status === 'success') {
      const outputImage = response.data.data?.output?.image
      if (!outputImage) {
        throw new Error('No image in successful response')
      }
      return outputImage
    }

    if (status === 'failed') {
      throw new Error('Task failed on RunningHub')
    }

    if (status !== 'pending' && status !== 'running') {
      throw new Error(`Unknown task status: ${status}`)
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error('Task polling timeout')
}

router.post('/edit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, prompt, maskBase64 } = req.body as EditRequestBody

    if (!imageBase64 || !prompt) {
      res.status(400).json({ 
        error: 'Missing required fields: imageBase64 and prompt are required' 
      })
      return
    }

    const cleanImageBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const cleanMaskBase64 = maskBase64?.replace(/^data:image\/\w+;base64,/, '')

    const taskId = await createTask(cleanImageBase64, prompt, cleanMaskBase64)
    
    const resultImageBase64 = await pollTaskStatus(taskId)

    const response: EditResponseBody = {
      resultImageBase64: `data:image/png;base64,${resultImageBase64}`,
      provider: 'runninghub',
      cost: 0
    }

    res.json(response)
  } catch (error) {
    console.error('Edit error:', error)
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        res.status(502).json({ 
          error: 'External API error',
          details: error.response.data
        })
        return
      }
      if (error.code === 'ECONNABORTED') {
        res.status(504).json({ error: 'Request timeout' })
        return
      }
    }

    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

export default router
